"""
TermWise AI - AI Negotiation Agent (Stage 5)

This module implements an AI-powered negotiation agent. It uses the deterministic
results of previous stages (buyer history, cash forecasting, payment term optimization)
to formulate a negotiation strategy, draft professional buyer-facing messages,
analyze buyer responses, and suggest the next negotiation steps.

It enforces human-in-the-loop validation and prevents the LLM from making or
inventing financial commitments.
"""

import json
import os
import re
import sys
from datetime import datetime

# Add backend directory to sys.path so we can import modules correctly
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.append(SCRIPT_DIR)

from payment_analysis import load_invoices, group_by_buyer, parse_date
from cash_flow_forecast import (
    analyze_and_forecast,
    detect_cash_flow_gaps,
    DEFAULT_EVALUATION_DATE,
    UPCOMING_EXPENSES_DEFAULT
)
from payment_term_optimizer import optimize_payment_terms

# Enforce import of requests for the real LLM provider
import requests


# --- Environment Configuration Parser ---
def load_env_file(filepath=None):
    """
    Manually load environment variables from .env file to avoid external library dependencies.
    """
    if filepath is None:
        filepath = os.path.join(os.path.dirname(SCRIPT_DIR), ".env")
    
    if os.path.exists(filepath):
        with open(filepath) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        value = parts[1].strip().strip('"').strip("'")
                        os.environ[key] = value


# Run parser to load variables from project root .env
load_env_file()


# --- LLM Provider Abstract Interface ---
class LLMProvider:
    def generate_response(self, prompt, system_instruction=""):
        """
        Generate text response from LLM given prompt and instructions.
        """
        raise NotImplementedError


# --- Mock LLM Provider (Deterministic & Cost-Free) ---
class MockLLMProvider(LLMProvider):
    def generate_response(self, prompt, system_instruction=""):
        # Strategy Generation Mock
        if "negotiation strategy" in prompt.lower() or "strategy" in system_instruction.lower():
            # Parse target, fallback, max acceptable terms from prompt to return accurate values
            target = self._extract_value(prompt, "target term", "60")
            fallback = self._extract_value(prompt, "fallback term", "75")
            boundary = self._extract_value(prompt, "maximum acceptable", "90")
            buyer = self._extract_buyer_name(prompt)
            median = self._extract_value(prompt, "historical median", "62")

            strategy = {
                "PRIMARY_ASK": f"{target} days",
                "FALLBACK": f"{fallback} days",
                "BOUNDARY": f"{boundary} days",
                "ALTERNATIVE_PROPOSAL": "Consider a partial advance payment (e.g. 30% upfront) if terms under fallback are rejected.",
                "REASON": f"Buyer historically pays around {median} days. Aligning with this behavior provides cash-flow predictability.",
                "TONE": "Professional, polite, collaborative, and evidence-supported.",
                "NEXT_STEP": "Draft and send the initial discussional email focusing on the target term."
            }
            return f"[MOCK MODE] STRATEGY:\n{json.dumps(strategy, indent=2)}"

        # Message Drafting Mock
        if "discussional email" in prompt.lower() or "message" in prompt.lower() or "message" in system_instruction.lower() or "communication writer" in system_instruction.lower() or "discussion email" in system_instruction.lower():
            target = self._extract_value(prompt, "target term", "60")
            invoice_id = self._extract_value(prompt, "invoice id", "INV-1033")
            buyer = self._extract_buyer_name(prompt)

            message = (
                f"Subject: Payment Terms Discussion - {invoice_id}\n\n"
                f"Hello Team {buyer},\n\n"
                f"We appreciate our ongoing business partnership and the operational collaboration between our teams.\n\n"
                f"For invoice {invoice_id}, we would like to request discussing a payment term of {target} days. "
                f"Given the planning and operating requirements for this delivery, this timing helps us maintain a "
                f"predictable delivery cycle.\n\n"
                f"If {target} days is not feasible under your current processes, we would be happy to discuss "
                f"alternative split payment or advance arrangements.\n\n"
                f"Best regards,\n"
                f"SME Operations Team"
            )
            return f"[MOCK MODE] MESSAGE:\n{message}"

        # Buyer Response Analysis Mock
        if "buyer response" in prompt.lower() or "analyze" in system_instruction.lower():
            # Check for numbers in response text to find counteroffers
            buyer_msg = self._extract_value(prompt, "response text", "")
            detected_term = self._detect_days(buyer_msg)
            
            # Simple keyword matching for category
            category = "UNCLEAR"
            if detected_term is not None:
                category = "COUNTEROFFER"
            if any(kw in buyer_msg.lower() for kw in ["accept", "agree", "perfect", "confirm"]):
                category = "ACCEPTED"
            if any(kw in buyer_msg.lower() for kw in ["cannot change", "impossible", "no"]):
                category = "REJECTED"
            if "?" in buyer_msg or "why" in buyer_msg.lower() or "more info" in buyer_msg.lower():
                category = "REQUEST_FOR_INFORMATION"

            analysis = {
                "category": category,
                "detected_term_days": detected_term,
                "reasoning": f"Classified response as {category} based on keywords and detected numeric terms."
            }
            return f"[MOCK MODE] ANALYSIS:\n{json.dumps(analysis, indent=2)}"

        return "[MOCK MODE] Default Mock LLM Response."

    def _extract_value(self, text, keyword, default):
        for line in text.split("\n"):
            line_lower = line.lower().strip()
            if "evidence" in line_lower or "tradeoff" in line_lower:
                continue
            if keyword.lower() in line_lower:
                parts = line.split(":")
                if len(parts) > 1:
                    val = parts[1].strip()
                    val = re.sub(r"\s*days?", "", val, flags=re.IGNORECASE)
                    if val:
                        return val
                # Extract digits
                nums = re.findall(r"\d+", line)
                if nums:
                    return nums[0]
        return default

    def _extract_buyer_name(self, text):
        for line in text.split("\n"):
            if "buyer" in line.lower() or "company" in line.lower():
                parts = line.split(":")
                if len(parts) > 1:
                    return parts[1].strip()
        return "ABC Industries"

    def _detect_days(self, text):
        nums = re.findall(r"\b\d+\b", text)
        if nums:
            return int(nums[0])
        return None


# --- Real Gemini LLM Provider ---
class GeminiLLMProvider(LLMProvider):
    def __init__(self, api_key, model="gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model
        self.endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

    def generate_response(self, prompt, system_instruction=""):
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [
                    {"text": system_instruction}
                ]
            }

        try:
            resp = requests.post(self.endpoint, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                # Parse text response from Gemini contents schema
                return data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                return f"[Error calling Gemini API: {resp.status_code}] {resp.text}"
        except Exception as e:
            return f"[Error connecting to Gemini: {str(e)}]"


# --- Factory Provider Instantiator ---
def get_llm_provider():
    """
    Read environment configurations to spawn either Mock or Gemini provider.
    """
    mock_flag = os.environ.get("MOCK_LLM", "true").lower() == "true"
    api_key = os.environ.get("LLM_API_KEY", "")
    model = os.environ.get("LLM_MODEL", "gemini-1.5-flash")

    if mock_flag or not api_key:
        return MockLLMProvider()
    return GeminiLLMProvider(api_key, model)


# --- Context Packager ---
def compile_negotiation_context(invoice, invoices, expenses=UPCOMING_EXPENSES_DEFAULT, today=DEFAULT_EVALUATION_DATE):
    """
    Collect all verified parameters from optimization and forecasting modules.
    """
    optimizer_results = optimize_payment_terms(invoice, invoices, expenses, today)

    # Re-run forecasting to supply correct contextual metrics
    from cash_flow_forecast import analyze_and_forecast
    unpaid, buyer_stats = analyze_and_forecast(invoices, today)
    stats = buyer_stats[invoice["buyer_name"]]

    return {
        "buyer_name": invoice["buyer_name"],
        "invoice_id": invoice["invoice_id"],
        "invoice_amount": invoice["invoice_amount"],
        "current_payment_term": invoice["agreed_payment_days"],
        "historical_median_payment": stats["median_payment_days"],
        "historical_avg_payment": stats["avg_payment_days"],
        "late_payment_rate": stats["late_payment_rate"],
        "avg_delay": stats["avg_delay"],
        "target_term": optimizer_results["target_term_days"],
        "fallback_term": optimizer_results["fallback_term_days"],
        "max_acceptable_term": optimizer_results["maximum_acceptable_term_days"],
        "confidence": optimizer_results["confidence"],
        "confidence_reason": optimizer_results["confidence_reason"],
        "evidence": optimizer_results["evidence"],
        "tradeoff": optimizer_results["tradeoff_explanation"]
    }


# --- Strategy Generation ---
def generate_negotiation_strategy(provider, context):
    """
    Ask the LLM to structure a negotiation plan using grounded context.
    """
    system_instr = (
        "You are TermWise AI, an expert operating planning and cash-flow discussion strategist for small businesses. "
        "Create a structured negotiation strategy based ONLY on the verified data facts provided. "
        "Strictly adhere to the target, fallback, and boundary terms given. Do NOT invent or alter these limits."
    )

    prompt = (
        f"Grounded Context Info:\n"
        f"  SME Client is negotiating with Buyer: '{context['buyer_name']}'\n"
        f"  Invoice ID: {context['invoice_id']}\n"
        f"  Amount: Rs. {context['invoice_amount']:,.2f}\n"
        f"  Current Agreed Term: {context['current_payment_term']} days\n"
        f"  Historical Median Payment: {context['historical_median_payment']} days\n"
        f"  Late-Payment Rate: {context['late_payment_rate']}%\n"
        f"  Average delay: {context['avg_delay']} days\n"
        f"  Verified Target term: {context['target_term']} days\n"
        f"  Verified Fallback term: {context['fallback_term']} days\n"
        f"  Verified Maximum Acceptable term: {context['max_acceptable_term']} days\n"
        f"  Supporting Evidence: {', '.join(context['evidence'])}\n\n"
        f"Draft a negotiation strategy document outlining:\n"
        f"  - PRIMARY ASK (Target Term)\n"
        f"  - FALLBACK (Fallback Term)\n"
        f"  - BOUNDARY (Maximum Acceptable Term)\n"
        f"  - ALTERNATIVE_PROPOSAL (e.g. split advance)\n"
        f"  - REASON (supported by evidence)\n"
        f"  - TONE\n"
        f"  - NEXT_STEP\n"
    )

    resp = provider.generate_response(prompt, system_instr)
    return resp


# --- Message Generation ---
def generate_negotiation_message(provider, context):
    """
    Generate the buyer-facing message. Ensures internal scores and risk limits are not leaked.
    """
    system_instr = (
        "You are TermWise AI, a professional business communication writer. "
        "Draft a polite, brief, and clear buyer-facing discussion email. "
        "Do NOT mention internal risk parameters, maximum acceptable boundaries, "
        "or SME cash shortages. Ground all claims in operating planning cycles."
    )

    prompt = (
        f"Context Info:\n"
        f"  Buyer name: {context['buyer_name']}\n"
        f"  Invoice ID: {context['invoice_id']}\n"
        f"  Invoice Amount: Rs. {context['invoice_amount']:,.2f}\n"
        f"  Target Payment Term: {context['target_term']} days\n"
        f"  Current Payment Term: {context['current_payment_term']} days\n"
        f"  Evidence details: {context['tradeoff']}\n\n"
        f"Write a professional discussion message requesting {context['target_term']} days payment term. "
        f"Propose discussing split payments/advances as an alternative option if needed. "
        f"Use polite language and sign off as 'SME Operations Team'."
    )

    resp = provider.generate_response(prompt, system_instr)
    return resp


# --- Response Analysis & Recommendations ---
def analyze_buyer_response(provider, state, buyer_message):
    """
    Analyze the buyer's text response using LLM.
    Then, apply Python decision rules to enforce boundaries and recommend next actions.
    """
    system_instr = (
        "Analyze the buyer response text to classify the response category and detect any proposed payment term. "
        "Possible categories: ACCEPTED, COUNTEROFFER, REJECTED, REQUEST_FOR_INFORMATION, DELAYED_RESPONSE, UNCLEAR. "
        "If a specific payment term in days is proposed, detect it. If none is clearly proposed, return null for detected term. "
        "Do NOT invent numbers."
    )

    prompt = (
        f"Buyer Response Text: \"{buyer_message}\"\n"
        f"Internal Negotiation Limits:\n"
        f"  Target term: {state['our_target']} days\n"
        f"  Fallback term: {state['our_fallback']} days\n"
        f"  Maximum acceptable boundary: {state['our_boundary']} days\n\n"
        f"Return a structured JSON format containing:\n"
        f"  - category (string)\n"
        f"  - detected_term_days (int or null)\n"
        f"  - reasoning (string)\n"
    )

    resp = provider.generate_response(prompt, system_instr)

    # In mock mode, resp already contains JSON in mock formatting. Let's parse it safely
    detected_term = None
    category = "UNCLEAR"
    reasoning = "Unable to parse LLM analysis output."

    try:
        # Strip mock labels if present
        cleaned_resp = resp.replace("[MOCK_LLM]", "").replace("[MOCK MODE] ANALYSIS:", "").strip()
        
        # Look for JSON structure using regex in case LLM added markdown wrappers
        match = re.search(r"\{.*\}", cleaned_resp, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            category = data.get("category", "UNCLEAR")
            detected_term = data.get("detected_term_days", None)
            if detected_term is not None:
                detected_term = int(detected_term)
            reasoning = data.get("reasoning", "")
        else:
            # Fallback regex if LLM returned text instead of JSON
            term_match = re.search(r"detected_term_days[^\d]*(\d+)", cleaned_resp, re.IGNORECASE)
            if term_match:
                detected_term = int(term_match.group(1))
            cat_match = re.search(r"category[^\w]*(\w+)", cleaned_resp, re.IGNORECASE)
            if cat_match:
                category = cat_match.group(1).upper()
            reasoning = cleaned_resp
    except Exception as e:
        reasoning = f"Analysis error: {str(e)}. Original response: {resp}"

    # --- PYTHON DECISION RULES (GUARDRAILS) ---
    target = state["our_target"]
    fallback = state["our_fallback"]
    boundary = state["our_boundary"]

    status = "NEEDS_COUNTER"
    rec_action = "SEND_COUNTEROFFER"

    if category == "ACCEPTED":
        status = "AGREED"
        rec_action = "ACCEPT"
    elif category == "REJECTED":
        status = "ESCALATE"
        rec_action = "ESCALATE_TO_HUMAN"
    elif detected_term is not None:
        if detected_term <= target:
            status = "ACCEPTABLE"
            rec_action = "ACCEPT"
        elif detected_term <= fallback:
            status = "ACCEPTABLE_WITH_TRADEOFF"
            rec_action = "ACCEPT"
        elif detected_term <= boundary:
            status = "COUNTER_OR_CONSIDER"
            rec_action = "REQUEST_PARTIAL_ADVANCE"
        else:
            status = "BOUNDARY_EXCEEDED"
            rec_action = "ESCALATE_TO_HUMAN"
    else:
        # No term detected or unclear response
        if category == "REQUEST_FOR_INFORMATION":
            status = "NEEDS_COUNTER"
            rec_action = "REQUEST_INFORMATION"
        else:
            status = "NEEDS_COUNTER"
            rec_action = "FOLLOW_UP"

    # Enforce priority action structure
    rec_action_details = recommend_next_action(detected_term, target, fallback, boundary, category, rec_action)

    return {
        "category": category,
        "detected_term_days": detected_term,
        "negotiation_status": status,
        "recommended_action": rec_action,
        "action_details": rec_action_details,
        "reasoning": reasoning
    }


def recommend_next_action(detected_term, target, fallback, boundary, category, rec_action):
    """
    Format detailed next step recommendations.
    """
    reasons = {
        "ACCEPT": "Proposed terms fit within our safe operational boundaries.",
        "SEND_COUNTEROFFER": "Proposed term is longer than target terms but has room to negotiate.",
        "REQUEST_PARTIAL_ADVANCE": "Proposed term is near boundary limits. Recommend mitigating risk with advance payments.",
        "REQUEST_INFORMATION": "Clarify proposed payment terms and details.",
        "FOLLOW_UP": "Follow up with buyer to request explicit payment terms.",
        "ESCALATE_TO_HUMAN": "Negotiation limits exceeded or buyer rejected terms."
    }

    reason = reasons.get(rec_action, "Review negotiation details.")
    evidence = (
        f"Target: {target}d, Fallback: {fallback}d, Max Limit: {boundary}d. "
        f"Proposed: {detected_term if detected_term is not None else 'None'}d (Classified: {category})."
    )
    
    risk = "LOW"
    if rec_action == "ESCALATE_TO_HUMAN":
        risk = "HIGH"
    elif rec_action in ("REQUEST_PARTIAL_ADVANCE", "SEND_COUNTEROFFER"):
        risk = "MEDIUM"

    return {
        "action": rec_action,
        "reason": reason,
        "evidence": evidence,
        "risk": risk,
        "review_instructions": "Review proposed message/counter and update approval status before sending."
    }


# --- History Logger ---
class NegotiationSession:
    def __init__(self, invoice_id, target, fallback, boundary):
        self.invoice_id = invoice_id
        self.state = {
            "round": 1,
            "our_target": target,
            "our_fallback": fallback,
            "our_boundary": boundary,
            "buyer_latest_offer": None,
            "status": "INITIAL",
            "history": []
        }

    def add_history_entry(self, sender, message, detected_term=None, action=None, approval_status="PENDING"):
        """
        Record a negotiation turn.
        """
        entry = {
            "round": self.state["round"],
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "sender": sender,
            "message": message,
            "detected_term": detected_term,
            "action": action,
            "approval_status": approval_status
        }
        self.state["history"].append(entry)

    def advance_round(self):
        self.state["round"] += 1

    def update_status(self, status, latest_offer=None):
        self.state["status"] = status
        if latest_offer is not None:
            self.state["buyer_latest_offer"] = latest_offer


# --- Command-line Demo ---
def main():
    csv_path = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "sample_invoices.csv"))
    if not os.path.exists(csv_path):
        print(f"Error: Sample data not found at {csv_path}")
        return

    invoices = load_invoices(csv_path)
    today = DEFAULT_EVALUATION_DATE

    # Target outstanding invoice: ABC Industries INV-1033
    target_invoice_id = "INV-1033"
    target_invoice = next((inv for inv in invoices if inv["invoice_id"] == target_invoice_id), None)

    if not target_invoice:
        print(f"Error: Invoice {target_invoice_id} not found.")
        return

    # 1. Compile context
    context = compile_negotiation_context(target_invoice, invoices, UPCOMING_EXPENSES_DEFAULT, today)

    # 2. Spawn Provider
    provider = get_llm_provider()
    is_mock = isinstance(provider, MockLLMProvider)

    # 3. Initialize Negotiation Session
    session = NegotiationSession(
        target_invoice_id,
        context["target_term"],
        context["fallback_term"],
        context["max_acceptable_term"]
    )

    print("=" * 55)
    print(" TERM WISE NEGOTIATION AGENT (STAGE 5)")
    if is_mock:
        print(" [RUNNING IN MOCK LLM MODE]")
    print("=" * 55)
    print(f"Buyer:                 {context['buyer_name']}")
    print(f"Invoice ID:            {context['invoice_id']}")
    print(f"Invoice Amount:        Rs. {context['invoice_amount']:,.2f}")
    print(f"Current Agreed Term:   {context['current_payment_term']} days")
    print(f"Historical Median:     {context['historical_median_payment']} days")
    print(f"Recommended Target:    {context['target_term']} days")
    print(f"Fallback:              {context['fallback_term']} days")
    print(f"Maximum Acceptable:    {context['max_acceptable_term']} days (Modeled)")
    print(f"Confidence Level:      {context['confidence']}")
    print("-" * 55)

    # 4. Generate Strategy
    print("\nNEGOTIATION STRATEGY\n")
    strategy_doc = generate_negotiation_strategy(provider, context)
    print(strategy_doc)
    print("-" * 55)

    # 5. Generate message
    print("\nAI-GENERATED MESSAGE (DRAFT)\n")
    message_draft = generate_negotiation_message(provider, context)
    print(message_draft)
    
    # Log initial draft in history (pending approval)
    session.add_history_entry("SME", message_draft, action="SEND_INITIAL_PROPOSAL", approval_status="PENDING")
    print("\n(Status logged: Round 1 Draft - PENDING HUMAN APPROVAL)")
    print("-" * 55)

    # 6. Simulate buyer response
    simulated_buyer_msg = "We can only offer 90 days."
    print(f"\nSIMULATED BUYER RESPONSE:\n\"{simulated_buyer_msg}\"")
    print("-" * 55)

    # 7. Analyze response
    print("\nRESPONSE ANALYSIS\n")
    session.advance_round()
    analysis_results = analyze_buyer_response(provider, session.state, simulated_buyer_msg)
    
    session.update_status(analysis_results["negotiation_status"], analysis_results["detected_term_days"])
    session.add_history_entry("Buyer", simulated_buyer_msg, detected_term=analysis_results["detected_term_days"])

    print(f"Category:            {analysis_results['category']}")
    print(f"Detected Term:       {analysis_results['detected_term_days']} days")
    print(f"Internal Boundary:   {session.state['our_boundary']} days")
    print(f"Negotiation Status:  {analysis_results['negotiation_status']}")
    print(f"Recommended Action:  {analysis_results['recommended_action']}")
    print(f"Action Risk Level:   {analysis_results['action_details']['risk']}")
    print(f"Rationale:           {analysis_results['action_details']['reason']}")
    print(f"Evidence Grounding:  {analysis_results['action_details']['evidence']}")
    print(f"Instructions:        {analysis_results['action_details']['review_instructions']}")
    print("=" * 55)
    print("Disclaimer: TermWise is a decision-support system. It does not guarantee")
    print("payment outcomes and does not make binding financial commitments autonomously.")
    print("=" * 55)


if __name__ == "__main__":
    main()

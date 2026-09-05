# TermWise AI — Judge & Evaluator Q&A Reference Guide

> **Tagline:** *"From uncertain receivables to predictable cash flow."*  
> **Core Concept:** An AI-powered financial decision-intelligence platform for SMEs that predicts payment behavior, identifies high-risk receivables, optimizes contractual payment terms, and prepares human-governed negotiations.

---

### 1. What problem are we solving?
**Problem:** Small and medium-sized enterprises (SMEs) face chronic cash-flow instability due to delayed, unpredictable customer payments and mismatched contractual net terms (e.g., agreed 90 days vs. actual 62 days or 70 days). Traditional bookkeeping only records what happened in the past without predicting upcoming liquidity shortages or suggesting proactive contract adjustments.

---

### 2. Who benefits?
* **SME Business Owners & CEOs:** Gain forward-looking cash visibility and prevent liquidity crunches before payroll and critical supplier deadlines.
* **Credit & Accounts Receivable Managers:** Receive prioritized action queues explaining *why* an invoice is risky, backed by empirical buyer data.
* **Finance Teams:** Streamline collaborative, professional buyer negotiations without damaging long-term client relationships.

---

### 3. Why is this different from a generic payment reminder or invoice tracker?
* **Not Just a Reminder:** Generic tools send spammy "Invoice Due Tomorrow" emails without understanding buyer dynamics.
* **Decision Intelligence:** TermWise computes quantile-based behavioral patterns (e.g., median speed, delay standard deviation), evaluates cash-flow gap consequences against upcoming operational liabilities, and computes mathematically safe negotiation bounds (Target, Fallback, Maximum Acceptable).
* **Closed-Loop Calibration:** Every actual payment outcome updates the buyer profile to refine future predictions.

---

### 4. How does AI help vs. Traditional Software?
* **Deterministic Calculation Layer:** All financial numbers (cash gap amount, due dates, risk scores, percentiles) are strictly computed via transparent, verified arithmetic and statistical algorithms.
* **Generative & NLP Layer:** Google Gemini 1.5 Flash (with offline deterministic fallback) is used strictly for **communication orchestration**—synthesizing complex context into collaborative negotiation strategies, drafting professional buyer-facing messages, and classifying incoming buyer counteroffers against established boundaries.

---

### 5. How are financial calculations performed?
* **Payment Behavior:** Mean payment days, median days, 25th percentile ($P_{25}$), 75th percentile ($P_{75}$), and late-payment rates (with a 5-day grace window).
* **Cash-Flow Forecasting:** Tri-scenario timeline model (*Optimistic*, *Base*, *Pessimistic*) evaluated against chronological expense schedules.
* **Priority Ranking:** Multi-factor weighted score:
  $$\text{Priority} = (0.40 \times \text{Risk Score}) + (0.40 \times \text{Cash Impact Score}) + (0.20 \times \text{Opportunity Score})$$
* **Term Optimization:** Target term is bound to the buyer's 25th percentile speed and SME cash-gap tolerance; Fallback term is anchored to median historical speed; Maximum Acceptable term enforces strict liquidity buffer limits.

---

### 6. How do we prevent AI hallucinations and financial errors?
* **Zero Financial Math in LLM:** The LLM is prohibited from calculating cash numbers or changing contract values in the database.
* **Context Isolation:** The prompt only receives pre-calculated, verified variables from the deterministic engines.
* **Strict Boundary Enforcement:** Counteroffers are validated programmatically against maximum tolerable term thresholds before any recommendation is surfaced.

---

### 7. How do we handle insufficient buyer data?
* If a buyer has fewer than 3 historical invoices, TermWise sets the Confidence Level to **LOW**, defaults recommendations to the current agreed contract term, and explicitly displays an explainability notice stating that baseline data is insufficient for aggressive optimization.

---

### 8. Why is Human-in-the-Loop (HITL) approval required?
* Financial contracts and customer relationships require human governance.
* The AI serves strictly as a **decision-support copilot**. It drafts recommendations, but a human credit manager must explicitly review, edit, approve, or reject any message or settlement term before it is dispatched or recorded.

---

### 9. How does Razorpay fit into the architecture?
* **Dual-Source Ingestion:** TermWise connects directly to Razorpay API v1 to fetch live transaction settlements and reconciles partial/full payments against invoice ledger records.
* **Webhook Processing:** Ingests `payment.captured` and `payment.failed` webhooks using official HMAC-SHA256 signature verification.
* **Demo Isolation:** When live credentials are not present, TermWise runs in **Demo Mode**, utilizing synthetic business profiles without making external network calls.

---

### 10. What is currently simulated vs. fully implemented?
* **Fully Functional:** Complete FastAPI backend, SQLite/SQLAlchemy schema, deterministic calculation engines, priority queue, explainability engine, interactive simulation classifier, outcome recording, Razorpay live API client & HMAC webhook verifier.
* **Simulated for Presentation:** The buyer's email reply and settlement receipt are simulated interactively in the UI so evaluators can test the end-to-end workflow on demand without waiting days for real-world bank transfers.

---

### 11. What would be required for production deployment?
1. Direct OAuth integrations with accounting ERPs (Tally, QuickBooks, Zoho Books).
2. Automated multi-channel notification dispatch (SendGrid for email, Twilio for WhatsApp/SMS).
3. Enterprise SSO and role-based access control (RBAC).
4. PostgreSQL cluster deployment with Redis caching for real-time liquidity streaming.

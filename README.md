# TermWise AI

## What is TermWise AI?

TermWise AI is an AI-powered cash-flow intelligence and payment-term
negotiation platform for small and medium-sized businesses (SMEs).

Small businesses often have to wait a long time — 60, 90, or more days —
to get paid by the large companies they sell to. This creates cash-flow
stress: the SME still has to pay its own staff, suppliers, and rent right
away, even while its own money is stuck waiting to arrive.

## The Problem It Solves

Most SMEs have no easy way to know:
- Which of their buyers usually pay late, and by how much
- What payment terms are realistic to ask for
- Whether they can afford to wait, or need to push for faster payment
- Which overdue invoices need attention first

Without this information, SMEs just accept whatever payment terms a
buyer offers, even when the buyer's own history shows they could
realistically pay sooner.

## What the Future System Will Do

Once fully built, TermWise AI will:
- Predict when a buyer is likely to actually pay (not just the agreed date)
- Detect which invoices are at risk of being paid late
- Forecast cash-flow gaps before they happen
- Prioritize which buyers/invoices need attention first
- Recommend realistic payment terms to ask for, backed by data
- Help draft a negotiation message grounded in the buyer's real numbers
- Track what was negotiated and what actually happened

## What This Prototype Currently Does (Step 1 of 1)

This first version does **only one thing**: turn raw invoice history into
clear, explainable buyer payment intelligence. No AI, no machine learning,
and no predictions yet — just transparent math, so the foundation is
correct before anything smarter is built on top of it.

Specifically, `backend/payment_analysis.py`:
1. Reads invoice records from `data/sample_invoices.csv`
2. For each buyer, calculates:
   - Average actual payment time (in days)
   - Average payment delay vs. the agreed due date
   - Late-payment rate (% of invoices paid more than 5 days late)
   - Count of currently overdue and outstanding invoices
3. Assigns a simple, rule-based risk level: **LOW**, **MEDIUM**, or **HIGH**
4. Prints a clean report, riskiest buyers first

The risk levels are based on plain thresholds (explained in the code
comments), not a model — so every number in the report can be traced
back to a simple, checkable rule.

## About the Dataset

`data/sample_invoices.csv` is a **synthetic dataset created only for
development and testing**. It is not real invoice or company data. It
contains 32 invoice records across 6 fictional buyers, deliberately
designed with different payment behaviors:
- **Reliable payers** (pay close to on time): ABC Industries, Skyline Textiles
- **Moderately late payers**: Global Traders, Bright Future Corp
- **Frequently late payers**: XYZ Manufacturing, NorthStar Retail
- Includes a mix of **Paid**, **Overdue**, and **Outstanding (not yet due)** invoices

## Project Structure

```
termwise-ai/
├── README.md
├── data/
│   └── sample_invoices.csv
└── backend/
    └── payment_analysis.py
```

## How to Run

```bash
cd termwise-ai/backend
python3 payment_analysis.py
```

No extra packages are required — it only uses Python's built-in
`csv`, `datetime`, and `collections` modules.

## Scope of This Task

This prototype intentionally does **not** include: an LLM/AI API,
machine learning, a web app, a database, or authentication. It exists
only to prove that raw invoice data can be reliably converted into
useful buyer payment intelligence, since every later feature (term
recommendations, negotiation drafts, cash-flow forecasts) depends on
this being correct first.

## Stage 3 — Risk & Opportunity Engine

The Risk & Opportunity Engine ranks outstanding invoices in order of priority so small business owners know exactly which outstanding bills need attention first and how to act.

### 1. Why Risk Alone is Not Enough
A buyer might be high risk (meaning they pay very late), but if the invoice amount is very small (e.g. Rs. 5,000), it has little financial impact on the business. Conversely, a low-risk buyer with a very large invoice (e.g. Rs. 5,00,000) that is delayed even by a few days can trigger a major cash crisis. Therefore, prioritizing requires evaluating risk alongside financial impact.

### 2. Difference Between Risk and Priority
*   **Risk**: The probability that an invoice will be paid late, based on buyer payment history and timeline proximity.
*   **Priority**: The business urgency of the invoice. It combines the invoice's risk, its cash-flow impact, and whether there is an opportunity to accelerate the payment.

### 3. How Cash-Flow Impact is Calculated
Cash-flow impact is calculated out of 100 based on:
*   **Amount Weight (60%)**: The proportion of the invoice value relative to total upcoming business expenses (e.g. rent, salaries, suppliers).
*   **Gap Contribution Weight (40%)**: A flag indicating if the invoice is overdue or due before a cash-flow gap, but predicted to arrive after it (directly causing the gap).

### 4. How Opportunities are Identified
Opportunity represents how viable it is to intervene and pull payment forward:
*   **Amount Weight (35%)**: Higher invoice values provide larger cash benefits.
*   **Predictability Weight (25%)**: Buyers with consistent histories (low standard deviation) are easier to negotiate with.
*   **Lateness Weight (20%)**: Buyers that historically delay payments have more room for improvement.
*   **Gap Resolution Weight (20%)**: Invoices whose acceleration directly helps resolve a cash gap.

### 5. How Priority is Calculated
The priority score (0-100) is calculated using a weighted average:
$$\text{Priority} = 0.40 \times \text{Risk Score} + 0.35 \times \text{Cash Impact} + 0.25 \times \text{Opportunity}$$

### 6. Why the System Uses Deterministic Calculations
Deterministic calculations ensure transparency and repeatability. Business owners can inspect exactly how a score was generated (e.g. "Buyer paid late 4 times, leading to score X"), avoiding the black-box nature and unpredictable hallucinations of LLMs or early-stage machine learning heuristics.

### 7. Limitations of the Current Prototype
*   **Static Expenses**: SME business expenses are hardcoded rather than integrated with accounting tools.
*   **Simple Averages**: Calculations assume past behavior repeats without accounting for seasonal trends or buyer corporate health changes.
*   **No Auto-Intervention**: Recommends actions but does not draft templates or auto-remind.

## Stage 4 — Payment-Term Optimizer

The Payment-Term Optimizer recommends the best payment term strategy to negotiate with a buyer by balancing buyer historical behaviors against the SME's cash-flow safety.

### 1. Why Payment Terms Matter
Contractual terms (e.g. Net 30, Net 60) dictate when invoices become due. If terms are too long, the SME's working capital gets trapped, creating cash-flow gaps. Optimizing terms helps SMEs accelerate payments from creditworthy buyers and protect their liquidity.

### 2. Difference Between Target, Fallback, and Maximum Acceptable Term
*   **Target Term**: A realistic, ambitious term that accelerates cash inflow. It is based on the 25th percentile ($p25$) of historical actual payment days. If cash gaps exist, it is reduced to pull cash in before the gap date.
*   **Fallback Term**: A moderate compromise matching the buyer's median actual payment time ($median$). It serves as the primary fallback position.
*   **Modeled Maximum Acceptable Term**: The absolute longest term the SME can tolerate before cash gaps widen. If a gap exists, it is limited by the gap date; otherwise, it is based on the 75th percentile ($p75$) of buyer history plus a 15-day buffer.

### 3. How Scenario Simulation Works
The simulation engine copies the outstanding invoice database and temporarily replaces the target invoice's term with proposed values (e.g., 30, 45, 60, 75, 90 days). It then recomputes all payment dates, risk scores, and cash-flow gap values to output the exact business consequences of each option.

### 4. How Confidence is Calculated
Confidence ratings are based on historical data volume:
*   **HIGH**: $\ge 20$ historical paid invoices.
*   **MEDIUM**: $8 - 19$ historical paid invoices.
*   **LOW**: $< 8$ historical paid invoices.

### 5. Disclaimer: Decision Support vs. Financial Advice
TermWise does **not** make autonomous financial decisions or claim that a payment term is guaranteed. It is a decision-support utility that provides statistical scenario projections, letting the business owner make the final strategic choice.

## Stage 5 — AI Negotiation Agent

The AI Negotiation Agent interprets optimized terms and designs structured discussion strategies, drafts professional communication drafts, and classifies incoming buyer counteroffers using LLMs.

### 1. Why the LLM is Used
LLMs are utilized strictly for language-related capabilities: summarizing structured data into coherent strategy documents, drafting polite emails, and classifying buyer text messages. 

### 2. What the Deterministic Engines Calculate
All numerical limits—Target, Fallback, Max Acceptable terms, historical delays, cash gaps, and risk levels—are calculated by the core Python engines. The LLM is **not** permitted to invent or modify any financial facts.

### 3. Safety Boundaries & Fact Grounding
*   **No Risk Exposure**: Internal metrics (e.g. risk score, max acceptable term, cash shortages) are strictly excluded from drafted buyer messages.
*   **Truth Grounding**: The LLM is forced to rely on contextual observations, preventing it from claiming unverified facts.

### 4. How Negotiation State Works
A state machine tracks the progress of the negotiation:
*   `INITIAL`: Negotiation is configured and has not yet started.
*   `WAITING_FOR_RESPONSE`: SME sent the proposal and is waiting for response.
*   `COUNTEROFFER_RECEIVED`: Buyer sent a counter-proposal.
*   `ACCEPTABLE`: Proposed term falls at or below the target limit.
*   `ACCEPTABLE_WITH_TRADEOFF`: Proposed term falls between target and fallback.
*   `COUNTER_OR_CONSIDER`: Proposed term falls between fallback and maximum.
*   `BOUNDARY_EXCEEDED`: Proposed term exceeds maximum allowed limit (triggers escalation).
*   `AGREED`: Terms accepted.
*   `ESCALATE` / `CLOSED`: Escalated or closed.

### 5. How Buyer Responses are Analyzed
The LLM extracts proposed terms from the buyer's text and classifies the message category (`ACCEPTED`, `COUNTEROFFER`, `REJECTED`, `UNCLEAR`, etc.). Python decision guardrails then evaluate the detected days against boundaries to recommend actions (e.g., `ACCEPT`, `REQUEST_PARTIAL_ADVANCE`, `ESCALATE_TO_HUMAN`).

### 6. Human Approval Process
The agent operates as a decision-support system and does not execute financial transactions autonomously. Drafted messages and proposed actions start with an `approval_status` of `PENDING` and require a human operator to mark them as `APPROVED`, `EDITED`, or `REJECTED`.

### 7. Mock Mode
If `MOCK_LLM=true` (default) or `LLM_API_KEY` is not present, the agent runs in Mock Mode, returning deterministic strategy, message, and analysis text structures for development and testing.

### 8. System Disclaimer
TermWise is a decision-support system. It does not guarantee payment outcomes and does not make binding financial commitments autonomously.

## Stage 6 — Closed-Loop Outcome & Learning Engine

The Closed-Loop Outcome & Learning Engine tracks historical outcomes of negotiations, calculates acceleration metrics, and dynamically updates buyer behavior profiles.

### 1. How the Feedback Loop Works
The core learning loop integrates outcomes into active operations:
```text
Historical Invoice Records (CSV) + Negotiation Outcomes (JSON)
                      ↓
           Merged Invoice Database
                      ↓
          Recalculated Buyer Profiles (Median, Delay, Late Rate)
                      ↓
       Refined Cash Forecasts & Prediction Accuracy
                      ↓
        Optimized Payment Term Ranges
```
This is a **statistical updating** mechanism, NOT machine learning. No neural networks are trained; calculations are recalculated dynamically from the combined data.

### 2. TermWise Outcome Score Formula
A transparent business-rule score from 0 to 100 measuring outcome quality:
*   **Negotiation Success (30%)**:
    - `30 points` if status is `AGREED`.
    - `15 points` if status is `ONGOING`, `CLOSED`, or `ESCALATED`.
    - `0 points` if status is `REJECTED`.
*   **Payment Term Improvement (30%)**:
    - `1 point per day` improved (original agreed term minus negotiated term), up to `30 points`.
*   **Actual Payment Timing (20%)**:
    - `20 points` if paid early or exactly on predicted days.
    - Minus `1 point per day` late relative to prediction, down to `0 points`.
*   **Cash-Flow Gap Reduction (20%)**:
    - `20 points` if cash-flow gap was reduced or maintained at zero.
    - `0 points` if cash gap remained unchanged or widened.

### 3. Prediction Accuracy Calculations
To measure the reliability of the forecasting model, we calculate:
*   **Mean Absolute Prediction Error (MAPE)**: The average absolute difference in days between predicted and actual payment days.
*   **Average Prediction Error**: The average difference (indicating positive/negative prediction bias).
*   **Bucketed Accuracy**: The percentage of invoice payments arriving within 3, 7, and 14 days of predictions.

### 4. Grounding and Integrity
*   **No Inventions**: TermWise does not claim that a negotiation caused a financial improvement unless the improvement can be measured from the available data.
*   **Preserved History**: Historical CSV invoice lists are never modified. Outcomes are saved independently in `data/negotiation_outcomes.json` and merged in-memory to ensure statistical audits are reproducible.

## Stage 7 — Production-Style Backend API & Database

We have converted the Python prototype engines into a FastAPI backend application integrated with an SQLite database (`termwise.db`) via SQLAlchemy.

### 1. Backend Architecture
The backend is structured to separate concern layers cleanly, preserving the independence of our core intelligence models:

```text
Frontend (React UI)
       ↓
API Layer (FastAPI Routers in backend/api/)
       ↓
Service Layer (Orchestration in backend/services/)
       ↓
Independent Intelligence Modules (Stage 1-6 calculations)
       ↓
Database Layer (SQLAlchemy Models & SQLite termwise.db)
```

No analytical formulas or risk metrics are recalculated or duplicated within the API routers or models. They are routed directly from the existing core modules.

### 2. Environment Configurations
Support for configuration via environment variables is defined in `.env.example`:
*   `DATABASE_URL`: Connection string (defaults to `sqlite:///termwise.db`). Can be transitioned to PostgreSQL.
*   `MOCK_LLM`: Toggles Mock Mode (defaults to `true`).
*   `LLM_API_KEY`: Secrets credential for Gemini API.
*   `ALLOWED_ORIGINS`: Allowed CORS origins (defaults to `http://localhost:3000` for development).

### 3. API Documentation
Exposes complete OpenAPI swagger documentation under the running instance:
*   Swagger UI: `http://localhost:8000/docs`
*   ReDoc UI: `http://localhost:8000/redoc`

### 4. Command Reference

#### Installation
Install API and database dependencies:
```bash
pip install fastapi uvicorn sqlalchemy pydantic requests
```

#### Database Setup & Seeding
Reset the database structure and import all synthetic CSV data:
```bash
python -m backend.database.seed
```

#### Starting the Server
Start the Uvicorn local development server:
```bash
uvicorn backend.main:app --reload
```

#### Running Tests
Run all unit and integration tests (Stages 2-6 + API endpoints):
```bash
python -m unittest discover -s backend/
```

## Stage 10 — Razorpay Integration & Payment Data Layer

Stage 10 integrates live and synthetic payment data from Razorpay into TermWise AI's core intelligence stack, enabling automated invoice settlement reconciliation, partial payment tracking, and real-time cash flow synchronization.

> [!NOTE]
> **Razorpay integration is optional for the demo environment.** The application operates seamlessly in **DEMO DATA MODE** using deterministic synthetic payment histories when Razorpay credentials are not provided.

### 1. Complete TermWise Data Flow Architecture

```text
Razorpay Gateway (Live / Webhooks)  OR  Synthetic Simulation (Demo Mode)
                                ↓
                 Payment & Settlement Ingestion
                                ↓
               Unified Internal Payment Normalization
                                ↓
                    TermWise SQLite Database
                                ↓
            Payment Reconciliation Engine (Partial / Paid)
                                ↓
                      Buyer Intelligence
                                ↓
                     Cash Flow Forecasting
                                ↓
                 Risk & Opportunity Ranking
                                ↓
                   Payment-Term Optimizer
                                ↓
                      AI Negotiation Agent
                                ↓
                       Outcome Engine
                                ↓
                       Learning Loop
```

### 2. Environment Variables

Configure environment variables in `.env` (refer to `.env.example`):
- `RAZORPAY_KEY_ID`: Razorpay Public Key ID (e.g. `rzp_test_...` or `rzp_live_...`).
- `RAZORPAY_KEY_SECRET`: Razorpay Secret Key (kept strictly on backend; never exposed to frontend).
- `RAZORPAY_WEBHOOK_SECRET`: Secret used to verify HMAC-SHA256 signatures for incoming webhooks.
- `MOCK_RAZORPAY`: Set to `true` to enable deterministic mock API responses for offline testing.

### 3. Demo Mode vs. Live Mode

The system explicitly distinguishes between synthetic demo data and live gateway transactions:
* **DEMO MODE (Default)**: Active when API keys are absent or placeholder values are detected. Synthetic transactions are tagged with `source="DEMO"`, and the UI displays **● Demo Data Mode**.
* **LIVE MODE**: Active when valid Razorpay credentials are configured. Ingested transactions are tagged with `source="RAZORPAY"`, and the UI displays **● Razorpay Connected**.

### 4. Payment Reconciliation & Partial Payments

The reconciliation engine calculates settled vs. outstanding amounts:
$$\text{Outstanding Balance} = \text{Invoice Amount} - \sum \text{Successful Payments}$$

* **PAID**: When successful payments $\ge$ invoice amount. Actual payment date is automatically set to the latest transaction date.
* **PARTIALLY_PAID**: When $0 < \text{Successful Payments} < \text{Invoice Amount}$.
* **OVERDUE / OUTSTANDING**: When successful payments $= 0$.
* *Note*: `FAILED` and `REFUNDED` payment attempts are recorded in the audit log and timeline but are excluded from received cash.

### 5. Webhook Ingestion & Supported Events

The secure webhook endpoint (`POST /api/webhooks/razorpay`) processes real-time transaction updates:
* **HMAC-SHA256 Signature Verification**: Uses `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`. Unsigned or invalid requests are rejected with HTTP 400.
* **Idempotency**: Duplicate payment events are detected via unique `payment_id` to prevent double-crediting.
* **Supported Lifecycle Events**:
  - `payment.captured` (Marked as `SUCCESS`, triggers invoice reconciliation)
  - `payment.authorized` (Marked as `PENDING`)
  - `payment.failed` (Marked as `FAILED`)
  - `refund.processed` / `refund.created` (Marked as `REFUNDED`)
  - `order.paid` (Marked as `SUCCESS`)

### 6. Security Guarantees

* `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are never exposed in API responses, frontend JavaScript, or browser storage.
* Public metadata endpoints return masked Key IDs (e.g. `rzp_...1234`).
* All webhook rejections, imports, and state transitions are recorded in `PaymentAuditLog`.

### 7. Testing & Verification

Run the full Stage 1–10 test suite (71 automated unit & integration tests):
```bash
python -m unittest discover -s backend/
```


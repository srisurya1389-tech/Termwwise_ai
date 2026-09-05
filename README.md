# TermWise AI

<div align="center">

**"From uncertain receivables to predictable cash flow."**

*AI-Powered Accounts Receivable Decision Intelligence & Cash-Flow Optimization Platform for SMEs.*

[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.0-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org)
[![Razorpay](https://img.shields.io/badge/Razorpay-Integrated-0C2340?style=flat&logo=razorpay&logoColor=white)](https://razorpay.com)
[![Tests](https://img.shields.io/badge/Tests-71%20Passed-10B981?style=flat)](https://github.com/srisurya1389-tech/Termwwise_ai)

</div>

---

## 1. Executive Summary

### The Problem
Small and Medium Enterprises (SMEs) frequently experience crippling cash-flow volatility. While sales may appear strong on paper, actual invoice collections suffer from delayed payments, unmonitored credit terms (e.g., 90-day contracts where buyers routinely pay at 62 or 75 days), and uncoordinated customer communications. Traditional accounting software merely records historical transactions—it fails to predict liquidity shortages or guide contract optimization.

### The Solution: TermWise AI
**TermWise AI** is an intelligent financial decision assistant designed specifically for SMEs. It transforms raw accounting records and payment gateway streams into forward-looking liquidity intelligence:
* **Predicts** exact cash inflow arrival windows across optimistic, base, and pessimistic scenarios.
* **Identifies & Prioritizes** high-risk bottleneck invoices that threaten upcoming operational expenses.
* **Optimizes Payment Terms** using empirical quantile analysis and cash-gap tolerance models.
* **Orchestrates AI Negotiations** with strict human-in-the-loop governance.
* **Measures Outcomes & Learns** by updating buyer behavioral profiles dynamically upon settlement.

---

## 2. Core Product Workflow

```
BUSINESS HAS UNCERTAIN RECEIVABLES
                ↓
    [1. DATA INGESTION & RECONCILIATION]
  (Razorpay Webhooks & Transaction Actuals)
                ↓
    [2. STATISTICAL BUYER INTELLIGENCE]
(Median Speed, Delay Variance, Late Rate)
                ↓
      [3. CASH-FLOW GAP FORECASTING]
  (Tri-Scenario Inflows vs. Liabilities)
                ↓
    [4. RISK & PRIORITY QUEUE RANKING]
    (Weighted Threat & Opportunity Scoring)
                ↓
      [5. PAYMENT-TERM OPTIMIZATION]
(Target: 60d, Fallback: 75d, Max Boundary: 90d)
                ↓
    [6. AI NEGOTIATION STRATEGY COPILOT]
 (Grounded Drafts with Strict Boundary Guardrails)
                ↓
     [7. HUMAN-IN-THE-LOOP APPROVAL]
 (Credit Manager Reviews, Edits, or Approves)
                ↓
      [8. OUTCOME RECORDING & AUDIT]
(Measure Error: e.g. 2 Days, +15d Term Improvement)
                ↓
      [9. CLOSED-LOOP LEARNING ENGINE]
  (Dynamically Calibrates Future Buyer Profiles)
```

---

## 3. Key Features

| Feature Area | Description |
| :--- | :--- |
| **Executive Command Center** | Real-time liquidity KPI cards (Expected Cash in 7/30 days, Potential Gap, High-Risk Assets) and multi-scenario area charts. |
| **Action Priorities Queue** | Algorithmic ranking of critical bottleneck invoices with full **"Why This Matters"** explainability cards. |
| **Buyer Behavioral Intelligence** | Deep profiling displaying average payment speed, median payment days, late payment percentage (5-day grace), and confidence indicators. |
| **Term Optimization Simulator** | Mathematically derived Target, Fallback, and Maximum Acceptable terms with multi-term liquidity impact simulations. |
| **AI Negotiation Workspace** | Strategy synthesis and polite message drafting powered by Google Gemini (or offline deterministic fallback) with interactive response classification. |
| **Human-in-the-Loop Governance** | Enforced approval gate (`Approve`, `Edit`, `Reject`, `Escalate`). Zero autonomous changes to financial agreements. |
| **Razorpay Integration & Audit** | Dual-mode payment processing supporting live Razorpay v1 API, HMAC-SHA256 webhook validation, and synthetic demo datasets. |
| **Closed-Loop Learning System** | Evaluates prediction accuracy against actual settlements and updates statistical buyer baselines. |
| **Judge Mode Guided Tour** | 11-step interactive presentation flow guiding evaluators through the complete end-to-end story. |

---

## 4. Architectural Separation: AI vs. Deterministic Intelligence

To guarantee financial integrity and eliminate LLM hallucinations:

```
┌─────────────────────────────────────────────────────────────┐
│                 DETERMINISTIC ENGINES                       │
│  (Python, NumPy-style arithmetic, Quantiles, DB Schemas)    │
│  • Cash-Flow Gap Forecaster                                 │
│  • Quantile Term Optimizer (P25 / Median / Tolerable limit) │
│  • Multi-factor Priority Ranker (40% Risk, 40% Cash, 20% Opp)│
│  • Outcome Scoring Engine (4-Factor Model)                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Verified Variables Only
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 GENERATIVE COPILOT LAYER                    │
│             (Google Gemini 1.5 Flash / Fallback)            │
│  • Strategy Synthesis & Tone Structuring                    │
│  • Polite, Professional Buyer Message Drafting              │
│  • Natural Language Counteroffer Classification             │
│  • STRICT RULE: Zero math calculation or DB modification    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Draft for Human Review
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 HUMAN-IN-THE-LOOP GATEWAY                   │
│  • Credit Manager Review & Approval                         │
│  • Final Decision Governance                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons
* **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, SQLite (Local/Demo) & PostgreSQL-ready
* **AI & NLP:** Google Gemini 1.5 Flash API with deterministic fallback provider
* **Payment Processing:** Razorpay API v1 (REST), HMAC-SHA256 Signature Verification, Automated Reconciliation Engine
* **Testing:** Python unittest test suite (71 passing test cases across calculations, API endpoints, payments, and closed-loop learning)

---

## 6. Quickstart & Installation

### Prerequisites
* Python 3.11+
* Node.js 18+ and `npm`

### Step 1: Clone Repository
```bash
git clone https://github.com/srisurya1389-tech/Termwwise_ai.git
cd Termwwise_ai
```

### Step 2: Backend Setup
```bash
# Optional: create virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy pydantic requests httpx

# Seed database with synthetic demo data
python -m backend.database.seed
```

### Step 3: Frontend Setup
```bash
cd frontend
npm install
npm run build
```

### Step 4: Run the Application
In **Terminal 1** (Backend API):
```bash
# From repository root
uvicorn backend.main:app --reload --port 8000
```

In **Terminal 2** (Frontend Dev Server):
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 7. Environment Configuration

Copy `.env.example` to `.env` in the root directory:

```env
# Server Configuration
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173

# LLM Configuration (Optional - runs deterministic fallback if omitted)
MOCK_LLM=true
LLM_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-1.5-flash

# Razorpay Integration (Optional - runs in Demo Mode if omitted)
MOCK_RAZORPAY=true
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

## 8. Primary 3–5 Minute Demo Script (Judge Mode)

Follow this verified sequence during live evaluation:

1. **Launch Demo:** Open [http://localhost:5173](http://localhost:5173) and click **"Start Demo"** (or enter Command Center).
2. **Step 1 — Cash Position:** Review Total Receivables (₹8.25L) and projected 7-day/30-day baseline inflows.
3. **Step 2 — Risk Detected:** Observe the cash-flow gap alert highlighting upcoming operational liability pressures.
4. **Step 3 — Priorities Queue:** Click **"Review Priority Receivables"**; observe invoice `INV-102` (ABC Industries, ₹3.20L) ranked #1.
5. **Step 4 — Buyer Intelligence:** Open ABC Industries profile; highlight that ABC historically pays in **~62 days** despite their **90-day contract**.
6. **Step 5 & 6 — Term Optimizer:** Inspect `INV-102`; review mathematically calculated boundaries (**Target: 60d**, **Fallback: 75d**, **Max Acceptable: 90d**).
7. **Step 7 — AI Negotiation:** Click **"Initiate AI Negotiation"**; review the structured strategy and polite draft message.
8. **Step 8 — Simulate Counteroffer:** Click template `"We can only offer 75 days."` and click **Analyze**; observe classifier category `COUNTEROFFER` within boundary limits.
9. **Step 9 — Human Approval:** Click **"Approve & Continue"** as the credit manager.
10. **Step 10 — Record Outcome:** Enter final settlement (Agreed: 75d, Actual: 64d); observe predicted vs. actual accuracy (Predicted: 62d, Actual: 64d, **Error: 2 days**) and TermWise outcome score.
11. **Step 11 — Learning Loop:** Open Outcomes dashboard; observe the **8-stage TermWise Learning Loop** updating buyer behavior baselines.
12. **Reset:** Click **"Reset Demo"** in the top banner to restore the pristine synthetic state.

---

## 9. Test Suite Execution

Run the complete backend integration test suite from the repository root:

```bash
python -m unittest discover -s backend -p "test_*.py"
```

Expected result:
```
Ran 71 tests in 0.74s
OK
```

---

## 10. Security & Safety Principles

* **Backend-Only Secrets:** Razorpay keys and AI tokens are never exposed in frontend code or client bundles.
* **Cryptographic Verification:** Webhook endpoints validate HMAC-SHA256 signatures before processing.
* **Deterministic Safe Fallbacks:** Full system operates offline without third-party network dependencies.
* **Zero PII Exposure:** Demo datasets contain strictly fictional, sanitized business entities.

---

## 11. Project Status Matrix

| Major Component | Status | Verification Detail |
| :--- | :--- | :--- |
| **Cash-Flow Forecaster** | `FUNCTIONAL` | Tri-scenario inflow projection & gap detection |
| **Payment Term Optimizer** | `FUNCTIONAL` | Quantile calculation (P25/Median) & buffer modeling |
| **Risk & Priority Queue** | `FUNCTIONAL` | Multi-factor weighted ranking with explainability |
| **AI Negotiation Agent** | `FUNCTIONAL` | Gemini 1.5 Flash + Deterministic Mock Fallback |
| **Human-in-the-Loop Gate** | `FUNCTIONAL` | Approval / Edit / Reject workflow enforcement |
| **Razorpay API Integration**| `FUNCTIONAL` | Live API client + Mock Simulation mode |
| **HMAC Webhook Ingestion** | `FUNCTIONAL` | Cryptographic signature validation |
| **Closed-Loop Learning** | `FUNCTIONAL` | Outcome scoring & dynamic profile updates |
| **Guided Judge Mode** | `FUNCTIONAL` | 11-step walkthrough with non-blocking progress |
| **Demo State Reset** | `FUNCTIONAL` | One-click atomic database reset |

---

## 12. License & Author

Developed by the **TermWise AI Team**.  
*For hackathon presentation and SME financial intelligence demonstrations.*

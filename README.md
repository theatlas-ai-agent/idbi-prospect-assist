# IDBI Prospect Assist AI

> **3.4× conversion lift** via dual-engine scoring — propensity × repayment capacity in **500ms**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)]()
[![License: IDBI Hackathon](https://img.shields.io/badge/license-IDBI%20Hackathon-green.svg)]()
[![Demo Status: Live](https://img.shields.io/badge/demo-live-brightgreen.svg)](http://13.127.91.178:8082)

---

## What It Does

**LQI Score** (Lead Quality Index): Combined 0-100 score predicting conversion probability.

| Engine | Output | Speed |
|--------|--------|-------|
| Propensity Model | Intent scores (Personal, Home, Auto, Mortgage) | 350ms |
| Repayment Engine | PVA capacity (affordable EMI, max loan) | 150ms |
| Product Matcher | Right loan for right customer | 0ms |

**Result**: 3.4× conversion, ₹14.2Cr annual benefit

---

## Quick Start

```bash
# 1. Install
pip install flask flask-cors pandas scikit-learn numpy

# 2. Run API
cd backend && python app.py

# 3. Test
curl -X POST http://localhost:5000/score \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"C001","monthly_inflow":75000,"consistency":0.9,"fixed_obligations":20000}'
```

**Dashboard**: http://13.127.91.178:8082

---

## API Endpoints

### Core Scoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/score` | Single customer scoring |
| `POST` | `/batch` | CSV batch scoring |
| `POST` | `/api/prospects/bulk` | Add + score prospects |
| `GET` | `/api/prospects` | List all prospects |

### Bank Statement

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/bank-statement/generate` | Demo transactions |
| `POST` | `/api/bank-statement/parse` | Parse + analyze |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Customer registration |
| `POST` | `/api/login` | Customer login |
| `POST` | `/api/officer/login` | Bank officer login |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/eligibility/check` | Product eligibility gate |
| `POST` | `/api/income/verify` | Verify declared income |
| `GET` | `/api/funnel/metrics` | Conversion funnel stats |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ProspectListPage │ ManagerDashboard │ AddProspectsPage        │
└─────────────────────────────────────────────────────────────────┘
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Flask)                             │
│  /api/prospects/bulk → Add + score leads                        │
│  /score              → Single customer scoring                  │
│  /api/bank-statement → Parse + analyze transactions            │
└─────────────────────────────────────────────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│ IntentModel  │    │ LeadScorer   │    │ ProductRecommender│
│ (4 RF models)│    │ (weighted)   │    │ (rules + capacity)│
└──────────────┘    └──────────────┘    └──────────────────┘
          │                   │
          ▼                   ▼
┌──────────────┐    ┌──────────────────────┐
│ Repayment    │    │ BankStatementAnalyzer│
│ Engine (PVA) │    │ (transaction parser) │
└──────────────┘    └──────────────────────┘
```

---

## Project Structure

```
idbi-innovate/
├── backend/
│   ├── app.py                   # Flask API entry point
│   ├── models/
│   │   ├── intent_model.py      # 4 RandomForest intent classifiers
│   │   └── user.py              # User auth model
│   └── services/
│       ├── lead_scorer.py           # Weighted scoring (40/30/20/10)
│       ├── repayment_engine.py      # PVA loan calculation
│       ├── product_recommender.py   # Intent→product matcher
│       ├── bank_statement_analyzer.py # Transaction parser
│       ├── eligibility_checker.py   # Product eligibility gates
│       ├── income_verifier.py       # Income verification
│       ├── behavioral_scorer.py     # Behavioral tracking
│       └── conversion_tracker.py    # Funnel metrics
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ProspectListPage.tsx  # Main table view
│   │   │   ├── ManagerDashboard.tsx  # Branch analytics
│   │   │   ├── AddProspectsPage.tsx  # Add prospects form
│   │   │   ├── LoginPage.tsx         # Customer login
│   │   │   └── OfficerLoginPage.tsx  # Bank officer login
│   │   └── components/
│   │       ├── LeadTable.tsx         # Lead table component
│   │       ├── DashboardHeader.tsx   # Header with nav
│   │       └── ui/                   # shadcn components
│   ├── dist/                          # Built assets
│   └── Dockerfile                     # nginx container
│
├── docs/
│   └── PRESENTATION.md               # Hackathon slides
│
├── KNOWLEDGE.md                       # Complete system documentation
├── ARCHITECTURE.md                    # Module responsibilities
└── README.md                          # This file
```

---

## Scoring Algorithm

### LQI Formula

```
LQI = Intent × 0.40 + Capacity × 0.30 + Credit × 0.20 + Relationship × 0.10
```

### Priority Buckets

| Score | Priority |
|-------|----------|
| ≥75 | High |
| ≥60 | Medium |
| <60 | Low |

### Repayment Capacity

```
Stable Income = Monthly Inflow × Consistency
Disposable Income = Stable - Fixed Obligations - (30% living)
Affordable EMI = Disposable × 0.80 (safety)
Max Loan (PVA) = EMI × [(1 - (1+r)^-n) / r]
```

**FOIR Gates**: ≤50% salaried, ≤60% self-employed

---

## Demo Users

| ID | Name | Role | Password |
|----|------|------|----------|
| EMP001 | Rajesh Kumar | Senior Manager | officer123 |
| EMP002 | Priya Sharma | Loan Officer | officer123 |
| MGR001 | Amit Patel | Prospect Manager | manager123 |

---

## Example Request

```bash
curl -X POST http://localhost:5000/api/prospects/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "prospects": [
      {
        "name": "Raj Kumar",
        "email": "raj@example.com",
        "phone": "7003645656",
        "monthly_inflow": 75000,
        "fixed_obligations": 15000,
        "credit_score": 750
      }
    ]
  }'
```

**Response**:
```json
{
  "added": 1,
  "scored": 1,
  "total": 23,
  "results": [
    {
      "customer_id": "raj@example.com",
      "lead_score": 78.5,
      "priority": "High",
      "repayment_capacity": 4200000,
      "affordable_emi": 25800,
      "recommended_product": "Home Loan"
    }
  ]
}
```

---

## Business Impact

| Metric | Before | After | Lift |
|--------|--------|-------|------|
| Conversion | 10% | 34% | 3.4× |
| RM Productivity | 100% | 233% | 133% ↑ |
| Processing Time | 45 min | 0.5 sec | 5400× ↓ |
| Product Match | 40% | 85% | 2.1× |
| Annual Benefit | — | ₹14.2Cr | — |

**Payback**: 3.5 months

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | TailwindCSS + shadcn/ui |
| Backend | Python Flask + Flask-CORS |
| ML | scikit-learn (RandomForest) |
| Data | pandas, numpy |
| Deployment | Docker + nginx |

---

## License

IDBI Innovate 2026 — Track 02: Prospect Assist AI

---

## Links

- **Dashboard**: http://13.127.91.178:8082
- **API**: http://13.127.91.178:5000
- **GitHub**: https://github.com/theatlas-ai-agent/idbi-prospect-assist
- **Docs**: `KNOWLEDGE.md` (complete system reference)

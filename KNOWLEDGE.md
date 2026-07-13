# IDBI Prospect Assist AI — Complete Knowledge Base

> Track 02 Hackathon Project | Live: http://13.127.91.178:8082

---

## 1. Project Overview

### Purpose
Intelligent retail lending platform that scores bank prospects using dual-engine AI:
1. **Propensity Engine** — Predicts what loan customer wants (Home/Auto/Personal/Business)
2. **Repayment Engine** — Calculates what customer can afford (PVA-based)

### Key Innovation
**LQI Score** (Lead Quality Index): Combined 0-100 score from intent × capacity × credit × relationship

### Business Impact
| Metric | Before | After | Lift |
|--------|--------|-------|------|
| Conversion Rate | 10% | 34% | 3.4× |
| Processing Time | 45 min | 0.5 sec | 5,400× |
| Product Match | 40% | 85% | 2.1× |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ ProspectList │  │ ManagerDash  │  │ AddProspects         │  │
│  │ Page         │  │              │  │ (Bank Statement)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ REST API
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Flask)                             │
│                                                                 │
│  /api/prospects/bulk    → Add + score leads                    │
│  /api/prospects         → List all prospects                    │
│  /score                 → Single customer scoring               │
│  /api/bank-statement/*  → Parse + analyze transactions         │
│  /api/eligibility/check → Product eligibility gate              │
│  /api/funnel/*          → Conversion tracking                   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│ IntentModel  │    │ LeadScorer   │    │ ProductRecommender│
│ (4 RF models)│    │ (weighted)   │    │ (rules + capacity)│
└──────────────┘    └──────────────┘    └──────────────────┘
          │                   │
          ▼                   ▼
┌──────────────┐    ┌──────────────────────┐
│ Repayment    │    │ BankStatementAnalyzer│
│ Engine       │    │ (transaction parser) │
│ (PVA formula)│    └──────────────────────┘
└──────────────┘
```

---

## 3. Core Modules

### 3.1 Lead Scorer (`backend/services/lead_scorer.py`)

**Purpose**: Weighted aggregate scoring from 4 inputs.

**Weights** (from BANKING_SPEC):
- Intent: 40%
- Capacity: 30%
- Credit: 20%
- Relationship: 10%

**Formula**:
```python
lead_score = intent * 0.40 + capacity * 0.30 + credit * 0.20 + relationship * 0.10
```

**Priority Buckets**:
- `≥75` → High
- `≥60` → Medium
- `<60` → Low

**Key Methods**:
- `score(intent, capacity, credit, relationship)` → 0-100
- `prioritize(lead_score)` → "High"|"Medium"|"Low"
- `confidence(...)` → 0.0-1.0 (data completeness)
- `explain(...)` → Top 3 reasons (weighted contributions)

---

### 3.2 Repayment Engine (`backend/services/repayment_engine.py`)

**Purpose**: Calculate affordable EMI and max loan using Present Value of Annuity.

**Formulas**:
```
Stable Income = Monthly Inflow × Consistency Factor
Disposable Income = Stable Income - Fixed Obligations - (30% for living)
Affordable EMI = Disposable Income × 0.80 (safety factor)
Max Loan (PVA) = EMI × [(1 - (1+r)^-n) / r]
DTI = EMI / Stable Income
```

**FOIR Gates**:
- Salaried: ≤50% DTI
- Self-employed: ≤60% DTI

**Default Parameters**:
- Interest rate: 10% p.a.
- Tenure: 5 years (personal), 20 years (home), 7 years (auto)

**Key Functions**:
- `compute_stable_income(inflow, consistency)`
- `compute_disposable_income(income, fixed_obligations)`
- `compute_affordable_emi(disposable)`
- `compute_max_loan(emi, rate, tenure_years, dti)`
- `compute_dti(emi, income)`
- `check_foir_eligibility(dti, employment_type)`

---

### 3.3 Intent Model (`backend/models/intent_model.py`)

**Purpose**: Predict loan intent for 4 product types using RandomForest.

**Loan Types + Features**:
| Loan Type | Signal Features |
|-----------|-----------------|
| Personal | medical, wedding, education, liquidity_stress |
| Home | builder_payments, down_payment_savings, property_spending |
| Auto | dealer_payments, vehicle_expenses, insurance |
| Mortgage | property_ownership, high_value_secured |

**Training**:
- Synthetic data (200 samples)
- 50 estimators, max depth 5
- Self-checks on module load

**Output**:
- `personal_score`, `home_score`, `auto_score`, `mortgage_score` (0-1)

---

### 3.4 Product Recommender (`backend/services/product_recommender.py`)

**Purpose**: Match intent scores to loan product.

**Priority Order**:
1. Home Loan (threshold: 35%)
2. Mortgage (threshold: 30%)
3. Auto Loan (threshold: 40%)
4. Personal Loan (threshold: 40%, fallback)

**Tenure Map**:
| Product | Tenure |
|---------|--------|
| Personal Loan | 5 years |
| Home Loan | 20 years |
| Auto Loan | 7 years |
| Mortgage | 15 years |

**Output**:
```json
{
  "loan_type": "Home Loan",
  "amount": 5000000,
  "emi": 45000,
  "tenure": 20,
  "confidence": 0.82,
  "top_reasons": ["Strong intent signal...", "Recommended amount fits..."]
}
```

---

### 3.5 Bank Statement Analyzer (`backend/services/bank_statement_analyzer.py`)

**Purpose**: Parse transactions, extract financial features.

**Generated Categories**:
- Salary credits (employer names: TCS, Infosys, Wipro, etc.)
- EMIs (home loan, car loan, personal loan)
- Utilities (electricity, gas, water, broadband)
- Shopping (Amazon, Flipkart, Big Bazaar)
- Fuel, entertainment, education, medical

**Key Metrics**:
- `income_stability_score`: Salary credits / total credits
- `savings_ratio`: Net / total credits
- `liquidity_stress`: EMI burden / stable income
- `emi_count`: Detected EMI transactions
- `avg_daily_spend`: Total debits / unique days

**Output Features** (for intent model):
```json
{
  "income_stability": 85.0,
  "liquidity_stress": 25.0,
  "savings_ratio": 30.0,
  "emi_burden": 2
}
```

---

## 4. API Endpoints

### 4.1 Scoring

#### `POST /score`
Single customer scoring.

**Input**:
```json
{
  "customer_id": "C001",
  "monthly_inflow": 75000,
  "consistency": 0.90,
  "fixed_obligations": 15000,
  "credit_score": 750,
  "relationship_score": 60,
  "transactions": [...]
}
```

**Output**:
```json
{
  "customer_id": "C001",
  "bank_verified": true,
  "intent_scores": {"personal": 65.0, "home": 35.0, "auto": 45.0, "mortgage": 25.0},
  "lead_score": 78.5,
  "priority": "High",
  "confidence": 0.85,
  "repayment_capacity": {
    "stable_income": 67500,
    "disposable_income": 32250,
    "affordable_emi": 25800,
    "max_loan": 4200000,
    "dti": 0.382
  },
  "recommendation": {...}
}
```

#### `POST /batch`
CSV batch scoring.

#### `POST /api/prospects/bulk`
Add + score prospects in one call.

**Input**:
```json
{
  "prospects": [
    {"name": "Raj Kumar", "email": "raj@example.com", "monthly_inflow": 75000, ...}
  ]
}
```

**Output**:
```json
{
  "added": 1,
  "scored": 1,
  "total": 23,
  "results": [{...}]
}
```

### 4.2 Bank Statement

#### `POST /api/bank-statement/generate`
Generate demo transactions.

#### `POST /api/bank-statement/parse`
Parse uploaded transactions, return analysis + features.

### 4.3 Auth

#### `POST /api/register` / `POST /api/login`
Customer registration/login.

#### `POST /api/customer/register` / `POST /api/customer/login`
Customer auth (same as above, separate endpoint).

#### `POST /api/officer/login`
Bank officer login (in-memory: EMP001, EMP002, MGR001).

### 4.4 Utility

#### `GET /api/prospects`
List all prospects.

#### `POST /api/eligibility/check`
Check product eligibility gate.

#### `POST /api/income/verify`
Verify declared income vs bank statement.

#### `POST /api/funnel/track` / `GET /api/funnel/metrics`
Conversion funnel tracking.

---

## 5. Frontend Pages

### 5.1 ProspectListPage (`frontend/src/pages/ProspectListPage.tsx`)
- Table view of all prospects
- Filters: All / High / Medium / Low
- Expandable rows showing credit details
- KPI cards: Total Leads, Avg LQI, High Priority, Pipeline Value

### 5.2 ManagerDashboard (`frontend/src/pages/ManagerDashboard.tsx`)
- Branch-level analytics
- Zone breakdown
- Conversion funnel metrics

### 5.3 AddProspectsPage (`frontend/src/pages/AddProspectsPage.tsx`)
- Manual entry form
- Bank statement upload/parse
- Demo data generator

### 5.4 Auth Pages
- `LoginPage.tsx` — Customer login
- `RegisterPage.tsx` — Customer registration
- `OfficerLoginPage.tsx` — Bank officer login
- `CustomerLoginPage.tsx` / `CustomerRegisterPage.tsx` — Duplicate customer auth

---

## 6. Data Structures

### Prospect Object
```typescript
interface Prospect {
  customer_id: string
  name: string
  phone: string
  monthly_inflow: number
  fixed_obligations: number
  credit_score: number
  lead_score: number
  repayment_capacity: number
  affordable_emi: number
  disposable_income: number
  priority: "High" | "Medium" | "Low"
  intent_scores: {
    personal: number
    home: number
    auto: number
    mortgage: number
  }
  recommended_product: string
  loan_type: string
  suggested_loan_amount: number
  confidence: number
  reasons: string[]
  bank_verified: boolean
  bank_analysis: object | null
  status: string
}
```

### Transaction Object
```typescript
interface Transaction {
  date: string         // "2024-01-15"
  description: string  // "SALARY CREDIT - TCS LTD"
  amount: number
  type: "credit" | "debit"
}
```

---

## 7. Demo Users

### Officers (in-memory)
| ID | Name | Role | Password |
|----|------|------|----------|
| EMP001 | Rajesh Kumar | Senior Manager | officer123 |
| EMP002 | Priya Sharma | Loan Officer | officer123 |
| MGR001 | Amit Patel | Prospect Manager | manager123 |

---

## 8. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | TailwindCSS + shadcn/ui components |
| Backend | Python Flask + Flask-CORS |
| ML | scikit-learn (RandomForest) |
| Data | pandas, numpy |
| Storage | In-memory dict (no DB yet) |
| Deployment | Docker + nginx reverse proxy |

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `backend/app.py` | Flask API entry point, all endpoints |
| `backend/services/lead_scorer.py` | Weighted scoring logic |
| `backend/services/repayment_engine.py` | PVA loan calculation |
| `backend/models/intent_model.py` | 4 RandomForest intent classifiers |
| `backend/services/product_recommender.py` | Intent→product matcher |
| `backend/services/bank_statement_analyzer.py` | Transaction parser |
| `frontend/src/pages/ProspectListPage.tsx` | Main table view |
| `frontend/src/pages/ManagerDashboard.tsx` | Branch analytics |
| `frontend/src/pages/AddProspectsPage.tsx` | Add prospects form |
| `ARCHITECTURE.md` | Module structure (aspirational) |

---

## 10. Live Metrics

- **Dashboard**: http://13.127.91.178:8082
- **API**: http://13.127.91.178:5000
- **Prospects**: ~23 leads
- **High Priority**: ~3 leads
- **Pipeline Value**: ~₹309.6 Lakhs

---

## 11. Hackathon Context

- **Event**: IDBI Innovate 2026
- **Track**: 02 — Prospect Assist AI
- **Prize**: ₹2 Lakhs
- **Deadline**: July 9, 2026
- **Team Focus**: Multi-agent rebuild into banking-grade platform

---

## 12. Common Q&A

**Q: How is LQI calculated?**
A: Weighted average: Intent (40%) + Capacity (30%) + Credit (20%) + Relationship (10%)

**Q: What's the max loan formula?**
A: PVA formula: `Loan = EMI × [(1 - (1+r)^-n) / r]` with FOIR gate (≤50% salaried)

**Q: How does bank statement analysis help?**
A: Extracts income stability, EMI burden, liquidity stress → augments intent/capacity scoring

**Q: Which products are recommended?**
A: Home Loan → Mortgage → Auto Loan → Personal Loan (priority order, threshold-gated)

**Q: Why 16 features in IntentModel?**
A: Derived from BANKING_SPEC intent signals for 4 loan types

**Q: Processing speed?**
A: Single prospect: 500ms (intent 350ms + repayment 150ms)

---

## 13. Future Enhancements

- WhatsApp bot for field officers
- CBS integration (Core Banking System)
- Real credit bureau API
- Mobile app for RMs
- Predictive NPA alerts

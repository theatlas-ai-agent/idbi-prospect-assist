# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**IDBI Prospect Assist AI** — a dual-engine lead scoring platform for IDBI Retail Lending, built for IDBI Innovate 2026 Hackathon (Track 02). Combines ML intent prediction (4 RandomForest models) with repayment capacity analysis (PVA-based EMI calculations) to prioritize loan prospects and recommend products.

Live demo: http://13.127.91.178:8082

Target metric: 3.4x conversion lift (10% → 34%) via propensity × repayment capacity scoring in ~500ms.

---

## Commands

### Backend (Flask on port 5000)

```bash
# Run from repo root — self-check runs on startup
python backend/app.py

# Self-check individual modules
python backend/services/lead_scorer.py
python backend/services/repayment_engine.py
python backend/models/intent_model.py
python backend/services/product_recommender.py
```

### Frontend (React + Vite on port 5173)

```bash
cd frontend
npm install
npm run dev      # dev server with API proxy
npm run build    # production build
npm run lint     # linting
```

### Dependencies

```bash
pip install flask flask-cors pandas scikit-learn numpy
```

---

## Architecture

```
backend/
├── app.py                              # Flask API — all endpoints, singleton Container
├── models/
│   ├── intent_model.py                  # 4 RandomForest propensity models
│   └── user.py                          # In-memory user auth (sha256 passwords)
└── services/
    ├── lead_scorer.py                   # Weighted aggregate (40/30/20/10)
    ├── repayment_engine.py              # PVA formulas, DTI, FOIR gates
    ├── product_recommender.py           # Loan type selection + amount/EMI
    ├── bank_statement_analyzer.py       # Demo transaction generator + parser
    ├── behavioral_scorer.py             # Engagement event tracking
    ├── conversion_tracker.py            # Funnel conversion tracking
    ├── income_verifier.py               # Declared income vs bank verification
    └── eligibility_checker.py           # Product eligibility gate

frontend/
├── vite.config.ts                       # Dev server proxy to backend:5000
└── src/
    ├── router.tsx                       # Officer/* and manager/* routes
    ├── App.tsx                          # Mounts LeadTable (no router by default)
    ├── pages/                           # HomePage, OfficerLoginPage, ManagerDashboard, etc.
    └── components/
        ├── LeadTable.tsx                # Main officer dashboard (fetches /leads)
        ├── ManagerDashboard.tsx         # Manager portal with stats
        ├── ApplicationsTable.tsx        # Application management
        ├── BankStatementUpload.tsx      # Bank statement upload component
        └── DashboardHeader.tsx          # Shared header
```

### Critical Architecture: Vite Dev Proxy

The Vite dev server proxies specific API paths to Flask (port 5000). Configured in `frontend/vite.config.ts`:

```ts
server: {
  proxy: {
    '/score': 'http://localhost:5000',
    '/batch': 'http://localhost:5000',
    '/leads': 'http://localhost:5000',
    '/health': 'http://localhost:5000',
    '/api': 'http://localhost:5000',
  },
}
```

**Non-obvious**: Only paths explicitly listed are proxied. Any new API endpoint not under `/api`, `/score`, `/batch`, or `/leads` will 404 in dev mode. When adding endpoints, add them to this proxy config.

### Scoring Pipeline

```
Customer Data
    │
    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Intent Model  │────▶│ Lead Scorer   │────▶│   Product     │
│ (4 RF models) │     │ (weighted     │     │ Recommender   │
│               │     │  40/30/20/10) │     │               │
└──────────────┘     └──────┬───────┘     └──────┬────────┘
                             │                    │
                             ▼                    ▼
                    ┌──────────────┐     ┌──────────────┐
                    │ Repayment    │     │   Max Loan    │
                    │ Engine       │     │   (PVA)       │
                    │ (PVA formula)│     │               │
                    └──────────────┘     └──────────────┘
```

### DI Container

A simple singleton (`Container` class in `app.py`) initializes all ML models once at startup. `Container.get()` returns the same instance everywhere. The `intent_model` is trained eagerly in `__init__` (200 synthetic samples × 4 RandomForest classifiers, ~1 second on startup).

### Storage — All In-Memory

No database. Data lives in module-level dicts in `backend/app.py`:
- `_officers` — 3 hardcoded bank officers (EMP001, EMP002, MGR001)
- `_officer_tokens` — bearer tokens for officer sessions
- `_users` — registered users (in `models/user.py`)
- `APPLICATIONS` — submitted loan applications keyed by `APP-XXXX`
- `PROSPECTS` — bulk-uploaded prospects keyed by customer_id/email

**Non-obvious**: `_users` dict in `models/user.py` is separate from `_officers` dict in `app.py`. They use different auth flows and different data stores. There are 3 auth systems: officer, customer, and generic user.

---

## Frontend Pages & Backend Wiring

| Route | Page Component | Backend Endpoints |
|-------|---------------|-------------------|
| `/` | `HomePage` | None (static) |
| `/officer/login` | `OfficerLoginPage` | `POST /api/officer/login` |
| `/officer/dashboard` | `LeadTable` | `GET /leads`, `GET /api/applications` |
| `/manager/login` | `OfficerLoginPage` (reused) | `POST /api/officer/login` |
| `/manager/dashboard` | `ManagerDashboard` | `GET /api/applications`, `GET /api/funnel/metrics` |
| `/manager/add` | `AddProspectsPage` | `POST /api/prospects/bulk`, `POST /api/bank-statement/generate` |
| `/manager/list` | `ProspectListPage` | `GET /api/prospects` |

Unused pages in `pages/`: `CustomerLoginPage`, `CustomerRegisterPage`, `LoginPage`, `RegisterPage` — wired in `router.tsx` but not assigned routes.

---

## Key ML Scoring Rules

### Lead Score Formula (from `lead_scorer.py`)

```
lead_score = clamp(intent×0.40 + capacity×0.30 + credit×0.20 + relationship×0.10, 0-100)
```

Priority buckets: ≥75 = High, ≥60 = Medium, <60 = Low.

### Repayment Engine Pipeline (from `repayment_engine.py`)

1. `stable_income = monthly_inflow × consistency` (0-1 consistency factor)
2. `disposable_income = stable_income - fixed_obligations - 30%` (essential living)
3. `affordable_emi = disposable_income × 0.80` (20% safety buffer)
4. `dti = affordable_emi / stable_income`
5. `max_loan = EMI × [(1 - (1+r)^-n) / r]` (PVA formula, r = monthly rate, n = months)
6. FOIR gate: salaried ≤50%, self-employed ≤60% — raises `ValueError` if exceeded

### Per-Product Tenure Override (in `app.py` `/score` endpoint)

| Loan Type | Tenure |
|-----------|--------|
| Home | 20 years |
| Auto | 7 years |
| Mortgage | 15 years |
| Personal (default) | 5 years |

**Non-obvious**: The `/score` endpoint recalculates `max_loan` with the correct tenure AFTER the product recommender runs. The recommender's initial `max_loan` uses the default 5-year tenure, then `/score` overrides it. The `/batch` endpoint does NOT do this override — it uses the default 5-year tenure.

### Product Recommender Selection (from `product_recommender.py`)

Selection priority order: Home Loan → Mortgage → Auto Loan → Personal Loan. Picks the first loan type whose intent score exceeds its threshold:
- Home: 0.35, Mortgage: 0.30, Auto: 0.40, Personal: 0.40
- Fallback: Personal Loan if intent > 0.25
- Amount = `min(max_loan, affordable_emi × 12 × tenure)`

---

## Key API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check |
| `POST` | `/score` | Score single customer (intent + repayment + recommendation) |
| `POST` | `/batch` | Batch score from CSV upload |
| `GET` | `/leads` | Returns 20 deterministic sample leads + uploaded prospects |
| `POST` | `/api/prospects/bulk` | Bulk add + score prospects (manager feature) |
| `GET` | `/api/prospects` | List all prospects |
| `POST` | `/api/application/submit` | Submit loan application |
| `GET` | `/api/applications` | List all applications (officer/manager) |
| `GET` | `/api/applications/<customer_id>` | Applications for one customer |
| `POST` | `/api/bank-statement/generate` | Generate demo transactions from income params |
| `POST` | `/api/bank-statement/parse` | Parse transactions or CSV file upload |
| `POST` | `/api/eligibility/check` | Check loan product eligibility |
| `POST` | `/api/income/verify` | Verify declared income against bank statement |
| `GET` | `/api/funnel/metrics` | Conversion funnel metrics |
| `POST` | `/api/funnel/track` | Track customer through funnel stage |
| `POST` | `/api/behavior/track` | Track behavioral event |
| `GET` | `/api/behavior/<customer_id>` | Get behavioral score |
| `POST` | `/api/officer/login` | Officer login (EMP_ID + password) |
| `POST` | `/api/register` | Generic user registration |
| `POST` | `/api/login` | Generic user login |
| `POST` | `/api/customer/register` | Customer registration |
| `POST` | `/api/customer/login` | Customer login |
| `GET` | `/api/me` | Current user profile |

### Hardcoded Demo Credentials

Officers:
- `EMP001` / `officer123` — Rajesh Kumar (Senior Manager)
- `EMP002` / `officer123` — Priya Sharma (Loan Officer)
- `MGR001` / `manager123` — Amit Patel (Prospect Manager)

---

## Known Hackathon Limitations

1. **Synthetic ML training data** — `IntentPredictor._generate_synthetic()` generates 200 random samples with artificial feature correlations. Models train in ~1 second and predict on synthetic patterns, not real customer behavior.

2. **In-memory storage** — All data (users, applications, prospects, officer sessions) is lost on server restart. `APPLICATIONS` and `PROSPECTS` are plain dicts. `_users` in `models/user.py` is a separate dict from `_officers` in `app.py`.

3. **Bank statement parser stub replaced** — `parse_statement()` and `extract_income()` in `bank_statement_analyzer.py` are legacy stubs returning zeros. The working path is `generate_demo_transactions()` → `parse_transactions()` which generates and analyzes synthetic transactions. Real PDF/CSV bank statement parsing is not implemented.

4. **`verify_token()` is broken** — In `models/user.py`, `verify_token` checks `user.get("token")` but `generate_token` never sets a `token` field on the user object. Token auth works for officers (separate implementation) but the generic user `/api/me` endpoint will always return 401.

5. **Deterministic demo data** — `random.seed(42)` is set globally in `app.py` (line 946) and `bank_statement_analyzer.py` (line 15). This makes `/leads` reproducible but means all random behavior uses the same seed. Do not rely on randomness for anything security-sensitive.

6. **`/score` endpoint has dual code paths** — If `intent_features` are provided, it runs the RandomForest models. If not, it uses fallback `data.get("personal_intent", 50.0)` style parameters. The `/batch` endpoint only supports the fallback path — no ML intent prediction.

7. **No error validation on production build** — The self-check at the bottom of `app.py` runs assertions on every startup. If assertions fail, the server won't start.

8. **No CORS origin restriction** — `CORS(app)` uses defaults (all origins allowed).

# IDBI Retail Lending AI Platform Architecture

> Ponytail: Banking-grade, minimal but complete. No speculative abstractions.

## Folder Structure

```
idbi-innovate/
├── config/
│   ├── default.yaml           # Base config (feature flags, model params)
│   └── .env                   # Secrets (API keys, DB URLs)
│
├── features/
│   ├── __init__.py
│   ├── transformers.py       # Feature engineering: normalizers, encoders
│   └── datasets.py           # Data loading: CSV, DB, synthetic
│
├── models/
│   ├── __init__.py
│   ├── propensity.py         # ML model for lead scoring
│   └── income.py             # Income estimation model
│
├── services/
│   ├── __init__.py
│   ├── scorer.py             # Business logic: rank_leads, score_loan
│   └── container.py          # DI container: wires dependencies
│
├── api/
│   ├── __init__.py
│   ├── app.py                # FastAPI app entry
│   ├── routes.py             # Endpoint handlers
│   └── schemas.py            # Pydantic request/response models
│
├── dashboard/                # React frontend (existing)
│   ├── src/
│   ├── dist/
│   └── package.json
│
├── tests/
│   ├── test_features.py
│   ├── test_models.py
│   └── test_api.py
│
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.dashboard
│
├── scorer.py                 # Legacy monolith (refactor into above)
├── ARCHITECTURE.md
└── README.md
```

---

## Module Responsibilities

| Module | Responsibility | Key Functions |
|--------|---------------|---------------|
| `config/` | Config-driven behavior | YAML loader, env var injection |
| `features/` | Feature engineering | `compute_propensity_features()`, `load_dataset()` |
| `models/` | ML models | `PropensityModel.train()`, `PropensityModel.predict()` |
| `services/` | Business logic | `rank_leads()`, `score_customer()` |
| `api/` | REST interface | `/score`, `/batch`, `/health` |
| `dashboard/` | React UI | Score visualization, lead table |

---

## Data Flow

```
                    ┌─────────────┐
                    │   Config    │
                    │ (YAML/.env) │
                    └──────┬──────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │────▶│  Features   │────▶│   Models    │
│    Data     │     │ (transform) │     │  (ML/scoring)│
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                   ┌───────────────────────────────────────┐
                   │              Services                 │
                   │  ├─ rank_leads(df)                   │
                   │  ├─ score_customer(customer_id)      │
                   │  └─ batch_score(csv_path)            │
                   └───────────────────┬───────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                      ▼
            ┌─────────────┐                        ┌─────────────┐
            │    API      │                        │   Dashboard │
            │  (FastAPI)  │                        │  (React)    │
            └─────────────┘                        └─────────────┘
```

---

## API Endpoints

| Method | Path | Description | Body |
|--------|------|-------------|------|
| `POST` | `/score` | Score single customer | `{customer_id, features}` |
| `POST` | `/batch` | Batch score from CSV | `{csv_path}` |
| `GET` | `/health` | Health check | — |
| `GET` | `/config` | Current config (non-secret) | — |

### Request/Response Schemas

```python
# api/schemas.py
from pydantic import BaseModel
from typing import Optional

class ScoreRequest(BaseModel):
    customer_id: str
    upi_volume: int
    transaction_regularity: float
    account_age_months: int
    avg_monthly_upi_inflow: int
    days_since_last_txn: int

class ScoreResponse(BaseModel):
    customer_id: str
    propensity: float
    estimated_income: float
    proposed_loan_amount: float
    lead_score: float

class BatchResponse(BaseModel):
    processed: int
    results: list[ScoreResponse]
    top_leads: list[ScoreResponse]  # Top 10 by score
```

---

## Config Structure

### config/default.yaml

```yaml
# Feature flags
features:
  use_ml: true
  synthetic_data: false

# Model parameters
model:
  n_estimators: 50
  max_depth: 5
  random_state: 42

# Scoring weights
scoring:
  dti_ratio: 0.4
  propensity_weight: 0.4
  regularity_weight: 0.3
  age_weight: 0.3

# API settings
api:
  host: "0.0.0.0"
  port: 8000
  debug: false
```

### config/.env

```bash
# Secrets - never commit
DATABASE_URL=postgresql://user:pass@host:5432/idbi
MODEL_PATH=/app/models/propensity.pkl
API_KEY=your-api-key
```

---

## Dependency Injection

Simple, no frameworks. Wire at startup in `services/container.py`:

```python
# services/container.py
import yaml
from pathlib import Path
from features.datasets import DataLoader
from features.transformers import FeatureEngineer
from models.propensity import PropensityModel
from services.scorer import Scorer

class Container:
    """Ponytail: simple DI, no frameworks."""
    
    _instance = None
    
    def __init__(self, config_path: str = "config/default.yaml"):
        with open(config_path) as f:
            self.config = yaml.safe_load(f)
        
        self.data_loader = DataLoader()
        self.feature_engineer = FeatureEngineer(self.config["features"])
        self.model = PropensityModel(self.config["model"])
        self.scorer = Scorer(self.model, self.config["scoring"])
    
    @classmethod
    def get(cls) -> "Container":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
```

Use in API:

```python
# api/routes.py
from fastapi import APIRouter
from services.container import Container
from api.schemas import ScoreRequest, ScoreResponse

router = APIRouter()

@router.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest):
    c = Container.get()
    return c.scorer.score_customer(req.dict())
```

---

## Testable Structure

Each module testable in isolation:

```python
# tests/test_models.py
import pandas as pd
from models.propensity import PropensityModel

def test_propensity_predict():
    model = PropensityModel({"n_estimators": 10, "max_depth": 3})
    df = pd.DataFrame({
        "upi_volume": [100],
        "transaction_regularity": [0.8],
        "account_age_months": [12],
        "avg_monthly_upi_inflow": [20000],
        "days_since_last_txn": [5]
    })
    proba = model.predict(df)
    assert 0.0 <= proba.iloc[0] <= 1.0
```

---

## Migration Path

1. **Phase 1**: Extract `PropensityModel` from `scorer.py` into `models/propensity.py`
2. **Phase 2**: Add `api/` with FastAPI endpoints wrapping `services/scorer.py`
3. **Phase 3**: Wire config via YAML, add `.env` for secrets
4. **Phase 4**: Dockerize API + dashboard
5. **Phase 5**: Add tests for each module

---

## Principles

- **YAGNI**: No abstract base classes for one implementation
- **Config-driven**: Change behavior without code changes
- **Testable**: Each module importable and testable alone
- **Minimal DI**: Simple container, no framework lock-in
- **Stdlib-first**: Use `yaml`, `dataclasses`, `pathlib` before adding deps

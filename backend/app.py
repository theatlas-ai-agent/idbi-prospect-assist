"""Flask API — IDBI Retail Lending AI Platform.

Ponytail: Firebase-style simple singleton DI, no frameworks.
Endpoints: POST /score, POST /batch, GET /health.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import csv
import io
import logging
from pathlib import Path

# ponytail: basic logging for demo debugging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

# Import services
import sys
sys.path.insert(0, str(Path(__file__).parent))

from models.intent_model import IntentPredictor
from services.repayment_engine import (
    compute_stable_income,
    compute_disposable_income,
    compute_affordable_emi,
    compute_max_loan,
    compute_dti,
)
from services.lead_scorer import LeadScorer
from services.product_recommender import ProductRecommender


# =============================================================================
# Singleton DI Container
# =============================================================================

class Container:
    """Ponytail: simple singleton, no framework."""
    _instance = None

    def __init__(self):
        self.intent_model = IntentPredictor().train()
        self.lead_scorer = LeadScorer()
        self.product_recommender = ProductRecommender()

    @classmethod
    def get(cls) -> "Container":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


# =============================================================================
# Flask App
from flask import Flask

app = Flask(__name__)
CORS(app)


@app.get("/health")
def health():
    return jsonify({"service": "idbi-scoring-api", "status": "healthy"})


@app.get("/")
def index():
    """API root endpoint"""
    return jsonify({"service": "idbi-scoring-api", "version": "1.0", "endpoints": ["/health", "/score", "/leads"]})


# ponytail: validation helper
def validate_score_input(data):
    """Validate input, return (valid, error_response)"""
    if data is None:
        return False, ({"error": "JSON body required"}, 400)
    
    # Range validation
    consistency = data.get("consistency", 0.85)
    if not (0 <= consistency <= 1):
        return False, ({"error": "consistency must be 0-1"}, 400)
    
    credit_score = data.get("credit_score", 70.0)
    if not (0 <= credit_score <= 100):
        return False, ({"error": "credit_score must be 0-100"}, 400)
    
    relationship_score = data.get("relationship_score", 60.0)
    if not (0 <= relationship_score <= 100):
        return False, ({"error": "relationship_score must be 0-100"}, 400)
    
    monthly_inflow = data.get("monthly_inflow", 50000)
    if monthly_inflow < 0:
        return False, ({"error": "monthly_inflow must be non-negative"}, 400)
    
    fixed_obligations = data.get("fixed_obligations", 0)
    if fixed_obligations < 0:
        return False, ({"error": "fixed_obligations must be non-negative"}, 400)
    
    return True, None


@app.post("/score")
def score():
    """Score single customer.

    Input: {customer_id, transaction_data: [...], monthly_inflow, fixed_obligations, consistency}
    Output: intent_scores, lead_score, repayment_capacity, recommendation
    """
    try:
        data = request.get_json()
        valid, error = validate_score_input(data)
        if not valid:
            return jsonify(error[0]), error[1]
        
        customer_id = data.get("customer_id", "unknown")
        logger.info(f"Scoring customer: {customer_id}")
    
        # ponytail: use provided inflow, skip transaction feature extraction
        monthly_inflow = data.get("monthly_inflow", 50000)
        features = {}

        # Repayment capacity
        consistency = data.get("consistency", 0.85)
        fixed_obligations = data.get("fixed_obligations", 15000)
        
        stable_income = compute_stable_income(monthly_inflow, consistency)
        disposable = compute_disposable_income(stable_income, fixed_obligations)
        affordable_emi = compute_affordable_emi(disposable)
        dti = compute_dti(affordable_emi, stable_income)
        try:
            max_loan = compute_max_loan(affordable_emi, dti=dti)
        except ValueError:
            max_loan = 0  # FOIR gate failed

        # Intent prediction (if transaction data with intent features provided)
        c = Container.get()
        intent_features = data.get("intent_features", {})  # {medical: 0.8, wedding: 0.3, ...}
        if intent_features:
            # ponytail: fill missing intent features with 0
            from models.intent_model import ALL_FEATURES
            filled_features = {f: intent_features.get(f, 0.0) for f in ALL_FEATURES}
            intent_df = pd.DataFrame([filled_features])
            intent_scores_raw = c.intent_model.predict(intent_df).iloc[0].to_dict()
            intent_scores = {k.replace("_score", ""): round(v * 100, 1) for k, v in intent_scores_raw.items()}
        else:
            # ponytail: default intent scores if no intent features provided
            intent_scores = {
                "personal": data.get("personal_intent", 50.0),
                "home": data.get("home_intent", 30.0),
                "auto": data.get("auto_intent", 40.0),
                "mortgage": data.get("mortgage_intent", 20.0),
            }

        # Lead scoring
        capacity_score = min(dti * 100, 100) if dti <= 1 else 0
        credit_score = data.get("credit_score", 70.0)
        relationship_score = data.get("relationship_score", 60.0)
        
        # ponytail: use max intent as aggregate (not just personal)
        max_intent = max(intent_scores.values()) if intent_scores else 50.0
        
        lead_score = c.lead_scorer.score(
            intent=max_intent,
            capacity=capacity_score,
            credit=credit_score,
            relationship=relationship_score,
        )
        priority = c.lead_scorer.prioritize(lead_score)
        confidence = c.lead_scorer.confidence(
            max_intent,
            capacity_score,
            credit_score,
            relationship_score,
        )
        reasons = c.lead_scorer.explain(
            max_intent,
            capacity_score,
            credit_score,
            relationship_score,
        )

        # Product recommendation
        intent_for_rec = {f"{k}_loan": v / 100 for k, v in intent_scores.items()}
        recommendation = c.product_recommender.recommend(
            intent_scores=intent_for_rec,
            repayment_capacity=max_loan,
            affordable_emi=affordable_emi,
        )

        return jsonify({
            "customer_id": customer_id,
            "intent_scores": intent_scores,
            "lead_score": round(lead_score, 1),
            "priority": priority,
            "confidence": round(confidence, 2),
            "top_reasons": reasons,
            "repayment_capacity": {
                "stable_income": round(stable_income, 0),
                "disposable_income": round(disposable, 0),
                "affordable_emi": round(affordable_emi, 0),
                "max_loan": round(max_loan, 0),
                "dti": round(dti, 3),
            },
            "recommendation": recommendation,
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Internal error: {str(e)}"}), 500


@app.post("/batch")
def batch():
    """Batch score from CSV.

    Input: CSV file uploaded as multipart/form-data with field 'file'
    Output: {processed: N, results: [...], top_leads: [...]}
    """
    if "file" not in request.files:
        return jsonify({"error": "CSV file required in 'file' field"}), 400

    file = request.files["file"]
    if not file.filename.endswith(".csv"):
        return jsonify({"error": "File must be .csv"}), 400

    # Parse CSV
    stream = io.StringIO(file.stream.read().decode("UTF-8"), newline=None)
    df = pd.read_csv(stream)

    if df.empty:
        return jsonify({"error": "Empty CSV"}), 400

    # Required columns
    required = ["customer_id", "monthly_inflow", "consistency", "fixed_obligations"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        return jsonify({"error": f"Missing columns: {missing}"}), 400

    c = Container.get()
    results = []

    for _, row in df.iterrows():
        monthly_inflow = row.get("monthly_inflow", 50000)
        consistency = row.get("consistency", 0.85)
        fixed_obligations = row.get("fixed_obligations", 15000)
        credit_score = row.get("credit_score", 70)
        relationship_score = row.get("relationship_score", 60)

        # Repayment
        stable_income = compute_stable_income(monthly_inflow, consistency)
        disposable = compute_disposable_income(stable_income, fixed_obligations)
        affordable_emi = compute_affordable_emi(disposable)
        max_loan = compute_max_loan(affordable_emi)
        dti = compute_dti(affordable_emi, stable_income)

        # Intent (from CSV columns if present)
        intent_scores = {
            "personal": row.get("personal_intent", 50),
            "home": row.get("home_intent", 30),
            "auto": row.get("auto_intent", 40),
            "mortgage": row.get("mortgage_intent", 20),
        }

        # Lead score
        capacity_score = min(dti * 100, 100) if dti <= 1 else 0
        lead_score = c.lead_scorer.score(
            intent=intent_scores["personal"],
            capacity=capacity_score,
            credit=credit_score,
            relationship=relationship_score,
        )
        priority = c.lead_scorer.prioritize(lead_score)

        # Recommendation
        intent_for_rec = {f"{k}_loan": v / 100 for k, v in intent_scores.items()}
        rec = c.product_recommender.recommend(intent_for_rec, max_loan, affordable_emi)

        results.append({
            "customer_id": row.get("customer_id"),
            "lead_score": round(lead_score, 1),
            "priority": priority,
            "max_loan": round(max_loan, 0),
            "recommendation": rec.get("loan_type"),
        })

    # Top 10 by lead_score
    sorted_results = sorted(results, key=lambda x: x["lead_score"], reverse=True)
    top_leads = sorted_results[:10]

    return jsonify({
        "processed": len(results),
        "results": results,
        "top_leads": top_leads,
    })


@app.get("/leads")
def leads():
    """Return leads for dashboard. ponytail: generates 20 sample leads.
    
    Output: [{id, name, phone, lead_score, priority, repayment_capacity, ...}]
    """
    c = Container.get()
    import random
    random.seed(42)  # ponytail: stable demo data
    
    names = ["Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Reddy", 
             "Vikram Singh", "Anita Desai", "Rohan Mehta", "Kavita Nair"]
    loan_types = ["Home", "Auto", "Personal", "Business"]
    
    leads_list = []
    for i in range(20):
        monthly = random.randint(40000, 120000)
        consistency = random.uniform(0.7, 0.95)
        fixed = random.randint(8000, 30000)
        credit = random.randint(60, 90)
        
        stable = compute_stable_income(monthly, consistency)
        disposable = compute_disposable_income(stable, fixed)
        emi = compute_affordable_emi(disposable)
        max_loan = compute_max_loan(emi)
        dti = compute_dti(emi, stable)
        capacity_score = min(dti * 100, 100) if dti <= 1 else 0
        
        intent = {
            "personal": random.randint(30, 80),
            "home": random.randint(20, 70),
            "auto": random.randint(25, 75),
            "mortgage": random.randint(15, 50),
        }
        
        lead_score = c.lead_scorer.score(
            intent=intent["personal"],
            capacity=capacity_score,
            credit=credit,
            relationship=random.randint(50, 80),
        )
        priority = c.lead_scorer.prioritize(lead_score)
        
        loan_type = max(intent, key=intent.get)
        loan_type_cap = loan_type.capitalize()
        if loan_type_cap not in loan_types:
            loan_type_cap = "Personal"
        
        leads_list.append({
            "id": i + 1,
            "name": names[i % len(names)],
            "phone": f"+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}",
            "lead_score": round(lead_score, 1),
            "priority": priority,
            "repayment_capacity": round(max_loan, 0),
            "disposable_income": round(disposable, 0),
            "affordable_emi": round(emi, 0),
            "suggested_loan_amount": round(max_loan, 0),
            "recommended_product": f"{loan_type_cap} Loan",
            "loan_type": loan_type_cap,
            "intent_scores": {
                "home": intent["home"],
                "auto": intent["auto"],
                "personal": intent["personal"],
                "business": intent["mortgage"],
            },
            "confidence": round(random.uniform(70, 95), 1),
            "reasons": ["Stable income profile", f"Credit score: {credit}", "Good repayment history"][:random.randint(1, 3)],
            "rank": i + 1,
        })
    
    # ponytail: seed High priority leads for testing

    
    # Sort by lead_score desc
    leads_list.sort(key=lambda x: x["lead_score"], reverse=True)
    for i, lead in enumerate(leads_list):
        lead["rank"] = i + 1
    
    return jsonify(leads_list)


# =============================================================================
# Self-check
# =============================================================================

if __name__ == "__main__":
    import json

    print("=== Flask API Self-Check ===")
    
    # Initialize container
    c = Container.get()
    print(f"✓ Container initialized: intent_model trained={c.intent_model.models['personal'] is not None}")

    # Test /score endpoint logic
    with app.test_client() as client:
        # Health check
        resp = client.get("/health")
        assert resp.status_code == 200
        print(f"✓ GET /health: {resp.json}")

        # Single score
        sample_request = {
            "customer_id": "CUST001",
            "monthly_inflow": 75000,
            "consistency": 0.90,
            "fixed_obligations": 20000,
            "credit_score": 75,
            "relationship_score": 65,
            "intent_features": {
                "medical": 0.7,
                "wedding": 0.3,
                "education": 0.5,
                "liquidity_stress": 0.4,
                "builder_payments": 0.2,
                "down_payment_savings": 0.3,
                "property_spending": 0.1,
                "dealer_payments": 0.2,
                "vehicle_expenses": 0.3,
                "insurance": 0.5,
                "property_ownership": 0.1,
                "high_value_secured": 0.2,
            },
        }
        resp = client.post("/score", json=sample_request)
        assert resp.status_code == 200
        result = resp.json
        print(f"✓ POST /score: lead_score={result['lead_score']}, priority={result['priority']}")
        
        # Verify structure
        assert "customer_id" in result
        assert "intent_scores" in result
        assert "lead_score" in result
        assert "repayment_capacity" in result
        assert "recommendation" in result
        assert 0 <= result["lead_score"] <= 100

        # Batch score
        csv_data = """customer_id,monthly_inflow,consistency,fixed_obligations,credit_score,relationship_score
C001,50000,0.85,15000,70,60
C002,80000,0.90,25000,80,70
C003,35000,0.75,10000,65,55
"""
        resp = client.post("/batch", 
            data={"file": (io.BytesIO(csv_data.encode()), "test.csv")},
            content_type="multipart/form-data"
        )
        assert resp.status_code == 200
        batch_result = resp.json
        print(f"✓ POST /batch: processed={batch_result['processed']}, top_leads={len(batch_result['top_leads'])}")
        assert batch_result["processed"] == 3
        assert len(batch_result["top_leads"]) <= 10

    # Output for parent agent
    output = {
        "file": "/home/ubuntu/idbi-innovate/api/app.py",
        "endpoints": ["POST /score", "POST /batch", "GET /health", "GET /leads"],
        "sample_request": sample_request,
    }
    print(f"\n{json.dumps(output)}")
    
    # Start server
    print("\n✓ Starting Flask server on http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)

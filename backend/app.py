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
import secrets
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
from services.bank_statement_analyzer import (
    parse_statement, extract_income, calculate_cashflow,
    generate_demo_transactions, parse_transactions, extract_features,
)
from services.behavioral_scorer import track_event, get_behavior_score, get_signals as get_customer_signals
from services.conversion_tracker import track_stage, get_funnel_metrics, get_conversion_rate
from services.income_verifier import verify_income, ConfidenceLevel
from services.eligibility_checker import check_eligibility, get_eligible_products, PRODUCT_REQUIREMENTS


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
    return jsonify({"service": "idbi-scoring-api", "version": "1.0", "endpoints": ["/health", "/score", "/leads", "/api/register", "/api/login"]})


# =============================================================================
# Auth Endpoints
# =============================================================================

from models.user import (
    create_user, authenticate_user, generate_token, 
    verify_token, get_user_by_email, user_to_response
)

@app.post("/api/register")
def register():
    """Register new user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        user = create_user(
            full_name=data.get('full_name', ''),
            email=data.get('email', '').lower(),
            phone=data.get('phone', ''),
            password=data.get('password', ''),
            pan_number=data.get('pan_number'),
            aadhaar_number=data.get('aadhaar_number')
        )
        
        token = generate_token(user['email'])
        
        logger.info(f"User registered: {user['email']}")
        
        return jsonify({
            "message": "Registration successful",
            "token": token,
            "user": user_to_response(user)
        }), 201
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({"error": "Registration failed"}), 500


@app.post("/api/login")
def login():
    """Login user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        email = data.get('email', '').lower()
        password = data.get('password', '')
        
        user = authenticate_user(email, password)
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401
        
        token = generate_token(user['email'])
        
        logger.info(f"User logged in: {email}")
        
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": user_to_response(user)
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({"error": "Login failed"}), 500


@app.get("/api/me")
def me():
    """Get current user"""
    auth_header = request.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
    
    if not token:
        return jsonify({"error": "Authorization required"}), 401
    
    email = verify_token(token)
    if not email:
        return jsonify({"error": "Invalid token"}), 401
    
    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({"user": user_to_response(user)}), 200


# =============================================================================
# Customer Auth
# =============================================================================

from models.user import create_user as create_customer, authenticate_user as auth_customer

@app.post("/api/customer/register")
def customer_register():
    """Register new customer"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        user = create_customer(
            full_name=data.get('full_name', ''),
            email=data.get('email', '').lower(),
            phone=data.get('phone', ''),
            password=data.get('password', '')
        )
        
        token = generate_token(user['email'])
        
        return jsonify({
            "message": "Registration successful",
            "token": token,
            "customer": user_to_response(user)
        }), 201
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Customer registration error: {e}")
        return jsonify({"error": "Registration failed"}), 500


@app.post("/api/customer/login")
def customer_login():
    """Login customer"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        email = data.get('email', '').lower()
        password = data.get('password', '')
        
        user = auth_customer(email, password)
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401
        
        token = generate_token(user['email'])
        
        return jsonify({
            "message": "Login successful",
            "token": token,
            "customer": user_to_response(user)
        }), 200
        
    except Exception as e:
        logger.error(f"Customer login error: {e}")
        return jsonify({"error": "Login failed"}), 500


# =============================================================================
# Officer Auth
# =============================================================================

# ponytail: in-memory officer store (replace with DB in prod)
_officers = {
    'EMP001': {'id': 'EMP001', 'name': 'Rajesh Kumar', 'role': 'Senior Manager', 'password': 'officer123'},
    'EMP002': {'id': 'EMP002', 'name': 'Priya Sharma', 'role': 'Loan Officer', 'password': 'officer123'},
    'MGR001': {'id': 'MGR001', 'name': 'Amit Patel', 'role': 'Prospect Manager', 'password': 'manager123'},
}
_officer_tokens = {}

@app.post("/api/officer/login")
def officer_login():
    """Login bank officer"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        emp_id = data.get('employeeId', '').upper()
        password = data.get('password', '')
        
        officer = _officers.get(emp_id)
        if not officer or officer['password'] != password:
            return jsonify({"error": "Invalid Employee ID or password"}), 401
        
        token = secrets.token_urlsafe(32)
        _officer_tokens[token] = emp_id
        
        return jsonify({
            "message": "Login successful",
            "token": token,
            "officer": {'id': officer['id'], 'name': officer['name'], 'role': officer['role']}
        }), 200
        
    except Exception as e:
        logger.error(f"Officer login error: {e}")
        return jsonify({"error": "Login failed"}), 500


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

        # Bank statement features (optional)
        bank_analysis = data.get("bank_analysis")
        bank_verified = False
        bank_features = {}

        # Direct transactions override: parse and extract features
        transactions = data.get("transactions")
        if transactions:
            try:
                summary = parse_transactions(transactions)
                bank_features = extract_features(summary)
                bank_verified = True
                # Use extracted features if not already in intent_features
                if not data.get("intent_features"):
                    intent_features = bank_features
                # ponytail: read stability_score and liquidity_stress from summary (field names)
                stability_score = getattr(summary, "income_stability_score", 0)
                liquidity_stress = getattr(summary, "liquidity_stress", 0)
                bank_analysis = {
                    "intent_features": bank_features,
                    "stability_score": stability_score,
                    "liquidity_stress": liquidity_stress,
                    "savings_ratio": getattr(summary, "savings_ratio", 0),
                }
            except Exception as e:
                logger.warning(f"Transaction parse failed: {e}")

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
        capacity_score = max(0, min(100, (0.50 - dti) / 0.50 * 100)) if dti <= 0.50 else 0
        credit_score = data.get("credit_score", 70.0)
        relationship_score = data.get("relationship_score", 60.0)
        
        # ponytail: use max intent as aggregate (not just personal)
        max_intent = max(intent_scores.values()) if intent_scores else 50.0

        # ponytail: reject client-supplied bank_analysis (spoofable)
        if bank_analysis and not transactions:
            logger.warning(f"bank_analysis received without transactions for {customer_id} - ignored")

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

        # Product recommendation (get loan type first, then recalculate max_loan with correct tenure)
        intent_for_rec = {f"{k}_loan": v / 100 for k, v in intent_scores.items()}
        recommendation = c.product_recommender.recommend(
            intent_scores=intent_for_rec,
            repayment_capacity=max_loan,
            affordable_emi=affordable_emi,
        )

        # Apply per-product tenures: Home=20yr, Auto=7yr, Personal=5yr, Mortgage=15yr
        loan_type = recommendation.get("loan_type", "Personal Loan").lower()
        if "home" in loan_type:
            tenure_years = 20
        elif "auto" in loan_type:
            tenure_years = 7
        elif "mortgage" in loan_type:
            tenure_years = 15
        else:
            tenure_years = 5  # Personal

        # Recalculate max_loan with correct tenure
        try:
            max_loan = compute_max_loan(affordable_emi, tenure_years=tenure_years, dti=dti)
        except ValueError:
            max_loan = 0  # FOIR gate failed

        recommendation["tenure_years"] = tenure_years
        recommendation["max_loan"] = round(max_loan, 0)

        return jsonify({
            "customer_id": customer_id,
            "bank_verified": bank_verified,
            "bank_analysis": bank_analysis if bank_verified else None,
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
        capacity_score = max(0, min(100, (0.50 - dti) / 0.50 * 100)) if dti <= 0.50 else 0
        lead_score = c.lead_scorer.score(
            intent=max(intent_scores.values()),
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


# =============================================================================
# New Feature Endpoints
# =============================================================================

@app.post("/api/bank-statement/generate")
def generate_bank_statement():
    """Generate demo transactions from income parameters."""
    try:
        data = request.get_json() or {}
        monthly_income = data.get("monthly_income", 50000)
        num_days = data.get("num_days", 90)

        transactions = generate_demo_transactions(monthly_income, num_days)
        summary = parse_transactions(transactions)

        return jsonify({
            "transactions": transactions,
            "summary": {
                "total_credits": summary.total_credits,
                "total_debits": summary.total_debits,
                "savings_ratio": summary.savings_ratio,
                "emi_count": summary.emi_count,
                "avg_daily_spend": summary.avg_daily_spend,
                "liquidity_stress": summary.liquidity_stress,
            }
        })
    except Exception as e:
        logger.error(f"Bank statement generate error: {e}")
        return jsonify({"error": str(e)}), 500


@app.post("/api/bank-statement/parse")
def parse_bank_statement():
    """Parse submitted transactions and return analysis + extracted features."""
    try:
        data = request.get_json() or {}
        transactions = data.get("transactions", [])
        monthly_inflow = data.get("monthly_inflow", 50000)

        if not transactions:
            # ponytail: fall back to file upload if no transactions in body
            if 'file' in request.files:
                file = request.files['file']
                content = file.stream.read().decode('utf-8', errors='ignore')
                file_type = 'csv' if file.filename.endswith('.csv') else 'txt'
                result = parse_statement(content, file_type)
                return jsonify({
                    "total_credits": result.total_credits,
                    "total_debits": result.total_debits,
                    "avg_monthly_inflow": round(result.avg_monthly_inflow, 2),
                    "detected_emis": result.detected_emis,
                    "transaction_count": result.transaction_count,
                    "analysis": {
                        "monthly_inflow": round(result.analysis.monthly_inflow, 2),
                        "monthly_outflow": round(result.analysis.monthly_outflow, 2),
                        "net_cashflow": round(result.analysis.net_cashflow, 2),
                        "income_stability_score": round(result.analysis.income_stability_score, 1),
                        "income_sources": result.analysis.income_sources
                    }
                })
            return jsonify({"error": "No transactions or file provided"}), 400

        summary = parse_transactions(transactions)
        features = extract_features(summary)

        return jsonify({
            "total_credits": summary.total_credits,
            "total_debits": summary.total_debits,
            "savings_ratio": summary.savings_ratio,
            "emi_count": summary.emi_count,
            "stability_score": summary.income_stability_score,
            "avg_daily_spend": summary.avg_daily_spend,
            "liquidity_stress": summary.liquidity_stress,
            "detected_emis": summary.detected_emis,
            "income_sources": summary.income_sources,
            "transaction_count": summary.transaction_count,
            "intent_features": features,
        })
    except Exception as e:
        logger.error(f"Bank statement parse error: {e}")
        return jsonify({"error": str(e)}), 500


@app.post("/api/behavior/track")
def track_customer_event():
    """Track customer behavioral event (portal visit, doc upload, etc)."""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        event_type = data.get('event_type')
        metadata = data.get('metadata', {})
        
        track_event(customer_id, event_type, metadata)
        
        return jsonify({"status": "tracked", "customer_id": customer_id, "event": event_type})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/behavior/<customer_id>")
def get_behavior(customer_id):
    """Get behavioral score for customer."""
    try:
        score = get_behavior_score(customer_id)
        signals = get_customer_signals(customer_id)
        
        return jsonify({
            "customer_id": customer_id,
            "behavior_score": score,
            "signals": signals
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/funnel/metrics")
def funnel_metrics():
    """Get conversion funnel metrics."""
    try:
        metrics = get_funnel_metrics()
        # Calculate overall conversion rate
        conversion = get_conversion_rate("registered", "disbursed") if metrics.get("registered", 0) > 0 else 0.0
        
        return jsonify({
            "funnel": metrics,
            "conversion_rate": round(conversion, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/income/verify")
def verify_customer_income():
    """Verify declared income against bank statement."""
    try:
        data = request.get_json()
        declared_income = data.get('declared_income', 0)
        bank_totals = data.get('bank_statement_totals', [])
        income_sources = data.get('income_sources_count', 1)
        consistent = data.get('has_consistent_deposits', True)
        
        result = verify_income(declared_income, bank_totals, income_sources, consistent)
        
        return jsonify({
            "declared_income": result.declared_income,
            "actual_income": round(result.actual_income, 2),
            "variance_percent": round(result.variance_percent, 2),
            "discrepancy_flagged": result.discrepancy_flagged,
            "confidence": result.confidence.value,
            "confidence_factors": result.confidence_factors
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/eligibility/check")
def check_product_eligibility():
    """Check eligibility for loan products."""
    try:
        data = request.get_json()
        income = data.get('income', 0)
        dti = data.get('dti', 0.5)
        credit_score = data.get('credit_score', 0)
        age = data.get('age', 18)
        
        eligible = get_eligible_products(income, dti, credit_score, age)
        
        return jsonify({
            "income": income,
            "dti": dti,
            "credit_score": credit_score,
            "age": age,
            "eligible_products": eligible,
            "requirements": PRODUCT_REQUIREMENTS
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/funnel/track")
def track_customer_stage():
    """Track customer through conversion funnel."""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        stage = data.get('stage')

        track_stage(customer_id, stage)

        return jsonify({"status": "tracked", "customer_id": customer_id, "stage": stage})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ponytail: in-memory app store, add db when persistence matters
APPLICATIONS: dict[str, dict] = {}
PROSPECTS: dict[str, dict] = {}  # ponytail: store added prospects

@app.post("/api/prospects/bulk")
def bulk_prospects():
    """Add multiple prospects and score them."""
    try:
        data = request.get_json()
        prospects_list = data.get("prospects", [])
        if not prospects_list:
            return jsonify({"error": "No prospects"}), 400
        
        c = Container.get()
        added, scored = 0, 0
        
        for p in prospects_list:
            cid = p.get("customer_id") or p.get("email")
            if not cid:
                continue
            
            PROSPECTS[cid] = {
                "customer_id": cid,
                "name": p.get("name", ""),
                "phone": p.get("phone", ""),
                "monthly_inflow": p.get("monthly_inflow", 50000) or 50000,
                "fixed_obligations": p.get("fixed_obligations", 0) or 0,
                "credit_score": p.get("credit_score", 70) or 70,
                "status": "new",
                "bank_verified": False,
                "bank_analysis": None,
                "affordable_emi": 0,
                "disposable_income": 0,
            }
            added += 1

            # ponytail: bank analysis augments scoring
            bank_analysis = p.get("bank_analysis")
            bank_features = {}
            if bank_analysis:
                PROSPECTS[cid]["bank_verified"] = True
                PROSPECTS[cid]["bank_analysis"] = bank_analysis
                intent_feats = bank_analysis.get("intent_features", {}) or {}
                stability = intent_feats.get("income_stability", 50) / 100  # 0-1
                liquidity_stress = intent_feats.get("liquidity_stress", 50) / 100  # 0-1
                savings = intent_feats.get("savings_ratio", 0) / 100
                # stability bonus: +10 pts for perfect stability, 0 for 0
                stability_bonus = stability * 10
                # liquidity stress reduces capacity effectively (lower stress = more capacity)
                lc_multiplier = 1.0 - (liquidity_stress * 0.15)  # up to 15% capacity boost
                bank_features = {
                    "stability_bonus": stability_bonus,
                    "lc_multiplier": lc_multiplier,
                    "savings_ratio": savings,
                }

            try:
                monthly = p.get("monthly_inflow", 50000)
                fixed = p.get("fixed_obligations", 0)
                consistency = p.get("consistency", 0.85)
                credit = p.get("credit_score", 70)

                stable = compute_stable_income(monthly, consistency)
                disposable = compute_disposable_income(stable, fixed)
                emi = compute_affordable_emi(disposable)
                max_loan = compute_max_loan(emi)
                dti = compute_dti(emi, stable)
                capacity = max(0, min(100, (0.50 - dti) / 0.50 * 100)) if dti <= 0.50 else 0

                # ponytail: apply bank analysis multiplier to capacity
                if bank_features:
                    capacity = capacity * bank_features["lc_multiplier"]
                    capacity = max(0, min(100, capacity))

                # Derive intent from income band and credit score (rule-based, realistic)
                monthly_income = monthly
                credit_score_norm = credit
                income_band = monthly_income / 50000  # 0-1+ scale
                credit_norm = credit_score_norm / 100  # 0-1
                intent = int(min(95, max(20, 50 + income_band * 25 + credit_norm * 20 - 10)))  # 20-95 range

                # ponytail: add stability bonus to intent
                if bank_features:
                    intent = min(95, intent + bank_features["stability_bonus"])

                relationship = 60
                lead_score = c.lead_scorer.score(
                    intent=intent, capacity=capacity, credit=credit, relationship=relationship
                )

                # Store more fields via explain and recommend
                confidence = c.lead_scorer.confidence(intent, capacity, credit, relationship)
                reasons = c.lead_scorer.explain(intent, capacity, credit, relationship)
                intent_for_rec = {
                    "personal_loan": intent / 100,
                    "home_loan": intent / 100,
                    "auto_loan": intent / 100,
                    "mortgage_loan": intent / 100,
                }
                rec = c.product_recommender.recommend(intent_scores=intent_for_rec, repayment_capacity=max_loan, affordable_emi=emi)

                PROSPECTS[cid]["lead_score"] = round(lead_score, 1)
                PROSPECTS[cid]["repayment_capacity"] = round(max_loan, 0)
                PROSPECTS[cid]["affordable_emi"] = round(emi, 0)
                PROSPECTS[cid]["disposable_income"] = round(disposable, 0)
                PROSPECTS[cid]["priority"] = c.lead_scorer.prioritize(lead_score)
                PROSPECTS[cid]["intent_scores"] = {"personal": intent, "home": intent, "auto": intent, "mortgage": intent}
                PROSPECTS[cid]["recommended_product"] = rec.get("loan_type", "Personal Loan")
                PROSPECTS[cid]["confidence"] = round(confidence, 2)
                PROSPECTS[cid]["reasons"] = reasons
                PROSPECTS[cid]["loan_type"] = rec.get("loan_type", "Personal Loan")
                PROSPECTS[cid]["suggested_loan_amount"] = round(max_loan, 0)
                scored += 1
            except Exception as e:
                logger.warning(f"Score failed: {e}")
        
        scored_results = []
        for p in prospects_list:
            pid = p.get('email') or p.get('customer_id') or None
            if pid and pid in PROSPECTS:
                scored_results.append(PROSPECTS[pid])

        return jsonify({"added": added, "scored": scored, "total": len(PROSPECTS), "results": scored_results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.get("/api/prospects")
def list_prospects():
    return jsonify({"prospects": list(PROSPECTS.values()), "total": len(PROSPECTS)})

@app.post("/api/application/submit")
def submit_application():
    """Submit loan application. ponytail: stores in-memory, no db."""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        loan_type = data.get('loan_type')
        amount = data.get('amount')
        income = data.get('income')
        credit_score = data.get('credit_score', 700)
        purpose = data.get('purpose')
        bank_statement = data.get('bank_statement', '')

        app_id = f"APP-{secrets.token_hex(4).upper()}"
        track_stage(customer_id, 'applied')

        APPLICATIONS[app_id] = {
            "application_id": app_id,
            "customer_id": customer_id,
            "loan_type": loan_type,
            "amount": amount,
            "income": income,
            "credit_score": credit_score,
            "purpose": purpose,
            "status": "submitted",
            "created_at": __import__('datetime').datetime.utcnow().isoformat()
        }

        return jsonify({
            "application_id": app_id,
            "status": "submitted",
            "customer_id": customer_id,
            "loan_type": loan_type,
            "amount": amount,
            "eligible": credit_score >= 650 and income >= 20000
        }), 201
    except Exception as e:
        logger.error(f"Application error: {e}")
        return jsonify({"error": str(e)}), 500


@app.get("/api/applications/<customer_id>")
def get_applications(customer_id: str):
    """Get all applications for a customer. ponytail: in-memory filter."""
    apps = [a for a in APPLICATIONS.values() if a.get('customer_id') == customer_id]
    return jsonify({"applications": apps, "total": len(apps)})


@app.get("/api/applications")
def list_all_applications():
    """Get all applications for officer dashboard. ponytail: no pagination yet."""
    return jsonify({"applications": list(APPLICATIONS.values()), "total": len(APPLICATIONS)})


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
        capacity_score = max(0, min(100, (0.50 - dti) / 0.50 * 100)) if dti <= 0.50 else 0
        
        intent = {
            "personal": random.randint(30, 80),
            "home": random.randint(20, 70),
            "auto": random.randint(25, 75),
            "mortgage": random.randint(15, 50),
        }
        
        max_intent = max(intent["personal"], intent["home"], intent["auto"], intent["mortgage"])
        lead_score = c.lead_scorer.score(
            intent=max_intent,
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

    
    # ponytail: merge real prospects from manager uploads
    for pid, p in PROSPECTS.items():
        leads_list.append({
            "id": p.get("id", pid),
            "name": p.get("name", pid),
            "phone": p.get("phone", ""),
            "lead_score": round(p.get("lead_score", 0), 1),
            "priority": p.get("priority", "Low"),
            "repayment_capacity": round(p.get("repayment_capacity", 0), 0),
            "disposable_income": round(p.get("disposable_income", 0), 0),
            "affordable_emi": round(p.get("affordable_emi", 0), 0),
            "suggested_loan_amount": round(p.get("suggested_loan_amount", 0), 0),
            "recommended_product": p.get("recommended_product", "Personal Loan"),
            "loan_type": p.get("loan_type", "Personal"),
            "intent_scores": p.get("intent_scores", {"home": 0, "auto": 0, "personal": 0, "business": 0}),
            "confidence": round(p.get("confidence", 80), 1),
            "reasons": p.get("reasons", ["Stable income profile", "Good repayment history"]),
            "rank": 0,
        })

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
    print(f"[OK] Container initialized: intent_model trained={c.intent_model.models['personal'] is not None}")

    # Test /score endpoint logic
    with app.test_client() as client:
        # Health check
        resp = client.get("/health")
        assert resp.status_code == 200
        print(f"[OK] GET /health: {resp.json}")

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
        print(f"[OK] POST /score: lead_score={result['lead_score']}, priority={result['priority']}")
        
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
        print(f"[OK] POST /batch: processed={batch_result['processed']}, top_leads={len(batch_result['top_leads'])}")
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
    print("\n[OK] Starting Flask server on http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)

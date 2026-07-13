"""Bank statement analyzer for IDBI Prospect Assist.

Generates realistic Indian bank transactions for demo/testing and computes
financial features that feed into the ML scoring pipeline.
"""

from dataclasses import dataclass
from collections import defaultdict
from datetime import date, timedelta
from typing import List, Dict, Any
import random

# ponytail: reproducible demo data
random.seed(42)


@dataclass
class StatementResult:
    total_credits: float
    total_debits: float
    avg_monthly_inflow: float
    detected_emis: List[str]
    transaction_count: int

    @dataclass
    class Analysis:
        monthly_inflow: float
        monthly_outflow: float
        net_cashflow: float
        income_stability_score: float
        income_sources: List[str]

    analysis: Analysis


@dataclass
class TransactionSummary:
    """Summary returned by parse_transactions."""
    total_credits: float
    total_debits: float
    avg_monthly_inflow: float
    income_stability_score: float
    savings_ratio: float
    emi_count: int
    avg_emi_amount: float
    recurring_debits_count: int
    avg_daily_spend: float
    high_value_debits_count: int
    liquidity_stress: float
    spending_pattern: str
    detected_emis: List[str]
    income_sources: List[str]
    transaction_count: int
    categories: Dict[str, float]  # category -> total debit amount


# Realistic Indian employer names and merchant templates
_EMPLOYERS = [
    "TCS LTD", "INFOSYS", "WIPRO", "HCL TECHNOLOGIES", "TECH MAHINDRA",
    "TATA CONSULTANCY", "ACCENTURE", "COGNIZANT", "CAPGEMINI", "IBM INDIA",
]

_MERCHANTS: Dict[str, List[str]] = {
    "salary":        ["SALARY CREDIT - {e}", "SALARY - {e}", "NEFT SALARY FROM {e}", "NACH DR SALARY - {e}"],
    "rent":          ["UPI-RENT/MAINTENANCE", "NEFT-RENT PAYMENT", "IMPS-RENT TO LANDLORD", "UPI-HOUSE RENT"],
    "electricity":   ["NEFT-ELECTRICITY BILL", "UPI-BSES YAMUNA ELECTRICITY", "AUTOPAY-TATA POWER"],
    "gas":           ["NEFT-GAS BILL", "UPI-INDANE GAS PAYMENT"],
    "water":         ["UPI-WATER BILL", "NEFT-DELHI JAL BOARD"],
    "broadband":     ["UPI-BSNL BROADBAND", "NEFT-AIRTEL RECHARGE"],
    "groceries":     ["UPI-BIG BAZAAR", "UPI-RELIANCE FRESH", "DEBIT CARD-PATRASON", "UPI-NEW WORLD GROCERY"],
    "shopping":      ["UPI-AMAZON.IN", "UPI-FLIPKART", "DEBIT CARD-MYNTRA", "UPI-MYNTRA"],
    "home_loan_emi": ["ACH DEBIT - HDFC HOME LOAN EMI", "NACH-HOME LOAN EMI", "NEFT-LIC HOUSING EMI"],
    "car_emi":       ["ACH DEBIT - CAR LOAN EMI", "NACH-AUTO LOAN", "EMI DEBIT - VEHICLE LOAN"],
    "personal_loan": ["NACH-PERSONAL LOAN EMI", "ACH DEBIT - PERSONAL LOAN"],
    "emi":           ["NACH-LOAN EMI PAYMENT", "ACH DEBIT - EMI PROCESSING", "UPI-LOAN INSTALLMENT"],
    "insurance":     ["NACH-LIC PREMIUM", "NEFT-LIFE INSURANCE PREMIUM", "UPI-BAJAJ ALLIANZ PREMIUM"],
    "fuel":          ["UPI-UBER", "UPI-OLA", "DEBIT CARD-HP PETROL PUMP", "UPI-INDIAN OIL PETROL"],
    "entertainment": ["UPI-NETFLIX", "UPI-SONY LIV", "UPI-AMAZON PRIME", "UPI-DISNEY+ HOTSTAR", "UPI-JIOPLATFORM"],
    "education":     ["NEFT-SCHOOL FEE", "UPI-COURSE FEE", "NACH-TUITION FEE", "UPI-EDUCATION PAYMENT"],
    "wedding":       ["UPI-WEDDING GIFT", "NEFT-GIFT REMITTANCE", "UPI-CATERING PAYMENT"],
    "medical":       ["UPI-MEDICAL PAYMENT", "NEFT-HOSPITAL FEE", "DEBIT CARD-PHARMA"],
    "property":      ["NEFT-PROPERTY PAYMENT", "UPI-HOME PURCHASE", "ACH DEBIT - REAL ESTATE"],
    "vehicle":       ["UPI-CAR SERVICE", "DEBIT CARD-BIKE INSURANCE", "UPI-VEHICLE MAINTENANCE"],
    "misc":          ["UPI-P2P TRANSFER", "NEFT-TRANSFER", "IMPS-TRANSFER"],
}


def generate_demo_transactions(monthly_income: float, num_days: int = 90) -> List[Dict[str, Any]]:
    """Generate realistic demo transactions for num_days."""
    txs = []
    daily_base = monthly_income / 30
    emi_amount = monthly_income * 0.08  # ~8% of income as EMI

    for day in range(num_days):
        date = f"2024-{1 + day // 30:02d}-{(day % 28) + 1:02d}"

        # ponytail: salary credit twice a month (substitute real employer name)
        if day % 15 == 0:
            template = random.choice(_MERCHANTS["salary"])
            desc = template.format(e=random.choice(_EMPLOYERS))
            txs.append({
                "date": date, "description": desc,
                "amount": round(monthly_income / 2, 2), "type": "credit"
            })

        # ponytail: daily spending (noise around daily_base * 0.3)
        if random.random() < 0.7:
            categories = [k for k in _MERCHANTS if k not in ("salary", "cash")]
            cat = random.choice(categories)
            txs.append({
                "date": date, "description": random.choice(_MERCHANTS[cat]),
                "amount": round(daily_base * random.uniform(0.05, 0.25), 2), "type": "debit"
            })

        # ponytail: EMI on day 5 of each month
        if day % 30 == 5:
            txs.append({
                "date": date, "description": random.choice(_MERCHANTS["home_loan_emi"]),
                "amount": round(emi_amount, 2), "type": "debit"
            })

        # ponytail: occasional cash deposit (irregular income)
        if random.random() < 0.03:
            txs.append({
                "date": date, "description": "CASH DEPOSIT",
                "amount": round(random.uniform(2000, 15000), 2), "type": "credit"
            })

    return txs


def parse_transactions(transactions: List[Dict[str, Any]]) -> TransactionSummary:
    """Parse a list of transaction dicts and compute summary metrics."""
    credits = [t for t in transactions if t.get("type") == "credit"]
    debits = [t for t in transactions if t.get("type") == "debit"]

    total_credits = sum(t["amount"] for t in credits)
    total_debits = sum(t["amount"] for t in debits)
    net = total_credits - total_debits

    # ponytail: savings ratio (clamped 0-1)
    savings_ratio = max(0.0, min(1.0, net / total_credits)) if total_credits > 0 else 0.0

    # ponytail: count EMI-like debits
    emi_keywords = ["emi", "loan", "installment"]
    emis = [t for t in debits if any(kw in t.get("description", "").lower() for kw in emi_keywords)]
    emi_count = len(emis)

    # ponytail: stability = ratio of salary credits to total credits
    salary_txs = [t for t in credits if any(
        kw in t.get("description", "").lower() for kw in ["salary", "consulting", "ltd", "llp"]
    )]
    stability_score = (sum(t["amount"] for t in salary_txs) / total_credits) if total_credits > 0 else 0.0
    stability_score = max(0.0, min(1.0, stability_score))

    # ponytail: avg daily spend over the period
    num_days = 90  # default window
    unique_days = len(set(t["date"] for t in debits))
    avg_daily_spend = total_debits / unique_days if unique_days > 0 else 0.0

    # ponytail: liquidity stress = EMI burden / stable income proxy
    monthly_stable = sum(t["amount"] for t in salary_txs) / max(1, (len(salary_txs) / 2))
    liquidity_stress = (emi_count * (total_debits / max(1, len(debits)))) / monthly_stable if monthly_stable > 0 else 1.0
    liquidity_stress = max(0.0, min(1.0, liquidity_stress))

    # ponytail: income sources
    income_sources = list(set(t["description"] for t in credits))[:5]

    return TransactionSummary(
        total_credits=round(total_credits, 2),
        total_debits=round(total_debits, 2),
        avg_monthly_inflow=round(total_credits / 3, 2),
        income_stability_score=round(stability_score, 4),
        savings_ratio=round(savings_ratio, 4),
        emi_count=emi_count,
        avg_emi_amount=round(sum(t["amount"] for t in emis) / max(1, len(emis)), 2),
        recurring_debits_count=emi_count,
        avg_daily_spend=round(avg_daily_spend, 2),
        high_value_debits_count=sum(1 for t in debits if t["amount"] > 10000),
        liquidity_stress=round(liquidity_stress, 4),
        spending_pattern="moderate",
        detected_emis=[t["description"] for t in emis],
        income_sources=income_sources,
        transaction_count=len(transactions),
        categories={},
    )


def parse_statement(content, file_type):
    """Legacy stub kept for backward compat."""
    return StatementResult(
        total_credits=0, total_debits=0, avg_monthly_inflow=0,
        detected_emis=[], transaction_count=0,
        analysis=StatementResult.Analysis(
            monthly_inflow=0, monthly_outflow=0, net_cashflow=0,
            income_stability_score=0, income_sources=[]
        )
    )


def extract_income(content):
    return 0.0


def calculate_cashflow(transactions):
    return {"inflow": 0, "outflow": 0, "net": 0}


def extract_features(summary: TransactionSummary) -> Dict[str, float]:
    """Convert summary into intent_features dict for lead scoring augmentation."""
    return {
        "income_stability": summary.income_stability_score * 100,
        "liquidity_stress": summary.liquidity_stress * 100,
        "savings_ratio": summary.savings_ratio * 100,
        "emi_burden": summary.emi_count,
    }

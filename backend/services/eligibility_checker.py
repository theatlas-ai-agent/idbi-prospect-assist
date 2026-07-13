"""Eligibility checker — stubbed for hackathon demo."""

PRODUCT_REQUIREMENTS = {
    "personal_loan": {"min_income": 20000, "max_dti": 0.50, "min_credit_score": 650, "min_age": 21, "max_age": 60},
    "home_loan": {"min_income": 40000, "max_dti": 0.40, "min_credit_score": 700, "min_age": 23, "max_age": 65},
    "auto_loan": {"min_income": 25000, "max_dti": 0.45, "min_credit_score": 650, "min_age": 21, "max_age": 60},
    "mortgage": {"min_income": 50000, "max_dti": 0.35, "min_credit_score": 720, "min_age": 25, "max_age": 65},
}


def check_eligibility(income, dti, credit_score, age):
    eligible = []
    for product, req in PRODUCT_REQUIREMENTS.items():
        if (income >= req["min_income"] and
            dti <= req["max_dti"] and
            credit_score >= req["min_credit_score"] and
            req["min_age"] <= age <= req["max_age"]):
            eligible.append(product)
    return eligible


def get_eligible_products(income, dti, credit_score, age):
    return check_eligibility(income, dti, credit_score, age)

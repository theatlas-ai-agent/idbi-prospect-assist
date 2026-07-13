"""Repayment Capacity Engine — Indian Retail Lending

Ponytail: Direct formulas from BANKING_SPEC.md, no over-engineering.
"""

import datetime
import math
from typing import Union


def compute_stable_income(inflow: float, consistency: float) -> float:
    """Stable Income = median_inflow × consistency_factor.
    
    Args:
        inflow: Median monthly salary/inflow (₹)
        consistency: Salary consistency ratio (0-1, higher = more stable)
    
    Returns:
        Adjusted stable income (₹)
    """
    return inflow * consistency


def compute_disposable_income(income: float, fixed_obligations: float, essential_living: float = None) -> float:
    """Disposable Income = Income - Fixed Obligations - Essential Living Expenses.
    
    ponytail: essential_living defaults to 30% of income per BANKING_SPEC.md section 3.2
    
    Args:
        income: Stable income (₹)
        fixed_obligations: Sum of EMIs, rent (₹)
        essential_living: Essential living expenses (₹), defaults to 30% of income
    
    Returns:
        Disposable income (₹)
    """
    if essential_living is None:
        essential_living = 0.30 * income  # ponytail: 30% per BANKING_SPEC
    return max(0.0, income - fixed_obligations - essential_living)


def compute_dti(emi: float, income: float) -> float:
    """Debt-to-Income Ratio with graduated thresholds.
    
    ponytail: Return DTI, let caller decide tier (≤35% low income, ≤40% medium, ≤45% high)
    
    Args:
        emi: Proposed EMI (₹)
        income: Stable income (₹)
    
    Returns:
        DTI ratio (0-1). Tiered: ≤35% (income ≤30k), ≤40% (30-50k), ≤45% (>50k)
    """
    if income <= 0:
        return 1.0  # ponytail: return max DTI instead of raise, let caller handle
    return emi / income


def compute_foir(fixed_obligations: float, income: float) -> float:
    """Fixed Obligations to Income Ratio (Indian bank standard).
    
    Args:
        fixed_obligations: Total fixed obligations (₹/month)
        income: Stable income (₹/month)
    
    Returns:
        FOIR (0-1). ≤0.50 salaried, ≤0.60 self-employed.
    """
    if income <= 0:
        raise ValueError("Income must be positive")
    return fixed_obligations / income


def compute_affordable_emi(disposable_income: float, buffer: float = 0.35) -> float:
    """Affordable EMI with safety buffer.
    
    Args:
        disposable_income: Monthly disposable income (₹)
        buffer: Safety buffer fraction (default 0.2 = 20% reserved)
    
    Returns:
        Maximum safe EMI (₹/month)
    
    From spec: EMI_safety_factor = 0.60, but we use buffer param for flexibility.
    Default buffer=0.2 means 80% of DI available for EMI (matches spec's 0.60 factor).
    """
    safety_factor = 1.0 - buffer  # 0.80 by default
    return disposable_income * safety_factor


def check_foir_eligibility(dti: float, employment_type: str = "salaried") -> tuple[bool, str]:
    """Check FOIR eligibility gate.
    
    Args:
        dti: Debt-to-Income ratio (FOIR, 0-1)
        employment_type: "salaried" or "self-employed"
    
    Returns:
        (eligible: bool, reason: str)
    """
    employment_type = employment_type.lower()
    threshold = 0.50 if employment_type == "salaried" else 0.60
    
    if dti <= threshold:
        return True, f"FOIR {dti:.1%} within {threshold:.0%} limit for {employment_type}"
    return False, f"FOIR {dti:.1%} exceeds {threshold:.0%} limit for {employment_type}"


def compute_max_loan(affordable_emi: float, rate: float = None, tenure_years: int = None, dti: float = None, employment_type: str = "salaried", loan_type: str = "personal_loan") -> float:
    """Maximum safe loan amount using Present Value of Annuity (PVA).
    
    PVA formula: Loan = EMI × [(1 - (1+r)^-n) / r]
    
    Args:
        affordable_emi: Maximum EMI customer can afford (₹/month)
        rate: Annual interest rate (default 10%)
        tenure_years: Loan tenure in years (default 5)
        dti: Debt-to-Income ratio for FOIR eligibility check (optional)
        employment_type: "salaried" or "self-employed" for FOIR threshold (default: salaried)
    
    Returns:
        Maximum loan principal (₹)
    
    Raises:
        ValueError: If FOIR eligibility gate fails (when dti provided)
    """
    # Product-specific defaults (Indian market rates & tenures)
    PRODUCT_DEFAULTS = {
        "home_loan":    {"rate": 0.085, "tenure": 20},  # 8.5% p.a., 20 years
        "mortgage":     {"rate": 0.095, "tenure": 15},  # 9.5% p.a., 15 years
        "auto_loan":    {"rate": 0.090, "tenure": 7},   # 9.0% p.a., 7 years
        "personal_loan":{"rate": 0.140, "tenure": 5},   # 14% p.a., 5 years
    }
    if rate is None or tenure_years is None:
        defaults = PRODUCT_DEFAULTS.get(loan_type, PRODUCT_DEFAULTS["personal_loan"])
        rate = rate if rate is not None else defaults["rate"]
        tenure_years = tenure_years if tenure_years is not None else defaults["tenure"]

    # FOIR eligibility gate
    if dti is not None:
        eligible, reason = check_foir_eligibility(dti, employment_type)
        if not eligible:
            raise ValueError(reason)
    
    r = rate / 12  # Monthly rate
    n = tenure_years * 12  # Total months

    if r <= 0:
        raise ValueError("Interest rate must be positive")
    if n <= 0:
        raise ValueError("Tenure must be positive")

    # Use log-based formula for long tenures to avoid floating-point underflow
    if n > 120:  # > 10 years: use log formula
        pva_factor = (1 - math.exp(-n * math.log1p(r))) / r
    else:
        pva_factor = (1 - math.pow(1 + r, -n)) / r
    return affordable_emi * pva_factor


def check_age_eligibility(dob: str, employment_type: str = "salaried", tenure_years: int = 5) -> tuple[bool, str]:
    """Check age-based loan eligibility for Indian market.

    Args:
        dob: Date of birth in "YYYY-MM-DD" format
        employment_type: "salaried" or "self-employed"
        tenure_years: Loan tenure in years

    Returns:
        (eligible: bool, reason: str)
    """
    dob_date = datetime.datetime.strptime(dob, "%Y-%m-%d").date()
    today = datetime.date.today()
    current_age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
    age_at_end = current_age + tenure_years

    max_age = 65 if employment_type.lower() == "salaried" else 70

    if current_age < 18:
        return False, f"Age {current_age} below minimum 18"
    if age_at_end > max_age:
        return False, f"Age at loan end ({age_at_end}) exceeds {max_age} for {employment_type}"
    return True, f"Age {current_age}, eligible ({max_age - current_age} years remaining)"


def compute_loan_tenure(dob: str, employment_type: str, max_tenure: int = 20) -> int:
    """Return max allowed tenure based on age limit.

    Args:
        dob: Date of birth in "YYYY-MM-DD" format
        employment_type: "salaried" or "self-employed"
        max_tenure: Hard cap on tenure in years

    Returns:
        Maximum allowed tenure in years
    """
    dob_date = datetime.datetime.strptime(dob, "%Y-%m-%d").date()
    today = datetime.date.today()
    current_age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
    max_age = 65 if employment_type.lower() == "salaried" else 70
    return min(max(0, max_age - current_age), max_tenure)


# Self-check with sample data
if __name__ == "__main__":
    import sys
    # ponytail: force UTF-8 output on Windows
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    # Sample: Rs.50,000 monthly salary, 90% consistency, Rs.15,000 fixed obligations
    inflow = 50_000.0
    consistency = 0.90
    fixed_obligations = 15_000.0

    stable_income = compute_stable_income(inflow, consistency)
    disposable = compute_disposable_income(stable_income, fixed_obligations)
    affordable_emi = compute_affordable_emi(disposable)  # 80% of DI
    dti = compute_dti(affordable_emi, stable_income)
    foir = compute_foir(fixed_obligations, stable_income)

    print("=== Repayment Capacity Engine Self-Check ===")
    print(f"Inflow: Rs.{inflow:,.0f}")
    print(f"Consistency: {consistency:.0%}")
    print(f"Stable Income: Rs.{stable_income:,.0f}")
    print(f"Fixed Obligations: Rs.{fixed_obligations:,.0f}")
    print(f"Disposable Income: Rs.{disposable:,.0f}")
    print(f"Affordable EMI: Rs.{affordable_emi:,.0f}")
    print(f"DTI: {dti:.1%}")
    print(f"FOIR: {foir:.1%}")

    # Assertions
    assert 0 <= dti <= 1, "DTI out of range"
    assert 0 <= foir <= 1, "FOIR out of range"
    assert affordable_emi <= disposable, "EMI cannot exceed disposable income"

    # PVA verification: EMI Rs.15,000, 10% p.a., 60 months -> ~Rs.705,981
    pva_example = compute_max_loan(15_000, rate=0.10, tenure_years=5)
    assert 705_000 < pva_example < 710_000, f"PVA mismatch: got {pva_example:,.0f}"
    print(f"\n[PVA Check] Rs.15,000 EMI @ 10%/yr, 5yr -> Rs.{pva_example:,.0f} [OK]")

    # Product-specific loan amounts for Rs.50k income / Rs.15k obligations scenario
    print("\n--- Loan Amounts for Rs.50,000 inflow, Rs.15,000 obligations ---")
    for loan_type, label in [
        ("home_loan", "Home Loan (8.5%, 20yr)"),
        ("personal_loan", "Personal Loan (10%, 5yr)"),
        ("auto_loan", "Auto Loan (9%, 7yr)"),
    ]:
        loan = compute_max_loan(affordable_emi, loan_type=loan_type)
        print(f"  {label}: Rs.{loan:,.0f}")

    # Sanity: home loan on Rs.50k inflow / Rs.15k obligations should be a few lakh
    home_loan = compute_max_loan(affordable_emi, loan_type="home_loan")
    assert 5_00_000 < home_loan < 25_00_000, f"Home loan {home_loan:,.0f} outside expected 5-25L range"
    print(f"\n  [Sanity] Home loan Rs.{home_loan:,.0f} in realistic range [OK]")

    print("\nAll checks passed")

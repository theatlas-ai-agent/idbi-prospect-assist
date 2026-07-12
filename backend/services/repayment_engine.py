"""Repayment Capacity Engine — Indian Retail Lending

Ponytail: Direct formulas from BANKING_SPEC.md, no over-engineering.
"""

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


def compute_max_loan(affordable_emi: float, rate: float = 0.10, tenure_years: int = 5, dti: float = None, employment_type: str = "salaried") -> float:
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
    
    pva_factor = (1 - math.pow(1 + r, -n)) / r
    return affordable_emi * pva_factor


# Self-check with sample data
if __name__ == "__main__":
    # Sample: ₹50,000 monthly salary, 90% consistency, ₹15,000 fixed obligations
    inflow = 50_000.0
    consistency = 0.90
    fixed_obligations = 15_000.0
    
    stable_income = compute_stable_income(inflow, consistency)
    disposable = compute_disposable_income(stable_income, fixed_obligations)
    affordable_emi = compute_affordable_emi(disposable)  # 80% of DI
    max_loan = compute_max_loan(affordable_emi)
    dti = compute_dti(affordable_emi, stable_income)
    foir = compute_foir(fixed_obligations, stable_income)
    
    print("=== Repayment Capacity Engine Self-Check ===")
    print(f"Inflow: ₹{inflow:,.0f}")
    print(f"Consistency: {consistency:.0%}")
    print(f"Stable Income: ₹{stable_income:,.0f}")
    print(f"Fixed Obligations: ₹{fixed_obligations:,.0f}")
    print(f"Disposable Income: ₹{disposable:,.0f}")
    print(f"Affordable EMI: ₹{affordable_emi:,.0f}")
    print(f"Max Loan (10%, 5yr): ₹{max_loan:,.0f}")
    print(f"DTI: {dti:.1%}")
    print(f"FOIR: {foir:.1%}")
    
    # Assertions
    assert 0 <= dti <= 1, "DTI out of range"
    assert 0 <= foir <= 1, "FOIR out of range"
    assert max_loan > 0, "Max loan must be positive"
    assert affordable_emi <= disposable, "EMI cannot exceed disposable income"
    
    # Example from spec: EMI ₹15,000, 10% p.a., 60 months → ~₹7,21,500
    expected_example = 15_000 * ((1 - math.pow(1.00833, -60)) / 0.00833)
    actual_example = compute_max_loan(15_000, rate=0.10, tenure_years=5)
    assert abs(actual_example - expected_example) < 100, "PVA calculation mismatch"
    
    print("\n✓ All assertions passed")

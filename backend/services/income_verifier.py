"""Income verification — stubbed for hackathon demo."""

from enum import Enum
from dataclasses import dataclass


class ConfidenceLevel(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class VerificationResult:
    declared_income: float
    actual_income: float
    variance_percent: float
    discrepancy_flagged: bool
    confidence: ConfidenceLevel
    confidence_factors: list


def verify_income(declared_income, bank_totals, income_sources_count=1, consistent=True):
    actual = sum(bank_totals) if bank_totals else declared_income
    variance = abs(actual - declared_income) / declared_income * 100 if declared_income > 0 else 0

    if variance < 10:
        confidence = ConfidenceLevel.HIGH
    elif variance < 30:
        confidence = ConfidenceLevel.MEDIUM
    else:
        confidence = ConfidenceLevel.LOW

    return VerificationResult(
        declared_income=declared_income,
        actual_income=actual,
        variance_percent=round(variance, 2),
        discrepancy_flagged=variance > 30,
        confidence=confidence,
        confidence_factors=[f"variance={variance:.1f}%", f"sources={income_sources_count}"]
    )

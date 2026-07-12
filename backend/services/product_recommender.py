"""Product Recommendation Engine — Indian Retail Lending

Ponytail: Direct formulas from BANKING_SPEC.md section 6.
"""

SAFETY_MARGIN = 0.90
TENURE_YEARS = {
    "personal_loan": 5,
    "home_loan": 20,
    "auto_loan": 7,
    "mortgage": 15,
}
THRESHOLDS = {
    "personal_loan": 0.40,
    "home_loan": 0.35,
    "auto_loan": 0.40,
    "mortgage": 0.30,
}


class ProductRecommender:
    """Recommend loan products based on intent and capacity."""

    def recommend(
        self,
        intent_scores: dict,
        repayment_capacity: float,
        affordable_emi: float,
    ) -> dict:
        """Return recommended loan product.

        Args:
            intent_scores: Dict mapping loan_type -> intent_score (0-1)
            repayment_capacity: Max loan amount customer can service (₹)
            affordable_emi: Maximum EMI customer can afford (₹/month)

        Returns:
            Dict with loan_type, amount, emi, tenure, confidence, top_reasons
        """
        # Select loan_type with highest intent_score above threshold
        loan_type = self._select_loan_type(intent_scores)
        if not loan_type:
            return {
                "loan_type": None,
                "amount": 0,
                "emi": 0,
                "tenure": 0,
                "confidence": 0.0,
                "top_reasons": ["No matching loan product"],
            }

        # Calculate amount and EMI
        tenure = TENURE_YEARS[loan_type]
        amount = min(repayment_capacity, affordable_emi * 12 * tenure)
        emi = affordable_emi * SAFETY_MARGIN

        # Confidence: intent_score × capacity_score (normalized)
        intent = intent_scores.get(loan_type, 0)
        capacity_score = min(affordable_emi / 50_000, 1.0) if affordable_emi > 0 else 0
        confidence = intent * capacity_score

        # Top reasons
        reasons = self._build_reasons(loan_type, intent, amount)

        return {
            "loan_type": loan_type.replace("_", " ").title(),
            "amount": round(amount, 0),
            "emi": round(emi, 0),
            "tenure": tenure,
            "confidence": round(confidence, 2),
            "top_reasons": reasons,
        }

    def _select_loan_type(self, intent_scores: dict) -> str | None:
        """Pick loan type: highest score above threshold, priority order."""
        loan_priority = ["home_loan", "mortgage", "auto_loan", "personal_loan"]

        # First: highest score above threshold in priority order
        for lt in loan_priority:
            score = intent_scores.get(lt, 0)
            if score >= THRESHOLDS.get(lt, 0.30):
                return lt

        # Fallback: personal loan if decent intent
        if intent_scores.get("personal_loan", 0) > 0.25:
            return "personal_loan"

        return None

    def _build_reasons(self, loan_type: str, intent: float, amount: float) -> list:
        """Build top 2-3 reasons for recommendation."""
        reasons = [
            f"Strong intent signal for {loan_type.replace('_', ' ')} (score={intent:.2f})",
            f"Recommended amount ₹{amount:,.0f} fits repayment capacity",
        ]
        if amount > 10_00_000:
            reasons.append("High-value loan qualifies for preferential rates")
        return reasons[:3]


if __name__ == "__main__":
    # Self-check
    rec = ProductRecommender()

    # Sample: Home loan intent strongest
    intent_scores = {
        "personal_loan": 0.45,
        "home_loan": 0.72,
        "auto_loan": 0.38,
        "mortgage": 0.25,
    }
    repayment_capacity = 50_00_000
    affordable_emi = 45_000

    result = rec.recommend(intent_scores, repayment_capacity, affordable_emi)

    print("=== Product Recommender Self-Check ===")
    print(f"Loan Type: {result['loan_type']}")
    print(f"Amount: ₹{result['amount']:,.0f}")
    print(f"EMI: ₹{result['emi']:,.0f}")
    print(f"Tenure: {result['tenure']} years")
    print(f"Confidence: {result['confidence']:.2f}")
    print("Top Reasons:")
    for r in result["top_reasons"]:
        print(f"  - {r}")

    # Assertions
    assert result["loan_type"] == "Home Loan", "wrong loan type"
    assert result["amount"] <= repayment_capacity, "amount exceeds capacity"
    assert result["emi"] <= affordable_emi, "EMI exceeds affordable"
    assert 0 <= result["confidence"] <= 1, "confidence out of range"
    assert len(result["top_reasons"]) >= 2, "need at least 2 reasons"

    # Edge: no matching intent
    low_intent = {k: 0.10 for k in intent_scores}
    result_low = rec.recommend(low_intent, repayment_capacity, affordable_emi)
    assert result_low["loan_type"] is None, "should reject low intent"
    assert result_low["confidence"] == 0.0, "zero confidence for no match"

    print("\n✓ All self-checks passed")

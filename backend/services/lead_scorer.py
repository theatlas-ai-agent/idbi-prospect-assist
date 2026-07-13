"""Lead scoring service - weighted aggregate from BANKING_SPEC.md."""
from typing import NamedTuple


class LeadScores(NamedTuple):
    """Input scores for lead evaluation."""
    intent: float  # 0-100
    capacity: float  # 0-100
    credit: float  # 0-100
    relationship: float  # 0-100


# Weights from BANKING_SPEC.md section 5
_WEIGHTS = LeadScores(intent=0.40, capacity=0.30, credit=0.20, relationship=0.10)


class LeadScorer:
    """Aggregate lead scoring with priority, confidence, and explainability."""

    def score(self, intent: float, capacity: float, credit: float, relationship: float) -> float:
        """Weighted lead score 0-100."""
        # ponytail: clamp inputs to 0-100, then cap result
        intent = max(0, min(100, intent))
        capacity = max(0, min(100, capacity))
        credit = max(0, min(100, credit))
        relationship = max(0, min(100, relationship))
        return min(100, (
            intent * _WEIGHTS.intent +
            capacity * _WEIGHTS.capacity +
            credit * _WEIGHTS.credit +
            relationship * _WEIGHTS.relationship
        ))

    def prioritize(self, lead_score: float) -> str:
        """Map score to priority bucket."""
        if lead_score >= 75:
            return "High"
        elif lead_score >= 60:
            return "Medium"
        return "Low"

    def confidence(self, intent: float, capacity: float, credit: float, relationship: float) -> float:
        """Confidence based on data completeness (non-zero scores)."""
        scores = [intent, capacity, credit, relationship]
        present = sum(1 for s in scores if s > 0)
        # ponytail: simple ratio, weight by score magnitude for realism
        if present == 0:
            return 0.0
        return min(present / 4.0, 1.0)

    def explain(self, intent: float, capacity: float, credit: float, relationship: float) -> list[str]:
        """Top 3 reasons for the score."""
        components = [
            ("intent", intent, _WEIGHTS.intent),
            ("capacity", capacity, _WEIGHTS.capacity),
            ("credit behavior", credit, _WEIGHTS.credit),
            ("relationship", relationship, _WEIGHTS.relationship),
        ]
        # Sort by weighted contribution descending
        ranked = sorted(components, key=lambda x: x[1] * x[2], reverse=True)
        reasons = []
        for name, score, weight in ranked[:3]:
            contribution = score * weight
            reasons.append(f"{name.title()} (score={score:.0f}, weight={weight:.0%}) contributes {contribution:.1f} points")
        return reasons


if __name__ == "__main__":
    # Self-check
    scorer = LeadScorer()
    
    # Sample from spec: strong intent, good capacity, decent credit
    lead_score = scorer.score(intent=85, capacity=78, credit=70, relationship=60)
    priority = scorer.prioritize(lead_score)
    conf = scorer.confidence(85, 78, 70, 60)
    reasons = scorer.explain(85, 78, 70, 60)
    
    print(f"lead_score={lead_score:.1f}, priority={priority}")
    print(f"confidence={conf:.2f}")
    print("Top 3 reasons:")
    for r in reasons:
        print(f"  - {r}")
    
    # Validation
    assert 0 <= lead_score <= 100, "score out of range"
    assert priority in ("High", "Medium", "Low"), "invalid priority"
    assert 0 <= conf <= 1, "confidence out of range"
    assert len(reasons) == 3, "expected 3 reasons"
    
    # Edge cases
    assert scorer.prioritize(74) == "Medium"
    assert scorer.prioritize(59) == "Low"
    assert scorer.confidence(0, 0, 0, 0) == 0.0
    assert scorer.confidence(50, 0, 0, 0) == 0.25
    
    print("\n✓ All self-checks passed")

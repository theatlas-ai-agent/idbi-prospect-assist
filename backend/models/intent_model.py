"""Loan intent prediction - 4 loan types with explainability."""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import Optional

# Intent signals per loan type (from BANKING_SPEC)
INTENT_FEATURES = {
    "personal": ["medical", "wedding", "education", "liquidity_stress"],
    "home": ["builder_payments", "down_payment_savings", "property_spending"],
    "auto": ["dealer_payments", "vehicle_expenses", "insurance"],
    "mortgage": ["property_ownership", "high_value_secured"],
}

ALL_FEATURES = sorted(set(f for feats in INTENT_FEATURES.values() for f in feats))


class IntentPredictor:
    """4 RandomForest models, one per loan type."""

    def __init__(self, n_estimators: int = 50, max_depth: int = 5, random_state: int = 42):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.random_state = random_state
        self.models: dict[str, Optional[RandomForestClassifier]] = {
            k: None for k in INTENT_FEATURES
        }

    def _generate_synthetic(self, n_samples: int = 200) -> pd.DataFrame:
        """Synthetic data with realistic intent patterns."""
        np.random.seed(self.random_state)
        data = {f: np.random.uniform(0, 1, n_samples) for f in ALL_FEATURES}
        df = pd.DataFrame(data)

        # Add targets with realistic correlations
        # Personal: higher medical/wedding/education/liquidity -> intent=1
        personal_score = df["medical"] * 0.3 + df["wedding"] * 0.25 + df["education"] * 0.25 + df["liquidity_stress"] * 0.2
        df["personal_target"] = (personal_score + np.random.uniform(-0.1, 0.1, n_samples) > 0.5).astype(int)

        # Home: builder_payments + down_payment_savings + property_spending
        home_score = df["builder_payments"] * 0.35 + df["down_payment_savings"] * 0.35 + df["property_spending"] * 0.3
        df["home_target"] = (home_score + np.random.uniform(-0.1, 0.1, n_samples) > 0.5).astype(int)

        # Auto: dealer_payments + vehicle_expenses + insurance
        auto_score = df["dealer_payments"] * 0.4 + df["vehicle_expenses"] * 0.35 + df["insurance"] * 0.25
        df["auto_target"] = (auto_score + np.random.uniform(-0.1, 0.1, n_samples) > 0.5).astype(int)

        # Mortgage: property_ownership + high_value_secured
        mortgage_score = df["property_ownership"] * 0.5 + df["high_value_secured"] * 0.5
        df["mortgage_target"] = (mortgage_score + np.random.uniform(-0.1, 0.1, n_samples) > 0.45).astype(int)

        return df

    def train(self) -> "IntentPredictor":
        """Fit 4 RF models on synthetic data."""
        df = self._generate_synthetic()
        for loan_type, features in INTENT_FEATURES.items():
            X = df[features]
            y = df[f"{loan_type}_target"]
            clf = RandomForestClassifier(
                n_estimators=self.n_estimators,
                max_depth=self.max_depth,
                random_state=self.random_state,
            )
            clf.fit(X, y)
            self.models[loan_type] = clf
        return self

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """Return DataFrame with intent scores (0-1) for each loan type."""
        scores = {}
        for loan_type, features in INTENT_FEATURES.items():
            model = self.models[loan_type]
            if model is None:
                raise RuntimeError(f"Model for {loan_type} not trained. Call train() first.")
            # ponytail: use probability of class 1 as intent score
            scores[f"{loan_type}_score"] = model.predict_proba(df[features])[:, 1]
        return pd.DataFrame(scores, index=df.index)

    def explain(self, df: pd.DataFrame) -> pd.DataFrame:
        """Top 3 contributing features per prediction (feature importances × value)."""
        explanations = []
        for idx in df.index:
            row = df.loc[idx] if isinstance(df, pd.DataFrame) else df.iloc[idx]
            row_explanation = {}
            for loan_type, features in INTENT_FEATURES.items():
                model = self.models[loan_type]
                if model is None:
                    raise RuntimeError(f"Model for {loan_type} not trained. Call train() first.")
                importances = model.feature_importances_
                # Contribution = importance × feature_value (normalized)
                contributions = {
                    f: imp * row[f] for f, imp in zip(features, importances)
                }
                top3 = sorted(contributions.items(), key=lambda x: x[1], reverse=True)[:3]
                row_explanation[f"{loan_type}_top3"] = [f for f, _ in top3]
            explanations.append(row_explanation)
        return pd.DataFrame(explanations)


def _demo():
    """Self-check: train, predict, explain."""
    predictor = IntentPredictor(n_estimators=30, max_depth=4).train()
    # Sample input with all features
    sample = pd.DataFrame({
        f: [np.random.uniform(0, 1)] for f in ALL_FEATURES
    })
    scores = predictor.predict(sample)
    explanations = predictor.explain(sample)

    print("=== Intent Scores ===")
    print(scores)
    print("\n=== Top 3 Features per Intent ===")
    print(explanations)

    # Assertions
    for loan_type in INTENT_FEATURES:
        score_col = f"{loan_type}_score"
        assert score_col in scores.columns, f"Missing {score_col}"
        assert 0.0 <= scores[score_col].iloc[0] <= 1.0, f"{score_col} out of range"

    assert f"personal_top3" in explanations.columns, "Missing personal_top3"
    print("\nSelf-check passed. 4 models trained and predicting.")


if __name__ == "__main__":
    _demo()

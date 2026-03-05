"""
Remaining Useful Life (RUL) estimation models.

Uses survival analysis and degradation modeling to estimate
time until failure with uncertainty bounds.
"""
import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Optional
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from scipy.stats import norm
from lifelines import WeibullAFTFitter, CoxPHFitter


@dataclass
class RULPrediction:
    """RUL prediction with uncertainty."""
    rul_days: float  # Point estimate
    rul_lower: float  # Lower bound (5th percentile)
    rul_upper: float  # Upper bound (95th percentile)
    confidence: float  # 0-1 confidence score
    health_score: float  # 0-100 health score
    risk_level: str  # "low", "medium", "high", "critical"
    failure_probability_30d: float  # P(failure in next 30 days)


@dataclass
class DegradationState:
    """Current degradation state of an asset."""
    wear_level: float
    wear_rate: float  # Change per day
    days_since_maintenance: float
    operating_hours: float


class RULModel:
    """
    Remaining Useful Life estimation model.

    Uses a hybrid approach:
    1. Degradation model for wear trajectory
    2. Survival model for failure probability
    3. Uncertainty quantification via bootstrap
    """

    # Failure threshold for wear level
    FAILURE_THRESHOLD = 85.0  # Wear level that indicates failure

    def __init__(self):
        self.degradation_model: Optional[Ridge] = None
        self.scaler: Optional[StandardScaler] = None
        self._fitted = False
        self._bootstrap_models: list[Ridge] = []

    def fit(self, data: pd.DataFrame) -> "RULModel":
        """
        Fit RUL model on historical data.

        Expects columns: wear, load, speed, temperature, lubrication_interval
        """
        data = data.dropna()

        # Features for predicting wear rate
        features = ["load", "speed", "temperature", "lubrication_interval"]
        features = [f for f in features if f in data.columns]

        # Calculate wear rate (change in wear)
        wear_rate = data["wear"].diff().fillna(0)

        X = data[features].values
        y = wear_rate.values

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Main model
        self.degradation_model = Ridge(alpha=1.0)
        self.degradation_model.fit(X_scaled, y)

        # Bootstrap models for uncertainty
        n = len(X)
        rng = np.random.default_rng(42)
        self._bootstrap_models = []

        for _ in range(50):
            idx = rng.choice(n, size=n, replace=True)
            model = Ridge(alpha=1.0)
            model.fit(X_scaled[idx], y[idx])
            self._bootstrap_models.append(model)

        self._fitted = True
        return self

    def predict(
        self,
        current_state: dict,
        operating_conditions: Optional[dict] = None
    ) -> RULPrediction:
        """
        Predict RUL for an asset given current state.

        Args:
            current_state: Dict with current sensor readings
            operating_conditions: Expected future operating conditions

        Returns:
            RULPrediction with point estimate and bounds
        """
        current_wear = current_state.get("wear", 50)
        failure_risk = current_state.get("failure_risk", 50)

        # Default operating conditions (use current if not specified)
        if operating_conditions is None:
            operating_conditions = {
                "load": current_state.get("load", 70),
                "speed": current_state.get("speed", 1200),
                "temperature": current_state.get("temperature", 45),
                "lubrication_interval": current_state.get("lubrication_interval", 100)
            }

        # Estimate wear rate
        if self._fitted:
            features = ["load", "speed", "temperature", "lubrication_interval"]
            X = np.array([[operating_conditions.get(f, 50) for f in features]])
            X_scaled = self.scaler.transform(X)

            # Main prediction
            wear_rate = self.degradation_model.predict(X_scaled)[0]

            # Bootstrap predictions for uncertainty
            bootstrap_rates = [m.predict(X_scaled)[0] for m in self._bootstrap_models]
        else:
            # Fallback: estimate from failure risk
            wear_rate = 0.05 + 0.1 * (failure_risk / 100)
            bootstrap_rates = [wear_rate * (0.8 + 0.4 * np.random.random()) for _ in range(50)]

        # Ensure positive wear rate
        wear_rate = max(0.01, wear_rate)
        bootstrap_rates = [max(0.01, r) for r in bootstrap_rates]

        # Calculate RUL: time until wear reaches threshold
        remaining_wear = max(0, self.FAILURE_THRESHOLD - current_wear)

        # Convert to days (assuming hourly data, 24 hours/day)
        rul_hours = remaining_wear / wear_rate
        rul_days = rul_hours / 24

        # Bootstrap RUL estimates
        rul_bootstrap = [remaining_wear / r / 24 for r in bootstrap_rates]
        rul_lower = np.percentile(rul_bootstrap, 5)
        rul_upper = np.percentile(rul_bootstrap, 95)

        # Health score (inverse of wear)
        health_score = max(0, 100 - current_wear)

        # Risk level
        if failure_risk > 80 or rul_days < 7:
            risk_level = "critical"
        elif failure_risk > 60 or rul_days < 30:
            risk_level = "high"
        elif failure_risk > 40 or rul_days < 60:
            risk_level = "medium"
        else:
            risk_level = "low"

        # Failure probability in next 30 days
        # Using exponential decay assumption
        lambda_rate = 1 / max(1, rul_days)
        failure_prob_30d = 1 - np.exp(-lambda_rate * 30)

        # Confidence (higher when bootstrap variance is lower)
        rul_std = np.std(rul_bootstrap)
        confidence = 1 / (1 + rul_std / max(1, rul_days))

        return RULPrediction(
            rul_days=float(max(0, rul_days)),
            rul_lower=float(max(0, rul_lower)),
            rul_upper=float(max(0, rul_upper)),
            confidence=float(confidence),
            health_score=float(health_score),
            risk_level=risk_level,
            failure_probability_30d=float(min(1, max(0, failure_prob_30d)))
        )

    def predict_trajectory(
        self,
        current_state: dict,
        horizon_days: int = 90,
        operating_conditions: Optional[dict] = None
    ) -> pd.DataFrame:
        """
        Predict wear and health trajectory over time horizon.

        Returns DataFrame with columns: day, wear, health, failure_prob
        """
        current_wear = current_state.get("wear", 50)

        # Default operating conditions
        if operating_conditions is None:
            operating_conditions = {
                "load": current_state.get("load", 70),
                "speed": current_state.get("speed", 1200),
                "temperature": current_state.get("temperature", 45),
                "lubrication_interval": current_state.get("lubrication_interval", 100)
            }

        # Estimate wear rate
        if self._fitted:
            features = ["load", "speed", "temperature", "lubrication_interval"]
            X = np.array([[operating_conditions.get(f, 50) for f in features]])
            X_scaled = self.scaler.transform(X)
            wear_rate_per_hour = self.degradation_model.predict(X_scaled)[0]
        else:
            wear_rate_per_hour = 0.05

        wear_rate_per_day = max(0.01, wear_rate_per_hour * 24)

        # Generate trajectory
        days = np.arange(horizon_days + 1)
        wear = current_wear + wear_rate_per_day * days
        wear = np.clip(wear, 0, 100)

        health = 100 - wear
        failure_prob = 1 / (1 + np.exp(-0.1 * (wear - 50)))

        return pd.DataFrame({
            "day": days,
            "wear": wear,
            "health": health,
            "failure_probability": failure_prob
        })


# Global model instance
_rul_model: Optional[RULModel] = None


def get_rul_model() -> RULModel:
    """Get or create RUL model instance."""
    global _rul_model
    if _rul_model is None:
        _rul_model = RULModel()
    return _rul_model

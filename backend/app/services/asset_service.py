"""
Asset service for managing asset data and predictions.
"""
import numpy as np
import pandas as pd
from typing import Optional
from datetime import datetime

from ..core.simulation import get_simulation, SimulationResult, Asset
from ..models.causal import CausalModel
from ..models.rul import RULModel, get_rul_model
from .feature_service import extract_features, SignalFeatures


class AssetService:
    """Service for asset data and predictions."""

    def __init__(self):
        self._simulation: Optional[SimulationResult] = None
        self._causal_model: Optional[CausalModel] = None
        self._rul_model: Optional[RULModel] = None
        self._features_cache: dict[str, list[SignalFeatures]] = {}

    @property
    def simulation(self) -> SimulationResult:
        """Get or create simulation."""
        if self._simulation is None:
            self._simulation = get_simulation()
        return self._simulation

    @property
    def causal_model(self) -> CausalModel:
        """Get or create causal model."""
        if self._causal_model is None:
            self._causal_model = CausalModel()
            # Fit on all data
            all_data = pd.concat(self.simulation.timeseries.values())
            self._causal_model.fit(all_data)
        return self._causal_model

    @property
    def rul_model(self) -> RULModel:
        """Get or create RUL model."""
        if self._rul_model is None:
            self._rul_model = get_rul_model()
            # Fit on all data
            all_data = pd.concat(self.simulation.timeseries.values())
            self._rul_model.fit(all_data)
        return self._rul_model

    def get_all_assets(self) -> list[dict]:
        """Get all assets with health summaries."""
        assets = []

        for asset in self.simulation.assets:
            ts = self.simulation.timeseries[asset.id]
            latest = ts.iloc[-1]

            # Get RUL prediction
            rul = self.rul_model.predict(latest.to_dict())

            assets.append({
                "id": asset.id,
                "name": asset.name,
                "asset_type": asset.asset_type,
                "location": asset.location,
                "criticality": asset.criticality,
                "install_date": asset.install_date,
                "health_score": rul.health_score,
                "risk_level": rul.risk_level,
                "rul_days": rul.rul_days,
                "last_reading": ts["timestamp"].iloc[-1].isoformat()
            })

        return assets

    def get_asset(self, asset_id: str) -> Optional[dict]:
        """Get single asset by ID."""
        assets = self.get_all_assets()
        for asset in assets:
            if asset["id"] == asset_id:
                return asset
        return None

    def get_timeseries(
        self,
        asset_id: str,
        start_idx: Optional[int] = None,
        end_idx: Optional[int] = None
    ) -> Optional[dict]:
        """Get timeseries data for an asset."""
        if asset_id not in self.simulation.timeseries:
            return None

        ts = self.simulation.timeseries[asset_id]

        if start_idx is not None:
            ts = ts.iloc[start_idx:]
        if end_idx is not None:
            ts = ts.iloc[:end_idx]

        # Convert to dict, handling NaN values
        data = ts.to_dict(orient="records")
        for row in data:
            row["timestamp"] = row["timestamp"].isoformat()
            for key, value in row.items():
                if isinstance(value, float) and np.isnan(value):
                    row[key] = None

        return {
            "asset_id": asset_id,
            "data": data,
            "start_time": ts["timestamp"].iloc[0].isoformat(),
            "end_time": ts["timestamp"].iloc[-1].isoformat(),
            "count": len(ts)
        }

    def get_features(
        self,
        asset_id: str,
        timestep: Optional[int] = None
    ) -> Optional[dict]:
        """Get extracted features for an asset."""
        if asset_id not in self.simulation.waveforms:
            return None

        waveforms = self.simulation.waveforms[asset_id]
        ts = self.simulation.timeseries[asset_id]

        if timestep is not None:
            # Single timestep
            if timestep >= len(waveforms):
                return None

            features = extract_features(waveforms[timestep])
            return {
                "asset_id": asset_id,
                "timestamp": ts["timestamp"].iloc[timestep].isoformat(),
                "rms": features.rms,
                "peak": features.peak,
                "crest_factor": features.crest_factor,
                "kurtosis": features.kurtosis,
                "skewness": features.skewness,
                "spectral_centroid": features.spectral_centroid,
                "spectral_spread": features.spectral_spread,
                "bandpowers": features.bandpowers
            }
        else:
            # All timesteps (cached)
            if asset_id not in self._features_cache:
                self._features_cache[asset_id] = [
                    extract_features(wf) for wf in waveforms
                ]

            features_list = self._features_cache[asset_id]
            return {
                "asset_id": asset_id,
                "timestamps": [t.isoformat() for t in ts["timestamp"]],
                "features": [
                    {
                        "rms": f.rms,
                        "peak": f.peak,
                        "crest_factor": f.crest_factor,
                        "kurtosis": f.kurtosis,
                        "skewness": f.skewness,
                        "spectral_centroid": f.spectral_centroid,
                        "spectral_spread": f.spectral_spread,
                        "bandpowers": f.bandpowers
                    }
                    for f in features_list
                ]
            }

    def get_fft(self, asset_id: str, timestep: int = -1) -> Optional[dict]:
        """Get FFT spectrum for a specific timestep."""
        if asset_id not in self.simulation.waveforms:
            return None

        waveforms = self.simulation.waveforms[asset_id]
        ts = self.simulation.timeseries[asset_id]

        # Handle negative indexing
        if timestep < 0:
            timestep = len(waveforms) + timestep

        if timestep < 0 or timestep >= len(waveforms):
            return None

        features = extract_features(waveforms[timestep])

        # Find dominant frequency
        if len(features.fft_magnitude) > 0:
            max_idx = np.argmax(features.fft_magnitude[1:]) + 1  # Skip DC
            dominant_freq = features.fft_frequencies[max_idx]
            total_power = np.sum(features.fft_magnitude ** 2)
        else:
            dominant_freq = 0.0
            total_power = 0.0

        return {
            "asset_id": asset_id,
            "timestamp": ts["timestamp"].iloc[timestep].isoformat(),
            "frequencies": features.fft_frequencies.tolist(),
            "magnitudes": features.fft_magnitude.tolist(),
            "dominant_frequency": float(dominant_freq),
            "total_power": float(total_power)
        }

    def get_rul(self, asset_id: str) -> Optional[dict]:
        """Get RUL prediction for an asset."""
        if asset_id not in self.simulation.timeseries:
            return None

        ts = self.simulation.timeseries[asset_id]
        latest = ts.iloc[-1]

        rul = self.rul_model.predict(latest.to_dict())

        return {
            "asset_id": asset_id,
            "rul_days": rul.rul_days,
            "rul_lower": rul.rul_lower,
            "rul_upper": rul.rul_upper,
            "confidence": rul.confidence,
            "health_score": rul.health_score,
            "risk_level": rul.risk_level,
            "failure_probability_30d": rul.failure_probability_30d
        }

    def get_trajectory(
        self,
        asset_id: str,
        horizon_days: int = 90
    ) -> Optional[dict]:
        """Get health trajectory prediction."""
        if asset_id not in self.simulation.timeseries:
            return None

        ts = self.simulation.timeseries[asset_id]
        latest = ts.iloc[-1]

        trajectory = self.rul_model.predict_trajectory(
            latest.to_dict(),
            horizon_days=horizon_days
        )

        return {
            "asset_id": asset_id,
            "current_health": 100 - latest["wear"],
            "trajectory": trajectory.to_dict(orient="records")
        }

    def get_causal_effects(self, asset_id: str) -> Optional[dict]:
        """Get causal effects analysis for an asset."""
        if asset_id not in self.simulation.timeseries:
            return None

        ts = self.simulation.timeseries[asset_id]

        # Get effects
        effects = self.causal_model.get_all_effects(ts)
        drivers = self.causal_model.get_drivers(ts)
        graph = self.causal_model.get_causal_graph()

        # Format effects
        formatted_effects = []
        for e in effects:
            formatted_effects.append({
                "treatment": e.treatment,
                "outcome": e.outcome,
                "effect": e.effect,
                "std_error": e.std_error,
                "confidence_interval": e.confidence_interval,
                "direction": "increases" if e.effect > 0 else "decreases",
                "significance": "high" if abs(e.effect) > e.std_error * 2 else "medium"
            })

        # Format graph
        node_types = {
            "load": "treatment",
            "speed": "treatment",
            "lubrication_interval": "treatment",
            "vibration_level": "mediator",
            "temperature": "mediator",
            "ambient_temp": "exogenous",
            "wear": "mediator",
            "failure_risk": "outcome"
        }

        formatted_graph = {
            "nodes": [
                {"id": n, "label": n.replace("_", " ").title(), "type": node_types.get(n, "mediator")}
                for n in graph.nodes
            ],
            "edges": [
                {"source": s, "target": t, "weight": None}
                for s, t in graph.edges
            ]
        }

        return {
            "asset_id": asset_id,
            "effects": formatted_effects,
            "top_drivers": drivers[:5],
            "graph": formatted_graph
        }

    def predict_counterfactual(
        self,
        asset_id: str,
        interventions: dict[str, float],
        horizon_days: int = 30
    ) -> Optional[dict]:
        """Predict outcomes under counterfactual interventions."""
        if asset_id not in self.simulation.timeseries:
            return None

        ts = self.simulation.timeseries[asset_id]
        latest = ts.iloc[-1].to_dict()

        # Get original RUL
        original_rul = self.rul_model.predict(latest)

        # Get counterfactual prediction
        cf_data = self.causal_model.predict_counterfactual(
            ts.tail(100),  # Use recent data
            interventions
        )

        cf_latest = cf_data.iloc[-1].to_dict()
        cf_rul = self.rul_model.predict(cf_latest)

        # Calculate changes
        rul_change = cf_rul.rul_days - original_rul.rul_days
        rul_change_pct = (rul_change / original_rul.rul_days * 100) if original_rul.rul_days > 0 else 0

        # Generate recommendations
        recommendations = []
        if interventions.get("load", latest["load"]) < latest["load"]:
            recommendations.append("Reducing load can extend equipment life")
        if interventions.get("speed", latest["speed"]) < latest["speed"]:
            recommendations.append("Lower operating speed reduces vibration-induced wear")
        if interventions.get("lubrication_interval", 100) < latest.get("lubrication_interval", 100):
            recommendations.append("More frequent lubrication reduces heat and wear")

        if rul_change > 0:
            recommendations.append(f"This intervention could extend RUL by {rul_change:.1f} days")
        elif rul_change < 0:
            recommendations.append(f"Warning: This intervention may reduce RUL by {abs(rul_change):.1f} days")

        return {
            "asset_id": asset_id,
            "interventions": interventions,
            "original_rul": original_rul.rul_days,
            "counterfactual_rul": cf_rul.rul_days,
            "rul_change": rul_change,
            "rul_change_percent": rul_change_pct,
            "original_risk": original_rul.failure_probability_30d * 100,
            "counterfactual_risk": cf_rul.failure_probability_30d * 100,
            "recommendations": recommendations
        }


# Global service instance
_asset_service: Optional[AssetService] = None


def get_asset_service() -> AssetService:
    """Get or create asset service instance."""
    global _asset_service
    if _asset_service is None:
        _asset_service = AssetService()
    return _asset_service

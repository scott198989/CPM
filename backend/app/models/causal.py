"""
Causal inference models for predictive maintenance.

Implements causal effect estimation using linear models and
counterfactual prediction.
"""
import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Optional
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler
import networkx as nx


@dataclass
class CausalEffect:
    """Represents a causal effect estimate."""
    treatment: str
    outcome: str
    effect: float
    std_error: float
    confidence_interval: tuple[float, float]
    p_value: float


@dataclass
class CausalGraph:
    """Represents the causal structure."""
    nodes: list[str]
    edges: list[tuple[str, str]]


class CausalModel:
    """
    Causal inference model for estimating treatment effects.

    Uses the known causal DAG:
        Load ──┬──→ Vibration ──→ Heat ──┬──→ Wear ──→ Failure_Risk
        Speed ─┘                         │
                            Lubrication ─┘
    """

    # Define the causal graph
    CAUSAL_EDGES = [
        ("load", "vibration_level"),
        ("speed", "vibration_level"),
        ("vibration_level", "temperature"),
        ("ambient_temp", "temperature"),
        ("temperature", "wear"),
        ("lubrication_interval", "wear"),
        ("wear", "failure_risk"),
    ]

    TREATMENT_VARS = ["load", "speed", "lubrication_interval"]
    OUTCOME_VARS = ["vibration_level", "temperature", "wear", "failure_risk"]

    def __init__(self):
        self.graph = self._build_graph()
        self.models: dict[str, LinearRegression] = {}
        self.scalers: dict[str, StandardScaler] = {}
        self._fitted = False

    def _build_graph(self) -> nx.DiGraph:
        """Build NetworkX directed graph from edges."""
        G = nx.DiGraph()
        G.add_edges_from(self.CAUSAL_EDGES)
        return G

    def get_causal_graph(self) -> CausalGraph:
        """Get causal graph structure."""
        return CausalGraph(
            nodes=list(self.graph.nodes()),
            edges=list(self.graph.edges())
        )

    def fit(self, data: pd.DataFrame) -> "CausalModel":
        """
        Fit causal models for each variable.

        Uses backdoor adjustment with linear regression.
        """
        # Clean data
        data = data.dropna()

        # Fit a model for each endogenous variable
        for node in self.graph.nodes():
            parents = list(self.graph.predecessors(node))
            if not parents:
                continue

            # Get parent values
            X = data[parents].values
            y = data[node].values

            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            # Fit ridge regression (more stable than OLS)
            model = Ridge(alpha=1.0)
            model.fit(X_scaled, y)

            self.models[node] = model
            self.scalers[node] = scaler

        self._fitted = True
        return self

    def estimate_effect(
        self,
        data: pd.DataFrame,
        treatment: str,
        outcome: str
    ) -> CausalEffect:
        """
        Estimate causal effect of treatment on outcome.

        Uses backdoor adjustment following the causal graph.
        """
        if not self._fitted:
            self.fit(data)

        data = data.dropna()

        # Find adjustment set (parents of treatment minus outcome)
        # Using simplified backdoor criterion
        adjustment_vars = []
        for node in self.graph.nodes():
            if node != treatment and node != outcome:
                # Check if it's a confounder (has path to both treatment and outcome)
                if nx.has_path(self.graph, node, treatment) or \
                   any(nx.has_path(self.graph, node, t) for t in self.graph.predecessors(treatment)):
                    adjustment_vars.append(node)

        # Build regression model: outcome ~ treatment + adjustment_vars
        predictors = [treatment] + [v for v in adjustment_vars if v in data.columns]
        predictors = list(set(predictors))  # Remove duplicates

        X = data[predictors].values
        y = data[outcome].values

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = Ridge(alpha=1.0)
        model.fit(X_scaled, y)

        # Get coefficient for treatment
        treatment_idx = predictors.index(treatment)
        effect = model.coef_[treatment_idx]

        # Estimate standard error using bootstrap
        n_bootstrap = 100
        effects = []
        n = len(data)

        rng = np.random.default_rng(42)
        for _ in range(n_bootstrap):
            idx = rng.choice(n, size=n, replace=True)
            X_boot = X_scaled[idx]
            y_boot = y[idx]

            model_boot = Ridge(alpha=1.0)
            model_boot.fit(X_boot, y_boot)
            effects.append(model_boot.coef_[treatment_idx])

        std_error = np.std(effects)
        ci_low = np.percentile(effects, 2.5)
        ci_high = np.percentile(effects, 97.5)

        # Approximate p-value
        t_stat = effect / (std_error + 1e-10)
        p_value = 2 * (1 - min(0.9999, abs(t_stat) / 10))  # Simplified

        return CausalEffect(
            treatment=treatment,
            outcome=outcome,
            effect=float(effect),
            std_error=float(std_error),
            confidence_interval=(float(ci_low), float(ci_high)),
            p_value=float(p_value)
        )

    def get_all_effects(self, data: pd.DataFrame) -> list[CausalEffect]:
        """Estimate all direct causal effects."""
        effects = []

        for source, target in self.CAUSAL_EDGES:
            if source in data.columns and target in data.columns:
                effect = self.estimate_effect(data, source, target)
                effects.append(effect)

        return effects

    def predict_counterfactual(
        self,
        data: pd.DataFrame,
        interventions: dict[str, float]
    ) -> pd.DataFrame:
        """
        Predict outcomes under counterfactual interventions.

        Args:
            data: Original data
            interventions: Dict of {variable: new_value}

        Returns:
            DataFrame with predicted outcomes under intervention
        """
        if not self._fitted:
            self.fit(data)

        # Create copy of data with interventions
        cf_data = data.copy()

        for var, value in interventions.items():
            cf_data[var] = value

        # Propagate through causal graph in topological order
        for node in nx.topological_sort(self.graph):
            if node in interventions:
                continue  # Intervened variable is fixed

            parents = list(self.graph.predecessors(node))
            if not parents or node not in self.models:
                continue

            # Predict using parent values
            X = cf_data[parents].values
            X_scaled = self.scalers[node].transform(X)
            cf_data[node] = self.models[node].predict(X_scaled)

        return cf_data

    def get_drivers(
        self,
        data: pd.DataFrame,
        target: str = "failure_risk"
    ) -> list[dict]:
        """
        Get ranked list of causal drivers for a target variable.
        """
        drivers = []

        # Find all ancestors of target
        ancestors = nx.ancestors(self.graph, target)

        for var in ancestors:
            if var in self.TREATMENT_VARS:
                effect = self.estimate_effect(data, var, target)
                drivers.append({
                    "variable": var,
                    "effect": effect.effect,
                    "direction": "increases" if effect.effect > 0 else "decreases",
                    "significance": "high" if abs(effect.effect) > effect.std_error * 2 else "medium"
                })

        # Sort by absolute effect
        drivers.sort(key=lambda x: abs(x["effect"]), reverse=True)
        return drivers

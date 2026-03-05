"""Pydantic schemas for API request/response models."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# === Asset Schemas ===

class AssetBase(BaseModel):
    """Base asset information."""
    id: str
    name: str
    asset_type: str
    location: str
    criticality: str
    install_date: str


class AssetSummary(AssetBase):
    """Asset with health summary."""
    health_score: float = Field(ge=0, le=100)
    risk_level: str
    rul_days: float
    last_reading: Optional[datetime] = None


class AssetList(BaseModel):
    """List of assets."""
    assets: list[AssetSummary]
    total: int


# === Timeseries Schemas ===

class TimeseriesPoint(BaseModel):
    """Single timeseries data point."""
    timestamp: datetime
    load: float
    speed: float
    vibration_level: float
    temperature: Optional[float]
    current: float
    ambient_temp: float
    wear: float
    failure_risk: float


class TimeseriesResponse(BaseModel):
    """Timeseries data response."""
    asset_id: str
    data: list[dict]
    start_time: datetime
    end_time: datetime
    count: int


# === Feature Schemas ===

class SignalFeatures(BaseModel):
    """Extracted signal features."""
    rms: float
    peak: float
    crest_factor: float
    kurtosis: float
    skewness: float
    spectral_centroid: float
    spectral_spread: float
    bandpowers: dict[str, float]


class FeatureTimeseries(BaseModel):
    """Feature data over time."""
    asset_id: str
    timestamps: list[datetime]
    features: list[SignalFeatures]


class FFTResponse(BaseModel):
    """FFT spectrum response."""
    asset_id: str
    timestamp: datetime
    frequencies: list[float]
    magnitudes: list[float]
    dominant_frequency: float
    total_power: float


# === RUL Schemas ===

class RULResponse(BaseModel):
    """RUL prediction response."""
    asset_id: str
    rul_days: float
    rul_lower: float
    rul_upper: float
    confidence: float
    health_score: float
    risk_level: str
    failure_probability_30d: float


class TrajectoryPoint(BaseModel):
    """Single point in health trajectory."""
    day: int
    wear: float
    health: float
    failure_probability: float


class TrajectoryResponse(BaseModel):
    """Health trajectory response."""
    asset_id: str
    current_health: float
    trajectory: list[TrajectoryPoint]


# === Causal Schemas ===

class CausalEffect(BaseModel):
    """Single causal effect."""
    treatment: str
    outcome: str
    effect: float
    std_error: float
    confidence_interval: tuple[float, float]
    direction: str
    significance: str


class CausalGraphNode(BaseModel):
    """Node in causal graph."""
    id: str
    label: str
    type: str  # "treatment", "mediator", "outcome"


class CausalGraphEdge(BaseModel):
    """Edge in causal graph."""
    source: str
    target: str
    weight: Optional[float] = None


class CausalGraphResponse(BaseModel):
    """Causal graph structure."""
    nodes: list[CausalGraphNode]
    edges: list[CausalGraphEdge]


class CausalEffectsResponse(BaseModel):
    """Causal effects response."""
    asset_id: str
    effects: list[CausalEffect]
    top_drivers: list[dict]
    graph: CausalGraphResponse


# === Counterfactual Schemas ===

class CounterfactualRequest(BaseModel):
    """Request for counterfactual prediction."""
    interventions: dict[str, float] = Field(
        ...,
        description="Variable interventions, e.g., {'load': 50, 'speed': 1000}"
    )
    horizon_days: int = Field(default=30, ge=1, le=365)


class CounterfactualResponse(BaseModel):
    """Counterfactual prediction response."""
    asset_id: str
    interventions: dict[str, float]
    original_rul: float
    counterfactual_rul: float
    rul_change: float
    rul_change_percent: float
    original_risk: float
    counterfactual_risk: float
    recommendations: list[str]


# === Export Schemas ===

class ExportRequest(BaseModel):
    """Request for data export."""
    format: str = Field(default="csv", pattern="^(csv|json)$")
    include_features: bool = True
    include_predictions: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

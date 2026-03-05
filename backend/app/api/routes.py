"""FastAPI routes for CPM API."""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from .schemas import (
    AssetList,
    TimeseriesResponse,
    RULResponse,
    TrajectoryResponse,
    CausalEffectsResponse,
    CounterfactualRequest,
    CounterfactualResponse,
    FFTResponse,
)
from ..services.asset_service import get_asset_service

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "CPM API"}


@router.get("/assets", response_model=AssetList)
async def list_assets():
    """Get all assets with health summaries."""
    service = get_asset_service()
    assets = service.get_all_assets()
    return {"assets": assets, "total": len(assets)}


@router.get("/assets/{asset_id}")
async def get_asset(asset_id: str):
    """Get single asset details."""
    service = get_asset_service()
    asset = service.get_asset(asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return asset


@router.get("/assets/{asset_id}/timeseries")
async def get_timeseries(
    asset_id: str,
    start: Optional[int] = Query(None, description="Start index"),
    end: Optional[int] = Query(None, description="End index"),
    limit: Optional[int] = Query(None, description="Limit number of points"),
):
    """Get timeseries data for an asset."""
    service = get_asset_service()

    # Handle limit parameter
    if limit is not None and end is None:
        end = (start or 0) + limit

    result = service.get_timeseries(asset_id, start, end)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return result


@router.get("/assets/{asset_id}/features")
async def get_features(
    asset_id: str,
    timestep: Optional[int] = Query(None, description="Specific timestep (default: all)")
):
    """Get extracted features for an asset."""
    service = get_asset_service()
    result = service.get_features(asset_id, timestep)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return result


@router.get("/assets/{asset_id}/fft", response_model=FFTResponse)
async def get_fft(
    asset_id: str,
    timestep: int = Query(-1, description="Timestep index (-1 for latest)")
):
    """Get FFT spectrum for a specific timestep."""
    service = get_asset_service()
    result = service.get_fft(asset_id, timestep)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found or invalid timestep")
    return result


@router.get("/assets/{asset_id}/rul", response_model=RULResponse)
async def get_rul(asset_id: str):
    """Get RUL prediction for an asset."""
    service = get_asset_service()
    result = service.get_rul(asset_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return result


@router.get("/assets/{asset_id}/trajectory", response_model=TrajectoryResponse)
async def get_trajectory(
    asset_id: str,
    horizon: int = Query(90, ge=1, le=365, description="Prediction horizon in days")
):
    """Get health trajectory prediction."""
    service = get_asset_service()
    result = service.get_trajectory(asset_id, horizon)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return result


@router.get("/assets/{asset_id}/causal")
async def get_causal_effects(asset_id: str):
    """Get causal effects analysis for an asset."""
    service = get_asset_service()
    result = service.get_causal_effects(asset_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return result


@router.post("/assets/{asset_id}/counterfactual", response_model=CounterfactualResponse)
async def predict_counterfactual(asset_id: str, request: CounterfactualRequest):
    """
    Predict outcomes under counterfactual interventions.

    Example interventions:
    - {"load": 50} - What if we reduced load to 50%?
    - {"speed": 1000, "lubrication_interval": 50} - What if we reduced speed and increased lubrication?
    """
    service = get_asset_service()
    result = service.predict_counterfactual(
        asset_id,
        request.interventions,
        request.horizon_days
    )
    if result is None:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return result


@router.get("/stats")
async def get_stats():
    """Get overall system statistics."""
    service = get_asset_service()
    assets = service.get_all_assets()

    # Calculate stats
    total = len(assets)
    critical = sum(1 for a in assets if a["risk_level"] == "critical")
    high_risk = sum(1 for a in assets if a["risk_level"] == "high")
    medium_risk = sum(1 for a in assets if a["risk_level"] == "medium")
    low_risk = sum(1 for a in assets if a["risk_level"] == "low")

    avg_health = sum(a["health_score"] for a in assets) / total if total > 0 else 0
    avg_rul = sum(a["rul_days"] for a in assets) / total if total > 0 else 0

    return {
        "total_assets": total,
        "by_risk_level": {
            "critical": critical,
            "high": high_risk,
            "medium": medium_risk,
            "low": low_risk
        },
        "average_health_score": round(avg_health, 1),
        "average_rul_days": round(avg_rul, 1),
        "assets_needing_attention": critical + high_risk
    }


@router.get("/causal-graph")
async def get_causal_graph():
    """Get the causal DAG structure."""
    service = get_asset_service()
    graph = service.causal_model.get_causal_graph()

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

    return {
        "nodes": [
            {"id": n, "label": n.replace("_", " ").title(), "type": node_types.get(n, "mediator")}
            for n in graph.nodes
        ],
        "edges": [
            {"source": s, "target": t}
            for s, t in graph.edges
        ]
    }

"""Tests for CPM API endpoints."""
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_root():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data


def test_health():
    """Test health check endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_list_assets():
    """Test listing all assets."""
    response = client.get("/api/assets")
    assert response.status_code == 200
    data = response.json()
    assert "assets" in data
    assert "total" in data
    assert data["total"] > 0
    assert len(data["assets"]) == data["total"]


def test_get_asset():
    """Test getting a single asset."""
    # First get the list
    response = client.get("/api/assets")
    assets = response.json()["assets"]
    asset_id = assets[0]["id"]

    # Get single asset
    response = client.get(f"/api/assets/{asset_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == asset_id
    assert "health_score" in data
    assert "risk_level" in data


def test_get_asset_not_found():
    """Test getting non-existent asset."""
    response = client.get("/api/assets/INVALID-ID")
    assert response.status_code == 404


def test_get_timeseries():
    """Test getting timeseries data."""
    response = client.get("/api/assets")
    asset_id = response.json()["assets"][0]["id"]

    response = client.get(f"/api/assets/{asset_id}/timeseries")
    assert response.status_code == 200
    data = response.json()
    assert data["asset_id"] == asset_id
    assert "data" in data
    assert len(data["data"]) > 0


def test_get_timeseries_with_limit():
    """Test getting timeseries with limit."""
    response = client.get("/api/assets")
    asset_id = response.json()["assets"][0]["id"]

    response = client.get(f"/api/assets/{asset_id}/timeseries?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 10


def test_get_features():
    """Test getting extracted features."""
    response = client.get("/api/assets")
    asset_id = response.json()["assets"][0]["id"]

    response = client.get(f"/api/assets/{asset_id}/features?timestep=0")
    assert response.status_code == 200
    data = response.json()
    assert "rms" in data
    assert "kurtosis" in data
    assert "spectral_centroid" in data
    assert "bandpowers" in data


def test_get_fft():
    """Test getting FFT spectrum."""
    response = client.get("/api/assets")
    asset_id = response.json()["assets"][0]["id"]

    response = client.get(f"/api/assets/{asset_id}/fft")
    assert response.status_code == 200
    data = response.json()
    assert "frequencies" in data
    assert "magnitudes" in data
    assert "dominant_frequency" in data
    assert len(data["frequencies"]) == len(data["magnitudes"])


def test_get_rul():
    """Test getting RUL prediction."""
    response = client.get("/api/assets")
    asset_id = response.json()["assets"][0]["id"]

    response = client.get(f"/api/assets/{asset_id}/rul")
    assert response.status_code == 200
    data = response.json()
    assert "rul_days" in data
    assert "rul_lower" in data
    assert "rul_upper" in data
    assert "confidence" in data
    assert "health_score" in data
    assert "risk_level" in data
    assert data["rul_lower"] <= data["rul_days"] <= data["rul_upper"]


def test_get_trajectory():
    """Test getting health trajectory."""
    response = client.get("/api/assets")
    asset_id = response.json()["assets"][0]["id"]

    response = client.get(f"/api/assets/{asset_id}/trajectory?horizon=30")
    assert response.status_code == 200
    data = response.json()
    assert "trajectory" in data
    assert len(data["trajectory"]) == 31  # 0 to 30 days


def test_get_causal_effects():
    """Test getting causal effects."""
    response = client.get("/api/assets")
    asset_id = response.json()["assets"][0]["id"]

    response = client.get(f"/api/assets/{asset_id}/causal")
    assert response.status_code == 200
    data = response.json()
    assert "effects" in data
    assert "top_drivers" in data
    assert "graph" in data
    assert len(data["effects"]) > 0


def test_counterfactual():
    """Test counterfactual prediction."""
    response = client.get("/api/assets")
    asset_id = response.json()["assets"][0]["id"]

    response = client.post(
        f"/api/assets/{asset_id}/counterfactual",
        json={"interventions": {"load": 50}, "horizon_days": 30}
    )
    assert response.status_code == 200
    data = response.json()
    assert "original_rul" in data
    assert "counterfactual_rul" in data
    assert "rul_change" in data
    assert "recommendations" in data


def test_stats():
    """Test getting system stats."""
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_assets" in data
    assert "by_risk_level" in data
    assert "average_health_score" in data
    assert "average_rul_days" in data


def test_causal_graph():
    """Test getting causal graph."""
    response = client.get("/api/causal-graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

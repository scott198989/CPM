"""Configuration settings for CPM backend."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""

    # API settings
    api_title: str = "CPM - Predictive Maintenance API"
    api_version: str = "1.0.0"
    api_prefix: str = "/api"

    # CORS settings
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Simulation settings
    random_seed: int = 42
    num_assets: int = 10
    timesteps_per_asset: int = 500
    sample_rate: float = 5000.0  # Hz for vibration signals
    samples_per_waveform: int = 2048

    # Model settings
    rul_horizon_days: int = 90

    class Config:
        env_prefix = "CPM_"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

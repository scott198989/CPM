"""
CPM - Predictive Maintenance API

Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import router

settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="""
    ## Predictive Maintenance API

    This API provides endpoints for:
    - **Asset Management**: List and query industrial assets
    - **Timeseries Data**: Historical sensor readings
    - **Feature Extraction**: Vibration signal analysis (RMS, FFT, kurtosis, etc.)
    - **RUL Prediction**: Remaining Useful Life estimation with uncertainty bounds
    - **Causal Analysis**: Causal effect estimation and counterfactual predictions

    ### Causal Structure
    The system models the following causal relationships:
    - Load and Speed → Vibration
    - Vibration → Heat
    - Heat + Lubrication → Wear
    - Wear → Failure Risk
    """,
    openapi_tags=[
        {"name": "assets", "description": "Asset management and queries"},
        {"name": "predictions", "description": "RUL and health predictions"},
        {"name": "causal", "description": "Causal analysis and counterfactuals"},
    ]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix=settings.api_prefix)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": settings.api_title,
        "version": settings.api_version,
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

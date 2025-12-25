# CPM

# CPM - Predictive Maintenance System

A high-credibility predictive maintenance platform with C++ signal processing, causal inference, and a premium React dashboard.

![Dashboard Preview](docs/dashboard.png)

## Features

- **C++ Feature Extraction**: High-performance vibration signal analysis (FFT, RMS, kurtosis, bandpower, spectral centroid)
- **Causal Inference**: Understand what drives equipment failure using causal DAG modeling
- **RUL Prediction**: Remaining Useful Life estimation with uncertainty bounds
- **Counterfactual Analysis**: "What-if" scenario predictions for maintenance planning
- **3D Health Galaxy**: Interactive Three.js visualization of fleet health
- **Premium Dashboard**: Modern UI with Recharts, shadcn/ui, and Tailwind CSS

## Architecture

```
CPM/
├── cpp_feature_extractor/    # C++ signal processing module
│   ├── include/              # Headers
│   ├── src/                  # Implementation
│   ├── bindings/             # pybind11 Python bindings
│   └── tests/                # Unit tests
├── backend/                  # Python FastAPI backend
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── core/             # Config & simulation
│   │   ├── models/           # Causal & RUL models
│   │   └── services/         # Business logic
│   └── tests/                # API tests
└── frontend/                 # Next.js React frontend
    ├── app/                  # Pages (App Router)
    ├── components/           # React components
    └── lib/                  # Utilities & API client
```

## Causal Structure

The system models the following causal relationships:

```
Load ──┬──→ Vibration ──→ Heat ──┬──→ Wear ──→ Failure Risk
Speed ─┘                         │
                    Lubrication ─┘
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- CMake 3.16+ (for C++ module)
- C++20 compatible compiler

### 1. Build C++ Feature Extractor (Optional)

```bash
cd cpp_feature_extractor
mkdir build && cd build
cmake ..
cmake --build .

# Run tests
./test_features
```

### 2. Set Up Python Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run the API
python main.py
# or
uvicorn main:app --reload
```

API will be available at http://localhost:8000

### 3. Set Up Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:3000

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assets` | GET | List all assets with health summaries |
| `/api/assets/{id}` | GET | Get single asset details |
| `/api/assets/{id}/timeseries` | GET | Get sensor timeseries data |
| `/api/assets/{id}/features` | GET | Get extracted signal features |
| `/api/assets/{id}/fft` | GET | Get FFT spectrum |
| `/api/assets/{id}/rul` | GET | Get RUL prediction |
| `/api/assets/{id}/trajectory` | GET | Get health trajectory |
| `/api/assets/{id}/causal` | GET | Get causal effects analysis |
| `/api/assets/{id}/counterfactual` | POST | Predict counterfactual outcomes |
| `/api/stats` | GET | Get system statistics |
| `/api/causal-graph` | GET | Get causal DAG structure |

## Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import to Vercel
3. Set environment variable: `NEXT_PUBLIC_USE_MOCK=true`
4. Deploy

The frontend includes mock data for demo purposes when the backend is unavailable.

### Backend

Deploy to Railway, Render, or any Python hosting:

```bash
# Using Docker
docker build -t cpm-backend .
docker run -p 8000:8000 cpm-backend

# Or direct
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CPM_RANDOM_SEED` | 42 | Simulation random seed |
| `CPM_NUM_ASSETS` | 10 | Number of simulated assets |
| `CPM_TIMESTEPS_PER_ASSET` | 500 | Timesteps per asset |

### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | http://localhost:8000/api | Backend API URL |
| `NEXT_PUBLIC_USE_MOCK` | false | Use mock data (for Vercel) |

## Tech Stack

- **C++20**: Signal processing with FFT, statistical features
- **Python 3.11+**: FastAPI, NumPy, Pandas, scikit-learn, Lifelines
- **TypeScript**: Next.js 14, React 18
- **UI**: Tailwind CSS, shadcn/ui, Recharts
- **3D**: Three.js with @react-three/fiber

## Signal Features

The C++ module extracts:

| Feature | Description |
|---------|-------------|
| RMS | Root Mean Square amplitude |
| Peak | Maximum absolute value |
| Crest Factor | Peak / RMS ratio |
| Kurtosis | Impulsiveness indicator |
| Skewness | Asymmetry measure |
| Spectral Centroid | Weighted mean frequency |
| Spectral Spread | Frequency distribution width |
| Bandpower | Power in frequency bands |

## Development

### Running Tests

```bash
# C++ tests
cd cpp_feature_extractor/build && ./test_features

# Python tests
cd backend && pytest

# Frontend lint
cd frontend && npm run lint
```

### Project Structure

- `cpp_feature_extractor/`: Standalone C++ library with pybind11 bindings
- `backend/app/core/simulation.py`: Causal data simulation
- `backend/app/models/causal.py`: Causal inference with backdoor adjustment
- `backend/app/models/rul.py`: Survival/RUL modeling
- `frontend/app/`: Next.js pages
- `frontend/components/three/`: Three.js 3D visualization

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

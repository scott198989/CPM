/**
 * API client for CPM backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

// Check if we're using mock data (for Vercel deployment)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export interface Asset {
  id: string
  name: string
  asset_type: string
  location: string
  criticality: string
  install_date: string
  health_score: number
  risk_level: string
  rul_days: number
  last_reading?: string
}

export interface TimeseriesPoint {
  timestamp: string
  load: number
  speed: number
  vibration_level: number
  temperature: number | null
  current: number
  ambient_temp: number
  wear: number
  failure_risk: number
}

export interface RULPrediction {
  asset_id: string
  rul_days: number
  rul_lower: number
  rul_upper: number
  confidence: number
  health_score: number
  risk_level: string
  failure_probability_30d: number
}

export interface SignalFeatures {
  rms: number
  peak: number
  crest_factor: number
  kurtosis: number
  skewness: number
  spectral_centroid: number
  spectral_spread: number
  bandpowers: Record<string, number>
}

export interface FFTData {
  asset_id: string
  timestamp: string
  frequencies: number[]
  magnitudes: number[]
  dominant_frequency: number
  total_power: number
}

export interface CausalEffect {
  treatment: string
  outcome: string
  effect: number
  std_error: number
  confidence_interval: [number, number]
  direction: string
  significance: string
}

export interface CausalEffects {
  asset_id: string
  effects: CausalEffect[]
  top_drivers: Array<{
    variable: string
    effect: number
    direction: string
    significance: string
  }>
  graph: {
    nodes: Array<{ id: string; label: string; type: string }>
    edges: Array<{ source: string; target: string }>
  }
}

export interface CounterfactualResult {
  asset_id: string
  interventions: Record<string, number>
  original_rul: number
  counterfactual_rul: number
  rul_change: number
  rul_change_percent: number
  original_risk: number
  counterfactual_risk: number
  recommendations: string[]
}

export interface TrajectoryPoint {
  day: number
  wear: number
  health: number
  failure_probability: number
}

export interface SystemStats {
  total_assets: number
  by_risk_level: {
    critical: number
    high: number
    medium: number
    low: number
  }
  average_health_score: number
  average_rul_days: number
  assets_needing_attention: number
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error)
    throw error
  }
}

export const api = {
  // Assets
  async getAssets(): Promise<{ assets: Asset[]; total: number }> {
    return fetchAPI("/assets")
  },

  async getAsset(id: string): Promise<Asset> {
    return fetchAPI(`/assets/${id}`)
  },

  // Timeseries
  async getTimeseries(
    id: string,
    limit?: number
  ): Promise<{ asset_id: string; data: TimeseriesPoint[]; count: number }> {
    const params = limit ? `?limit=${limit}` : ""
    return fetchAPI(`/assets/${id}/timeseries${params}`)
  },

  // Features
  async getFeatures(
    id: string,
    timestep?: number
  ): Promise<SignalFeatures | { timestamps: string[]; features: SignalFeatures[] }> {
    const params = timestep !== undefined ? `?timestep=${timestep}` : ""
    return fetchAPI(`/assets/${id}/features${params}`)
  },

  async getFFT(id: string, timestep: number = -1): Promise<FFTData> {
    return fetchAPI(`/assets/${id}/fft?timestep=${timestep}`)
  },

  // Predictions
  async getRUL(id: string): Promise<RULPrediction> {
    return fetchAPI(`/assets/${id}/rul`)
  },

  async getTrajectory(
    id: string,
    horizon: number = 90
  ): Promise<{ asset_id: string; current_health: number; trajectory: TrajectoryPoint[] }> {
    return fetchAPI(`/assets/${id}/trajectory?horizon=${horizon}`)
  },

  // Causal
  async getCausalEffects(id: string): Promise<CausalEffects> {
    return fetchAPI(`/assets/${id}/causal`)
  },

  async predictCounterfactual(
    id: string,
    interventions: Record<string, number>,
    horizon: number = 30
  ): Promise<CounterfactualResult> {
    return fetchAPI(`/assets/${id}/counterfactual`, {
      method: "POST",
      body: JSON.stringify({ interventions, horizon_days: horizon }),
    })
  },

  async getCausalGraph(): Promise<{
    nodes: Array<{ id: string; label: string; type: string }>
    edges: Array<{ source: string; target: string }>
  }> {
    return fetchAPI("/causal-graph")
  },

  // Stats
  async getStats(): Promise<SystemStats> {
    return fetchAPI("/stats")
  },
}

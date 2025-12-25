/**
 * Mock data for Vercel deployment (when backend is not available)
 */

import type { Asset, SystemStats, RULPrediction, TimeseriesPoint, FFTData, CausalEffects, TrajectoryPoint } from "./api"

// Generate deterministic random numbers
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

const random = seededRandom(42)

export const mockAssets: Asset[] = [
  {
    id: "ASSET-0001",
    name: "Motor-001",
    asset_type: "Motor",
    location: "Plant A - Line 1",
    criticality: "high",
    install_date: "2021-03-15",
    health_score: 82.5,
    risk_level: "low",
    rul_days: 145,
  },
  {
    id: "ASSET-0002",
    name: "Pump-002",
    asset_type: "Pump",
    location: "Plant A - Line 2",
    criticality: "medium",
    install_date: "2020-08-22",
    health_score: 45.2,
    risk_level: "high",
    rul_days: 28,
  },
  {
    id: "ASSET-0003",
    name: "Compressor-003",
    asset_type: "Compressor",
    location: "Plant B - Line 1",
    criticality: "high",
    install_date: "2022-01-10",
    health_score: 91.8,
    risk_level: "low",
    rul_days: 210,
  },
  {
    id: "ASSET-0004",
    name: "Gearbox-004",
    asset_type: "Gearbox",
    location: "Plant B - Line 2",
    criticality: "medium",
    install_date: "2019-11-05",
    health_score: 38.1,
    risk_level: "critical",
    rul_days: 12,
  },
  {
    id: "ASSET-0005",
    name: "Fan-005",
    asset_type: "Fan",
    location: "Plant C",
    criticality: "low",
    install_date: "2023-02-28",
    health_score: 95.3,
    risk_level: "low",
    rul_days: 280,
  },
  {
    id: "ASSET-0006",
    name: "Motor-006",
    asset_type: "Motor",
    location: "Plant A - Line 1",
    criticality: "medium",
    install_date: "2021-07-19",
    health_score: 67.4,
    risk_level: "medium",
    rul_days: 72,
  },
  {
    id: "ASSET-0007",
    name: "Pump-007",
    asset_type: "Pump",
    location: "Plant B - Line 1",
    criticality: "high",
    install_date: "2020-12-03",
    health_score: 55.8,
    risk_level: "high",
    rul_days: 35,
  },
  {
    id: "ASSET-0008",
    name: "Compressor-008",
    asset_type: "Compressor",
    location: "Plant C",
    criticality: "medium",
    install_date: "2022-06-14",
    health_score: 78.9,
    risk_level: "medium",
    rul_days: 98,
  },
  {
    id: "ASSET-0009",
    name: "Gearbox-009",
    asset_type: "Gearbox",
    location: "Plant A - Line 2",
    criticality: "low",
    install_date: "2023-04-21",
    health_score: 88.2,
    risk_level: "low",
    rul_days: 175,
  },
  {
    id: "ASSET-0010",
    name: "Fan-010",
    asset_type: "Fan",
    location: "Plant B - Line 2",
    criticality: "medium",
    install_date: "2021-09-08",
    health_score: 52.1,
    risk_level: "high",
    rul_days: 42,
  },
]

export const mockStats: SystemStats = {
  total_assets: 10,
  by_risk_level: {
    critical: 1,
    high: 3,
    medium: 3,
    low: 3,
  },
  average_health_score: 69.5,
  average_rul_days: 109.7,
  assets_needing_attention: 4,
}

export function generateMockTimeseries(assetId: string, count: number = 100): TimeseriesPoint[] {
  const asset = mockAssets.find(a => a.id === assetId)
  const baseHealth = asset?.health_score || 70
  const rand = seededRandom(assetId.charCodeAt(assetId.length - 1))

  const data: TimeseriesPoint[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - (count - i) * 3600000)
    const hourOfDay = timestamp.getHours()
    const loadBase = 60 + 20 * Math.sin((2 * Math.PI * hourOfDay) / 24)
    const load = loadBase + (rand() - 0.5) * 10
    const speed = 1000 + 500 * (load / 100) + (rand() - 0.5) * 100
    const vibration = 1.5 + 0.015 * load + 0.001 * speed + (rand() - 0.5) * 0.5
    const temp = 30 + 0.8 * vibration + 0.1 * load + (rand() - 0.5) * 5
    const wear = 100 - baseHealth + i * 0.02
    const failureRisk = 100 / (1 + Math.exp(-0.1 * (wear - 50)))

    data.push({
      timestamp: timestamp.toISOString(),
      load,
      speed,
      vibration_level: vibration,
      temperature: rand() > 0.01 ? temp : null,
      current: 10 + 0.15 * load + (rand() - 0.5) * 2,
      ambient_temp: 22 + (rand() - 0.5) * 4,
      wear: Math.min(100, wear),
      failure_risk: failureRisk,
    })
  }

  return data
}

export function generateMockFFT(assetId: string): FFTData {
  const asset = mockAssets.find(a => a.id === assetId)
  const health = asset?.health_score || 70
  const rand = seededRandom(assetId.charCodeAt(assetId.length - 1) + 100)

  const frequencies: number[] = []
  const magnitudes: number[] = []

  const fundamentalFreq = 20 + rand() * 10 // 20-30 Hz
  const numBins = 256

  for (let i = 0; i < numBins; i++) {
    const freq = (i * 2500) / numBins
    frequencies.push(freq)

    // Generate spectrum with fundamental and harmonics
    let mag = 0.01 + rand() * 0.01 // Noise floor

    // Fundamental frequency
    if (Math.abs(freq - fundamentalFreq) < 5) {
      mag += 0.5 + rand() * 0.2
    }

    // Harmonics (more prominent with lower health)
    for (let h = 2; h <= 5; h++) {
      if (Math.abs(freq - fundamentalFreq * h) < 5) {
        mag += (0.2 / h) * ((100 - health) / 50)
      }
    }

    magnitudes.push(mag)
  }

  const maxIdx = magnitudes.indexOf(Math.max(...magnitudes))

  return {
    asset_id: assetId,
    timestamp: new Date().toISOString(),
    frequencies,
    magnitudes,
    dominant_frequency: frequencies[maxIdx],
    total_power: magnitudes.reduce((a, b) => a + b * b, 0),
  }
}

export function generateMockRUL(assetId: string): RULPrediction {
  const asset = mockAssets.find(a => a.id === assetId)!
  return {
    asset_id: assetId,
    rul_days: asset.rul_days,
    rul_lower: asset.rul_days * 0.7,
    rul_upper: asset.rul_days * 1.3,
    confidence: 0.75 + random() * 0.2,
    health_score: asset.health_score,
    risk_level: asset.risk_level,
    failure_probability_30d: asset.risk_level === "critical" ? 0.45 : asset.risk_level === "high" ? 0.25 : 0.05,
  }
}

export function generateMockTrajectory(assetId: string, horizon: number = 90): TrajectoryPoint[] {
  const asset = mockAssets.find(a => a.id === assetId)
  const currentWear = 100 - (asset?.health_score || 70)
  const wearRate = 0.3 + random() * 0.2

  const trajectory: TrajectoryPoint[] = []
  for (let day = 0; day <= horizon; day++) {
    const wear = Math.min(100, currentWear + wearRate * day)
    trajectory.push({
      day,
      wear,
      health: 100 - wear,
      failure_probability: 1 / (1 + Math.exp(-0.1 * (wear - 50))),
    })
  }

  return trajectory
}

export const mockCausalEffects: CausalEffects = {
  asset_id: "ASSET-0001",
  effects: [
    { treatment: "load", outcome: "vibration_level", effect: 0.015, std_error: 0.002, confidence_interval: [0.011, 0.019], direction: "increases", significance: "high" },
    { treatment: "speed", outcome: "vibration_level", effect: 0.001, std_error: 0.0002, confidence_interval: [0.0006, 0.0014], direction: "increases", significance: "high" },
    { treatment: "vibration_level", outcome: "temperature", effect: 0.8, std_error: 0.1, confidence_interval: [0.6, 1.0], direction: "increases", significance: "high" },
    { treatment: "temperature", outcome: "wear", effect: 0.002, std_error: 0.0005, confidence_interval: [0.001, 0.003], direction: "increases", significance: "high" },
    { treatment: "lubrication_interval", outcome: "wear", effect: 0.001, std_error: 0.0003, confidence_interval: [0.0004, 0.0016], direction: "increases", significance: "medium" },
    { treatment: "wear", outcome: "failure_risk", effect: 1.5, std_error: 0.2, confidence_interval: [1.1, 1.9], direction: "increases", significance: "high" },
  ],
  top_drivers: [
    { variable: "load", effect: 0.015, direction: "increases", significance: "high" },
    { variable: "speed", effect: 0.001, direction: "increases", significance: "high" },
    { variable: "lubrication_interval", effect: 0.001, direction: "increases", significance: "medium" },
  ],
  graph: {
    nodes: [
      { id: "load", label: "Load", type: "treatment" },
      { id: "speed", label: "Speed", type: "treatment" },
      { id: "lubrication_interval", label: "Lubrication Interval", type: "treatment" },
      { id: "vibration_level", label: "Vibration Level", type: "mediator" },
      { id: "temperature", label: "Temperature", type: "mediator" },
      { id: "ambient_temp", label: "Ambient Temp", type: "exogenous" },
      { id: "wear", label: "Wear", type: "mediator" },
      { id: "failure_risk", label: "Failure Risk", type: "outcome" },
    ],
    edges: [
      { source: "load", target: "vibration_level" },
      { source: "speed", target: "vibration_level" },
      { source: "vibration_level", target: "temperature" },
      { source: "ambient_temp", target: "temperature" },
      { source: "temperature", target: "wear" },
      { source: "lubrication_interval", target: "wear" },
      { source: "wear", target: "failure_risk" },
    ],
  },
}

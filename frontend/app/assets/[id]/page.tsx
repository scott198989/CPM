"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart"
import { FFTChart } from "@/components/charts/FFTChart"
import { RULGauge } from "@/components/charts/RULGauge"
import { TrajectoryChart } from "@/components/charts/TrajectoryChart"
import { FeatureInspector } from "@/components/dashboard/FeatureInspector"
import { CausalPanel } from "@/components/dashboard/CausalPanel"
import {
  api,
  type Asset,
  type TimeseriesPoint,
  type RULPrediction,
  type FFTData,
  type CausalEffects,
  type TrajectoryPoint,
  type CounterfactualResult,
} from "@/lib/api"
import {
  mockAssets,
  generateMockTimeseries,
  generateMockFFT,
  generateMockRUL,
  generateMockTrajectory,
  mockCausalEffects,
} from "@/lib/mock-data"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

interface SignalFeatures {
  rms: number
  peak: number
  crest_factor: number
  kurtosis: number
  skewness: number
  spectral_centroid: number
  spectral_spread: number
  bandpowers: Record<string, number>
}

export default function AssetDetailPage() {
  const params = useParams()
  const assetId = params.id as string

  const [asset, setAsset] = useState<Asset | null>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [rul, setRul] = useState<RULPrediction | null>(null)
  const [fft, setFft] = useState<FFTData | null>(null)
  const [features, setFeatures] = useState<SignalFeatures | null>(null)
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([])
  const [causal, setCausal] = useState<CausalEffects | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        if (USE_MOCK) {
          const mockAsset = mockAssets.find((a) => a.id === assetId)
          if (mockAsset) {
            setAsset(mockAsset)
            setTimeseries(generateMockTimeseries(assetId, 100))
            setRul(generateMockRUL(assetId))
            setFft(generateMockFFT(assetId))
            setTrajectory(generateMockTrajectory(assetId))
            setCausal({ ...mockCausalEffects, asset_id: assetId })
            // Generate mock features
            const mockFft = generateMockFFT(assetId)
            setFeatures({
              rms: 1.2 + Math.random() * 0.5,
              peak: 3.5 + Math.random(),
              crest_factor: 2.5 + Math.random(),
              kurtosis: 0.5 + Math.random() * 2,
              skewness: -0.2 + Math.random() * 0.4,
              spectral_centroid: mockFft.dominant_frequency,
              spectral_spread: 150 + Math.random() * 100,
              bandpowers: {
                "0-100": 0.1 + Math.random() * 0.1,
                "100-500": 0.3 + Math.random() * 0.2,
                "500-1000": 0.15 + Math.random() * 0.1,
                "1000-2000": 0.05 + Math.random() * 0.05,
                "2000+": 0.02 + Math.random() * 0.02,
              },
            })
          }
        } else {
          const [assetRes, tsRes, rulRes, fftRes, trajRes, causalRes, featRes] =
            await Promise.all([
              api.getAsset(assetId),
              api.getTimeseries(assetId, 100),
              api.getRUL(assetId),
              api.getFFT(assetId),
              api.getTrajectory(assetId),
              api.getCausalEffects(assetId),
              api.getFeatures(assetId, -1),
            ])

          setAsset(assetRes)
          setTimeseries(tsRes.data)
          setRul(rulRes)
          setFft(fftRes)
          setTrajectory(trajRes.trajectory)
          setCausal(causalRes)
          setFeatures(featRes as SignalFeatures)
        }
      } catch (error) {
        console.error("Failed to fetch asset data:", error)
        // Fallback to mock
        const mockAsset = mockAssets.find((a) => a.id === assetId)
        if (mockAsset) {
          setAsset(mockAsset)
          setTimeseries(generateMockTimeseries(assetId, 100))
          setRul(generateMockRUL(assetId))
          setFft(generateMockFFT(assetId))
          setTrajectory(generateMockTrajectory(assetId))
          setCausal({ ...mockCausalEffects, asset_id: assetId })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [assetId])

  const handleCounterfactual = async (
    interventions: Record<string, number>
  ): Promise<CounterfactualResult> => {
    if (USE_MOCK) {
      // Mock counterfactual result
      const originalRul = rul?.rul_days || 100
      const loadEffect = (70 - interventions.load) * 0.5
      const speedEffect = (1200 - interventions.speed) * 0.02
      const lubEffect = (100 - interventions.lubrication_interval) * 0.3

      const rulChange = loadEffect + speedEffect + lubEffect
      const newRul = originalRul + rulChange

      return {
        asset_id: assetId,
        interventions,
        original_rul: originalRul,
        counterfactual_rul: newRul,
        rul_change: rulChange,
        rul_change_percent: (rulChange / originalRul) * 100,
        original_risk: rul?.failure_probability_30d || 0.2,
        counterfactual_risk: Math.max(0, (rul?.failure_probability_30d || 0.2) - rulChange * 0.002),
        recommendations: [
          interventions.load < 70 ? "Reducing load extends equipment life" : "",
          interventions.speed < 1200 ? "Lower speed reduces vibration wear" : "",
          interventions.lubrication_interval < 100 ? "More frequent lubrication helps" : "",
        ].filter(Boolean),
      }
    }

    return api.predictCounterfactual(assetId, interventions)
  }

  const handleExport = () => {
    // Create CSV export
    const headers = [
      "timestamp",
      "load",
      "speed",
      "vibration_level",
      "temperature",
      "wear",
      "failure_risk",
    ]
    const csvContent = [
      headers.join(","),
      ...timeseries.map((row) =>
        headers.map((h) => row[h as keyof TimeseriesPoint] ?? "").join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${assetId}-data.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-[400px] bg-muted animate-pulse rounded" />
          <div className="h-[400px] bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold">Asset not found</h1>
        <p className="text-muted-foreground mt-2">
          The asset {assetId} could not be found.
        </p>
        <Link href="/">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const riskVariant = {
    critical: "danger" as const,
    high: "warning" as const,
    medium: "warning" as const,
    low: "success" as const,
  }[asset.risk_level] || "secondary"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{asset.name}</h1>
              <Badge variant={riskVariant}>{asset.risk_level.toUpperCase()}</Badge>
            </div>
            <p className="text-muted-foreground">
              {asset.asset_type} • {asset.location}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Main content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signals">Signal Analysis</TabsTrigger>
          <TabsTrigger value="causal">Causal Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <TimeSeriesChart
                data={timeseries}
                title="Vibration & Temperature"
                lines={[
                  { key: "vibration_level", name: "Vibration", color: "#3b82f6" },
                  { key: "temperature", name: "Temperature", color: "#ef4444" },
                ]}
              />
              <TimeSeriesChart
                data={timeseries}
                title="Load & Speed"
                lines={[
                  { key: "load", name: "Load (%)", color: "#22c55e" },
                  { key: "speed", name: "Speed (RPM)", color: "#eab308" },
                ]}
              />
              <TrajectoryChart
                data={trajectory}
                currentHealth={asset.health_score}
                loading={loading}
              />
            </div>
            <div className="space-y-6">
              <RULGauge data={rul} loading={loading} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="signals" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <FFTChart data={fft} loading={loading} />
            <FeatureInspector features={features} loading={loading} />
          </div>
          <TimeSeriesChart
            data={timeseries}
            title="Wear & Failure Risk"
            lines={[
              { key: "wear", name: "Wear Level", color: "#f97316" },
              { key: "failure_risk", name: "Failure Risk", color: "#ef4444" },
            ]}
          />
        </TabsContent>

        <TabsContent value="causal" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <CausalPanel
              causalData={causal}
              onPredictCounterfactual={handleCounterfactual}
              loading={loading}
            />
            <div className="space-y-6">
              <RULGauge data={rul} loading={loading} />
              <TrajectoryChart
                data={trajectory}
                currentHealth={asset.health_score}
                loading={loading}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

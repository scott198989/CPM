"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

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

interface FeatureInspectorProps {
  features: SignalFeatures | null
  loading?: boolean
}

export function FeatureInspector({ features, loading }: FeatureInspectorProps) {
  if (loading || !features) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Inspector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const bandpowerData = Object.entries(features.bandpowers).map(([name, value]) => ({
    name: name.replace(" Hz", ""),
    power: value,
  }))

  const getKurtosisStatus = (k: number) => {
    if (k > 3) return { label: "Impulsive", variant: "danger" as const }
    if (k > 1) return { label: "Peaky", variant: "warning" as const }
    return { label: "Normal", variant: "success" as const }
  }

  const getCrestFactorStatus = (cf: number) => {
    if (cf > 5) return { label: "High Peaks", variant: "danger" as const }
    if (cf > 3) return { label: "Moderate", variant: "warning" as const }
    return { label: "Normal", variant: "success" as const }
  }

  const kurtStatus = getKurtosisStatus(features.kurtosis)
  const cfStatus = getCrestFactorStatus(features.crest_factor)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Inspector</CardTitle>
        <CardDescription>Vibration signal analysis metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Time-domain features */}
        <div>
          <h4 className="text-sm font-medium mb-3">Time-Domain Features</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">RMS</span>
                <span className="font-mono">{features.rms.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Peak</span>
                <span className="font-mono">{features.peak.toFixed(4)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Crest Factor</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{features.crest_factor.toFixed(2)}</span>
                  <Badge variant={cfStatus.variant} className="text-[10px]">
                    {cfStatus.label}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Kurtosis</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{features.kurtosis.toFixed(2)}</span>
                  <Badge variant={kurtStatus.variant} className="text-[10px]">
                    {kurtStatus.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Frequency-domain features */}
        <div>
          <h4 className="text-sm font-medium mb-3">Frequency-Domain Features</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Spectral Centroid</span>
              <span className="font-mono">{features.spectral_centroid.toFixed(1)} Hz</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Spectral Spread</span>
              <span className="font-mono">{features.spectral_spread.toFixed(1)} Hz</span>
            </div>
          </div>
        </div>

        {/* Band power chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Band Power Distribution</h4>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bandpowerData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [value.toFixed(4), "Power"]}
                />
                <Bar
                  dataKey="power"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

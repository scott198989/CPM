"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { FFTData } from "@/lib/api"

interface FFTChartProps {
  data: FFTData | null
  loading?: boolean
}

export function FFTChart({ data, loading }: FFTChartProps) {
  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FFT Spectrum</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const chartData = data.frequencies.map((freq, i) => ({
    frequency: freq,
    magnitude: data.magnitudes[i],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>FFT Spectrum</CardTitle>
        <CardDescription>
          Dominant frequency: {data.dominant_frequency.toFixed(1)} Hz |
          Total power: {data.total_power.toFixed(4)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fftGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="frequency"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Frequency (Hz)", position: "bottom", fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Magnitude", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [value.toFixed(4), "Magnitude"]}
                labelFormatter={(label: number) => `${label.toFixed(1)} Hz`}
              />
              <ReferenceLine
                x={data.dominant_frequency}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ value: "Peak", fill: "#ef4444", fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="magnitude"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#fftGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

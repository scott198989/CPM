"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getHealthColor } from "@/lib/utils"
import type { RULPrediction } from "@/lib/api"

interface RULGaugeProps {
  data: RULPrediction | null
  loading?: boolean
}

export function RULGauge({ data, loading }: RULGaugeProps) {
  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>RUL Prediction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const healthColor = getHealthColor(data.health_score)
  const circumference = 2 * Math.PI * 70
  const progress = (data.health_score / 100) * circumference

  const riskVariant = {
    critical: "danger" as const,
    high: "warning" as const,
    medium: "warning" as const,
    low: "success" as const,
  }[data.risk_level] || "secondary"

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>RUL Prediction</CardTitle>
          <Badge variant={riskVariant}>{data.risk_level.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Circular gauge */}
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke={healthColor}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                className="transition-all duration-500"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: healthColor }}>
                {data.health_score.toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground">Health</span>
            </div>
          </div>

          {/* RUL info */}
          <div className="mt-4 text-center space-y-2">
            <div>
              <span className="text-2xl font-bold">{data.rul_days.toFixed(0)}</span>
              <span className="text-muted-foreground ml-1">days</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Range: {data.rul_lower.toFixed(0)} - {data.rul_upper.toFixed(0)} days
            </div>
            <div className="text-xs">
              Confidence: {(data.confidence * 100).toFixed(0)}%
            </div>
          </div>

          {/* Failure probability */}
          <div className="mt-4 w-full p-3 rounded-md bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">30-day failure probability</span>
              <span
                className={`font-medium ${
                  data.failure_probability_30d > 0.3
                    ? "text-red-500"
                    : data.failure_probability_30d > 0.1
                    ? "text-yellow-500"
                    : "text-green-500"
                }`}
              >
                {(data.failure_probability_30d * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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
import type { TrajectoryPoint } from "@/lib/api"

interface TrajectoryChartProps {
  data: TrajectoryPoint[] | null
  currentHealth: number
  loading?: boolean
}

export function TrajectoryChart({ data, currentHealth, loading }: TrajectoryChartProps) {
  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Trajectory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Health Trajectory</CardTitle>
        <CardDescription>Predicted health over the next {data.length - 1} days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#eab308" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Days from now", position: "bottom", fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Health %", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  name === "health" ? "Health" : "Failure Prob",
                ]}
                labelFormatter={(label: number) => `Day ${label}`}
              />
              <ReferenceLine
                y={40}
                stroke="#f97316"
                strokeDasharray="3 3"
                label={{ value: "Warning", fill: "#f97316", fontSize: 10, position: "right" }}
              />
              <ReferenceLine
                y={20}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ value: "Critical", fill: "#ef4444", fontSize: 10, position: "right" }}
              />
              <Area
                type="monotone"
                dataKey="health"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={0.6}
                fill="url(#healthGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

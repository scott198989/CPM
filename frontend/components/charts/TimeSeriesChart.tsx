"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TimeSeriesChartProps {
  data: Array<{
    timestamp: string
    [key: string]: string | number | null
  }>
  lines: Array<{
    key: string
    name: string
    color: string
  }>
  title: string
  yAxisLabel?: string
}

export function TimeSeriesChart({ data, lines, title, yAxisLabel }: TimeSeriesChartProps) {
  // Format timestamp for display
  const formattedData = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", fontSize: 10 } : undefined}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend />
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

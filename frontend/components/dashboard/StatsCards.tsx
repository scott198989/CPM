"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, AlertTriangle, Clock, Heart } from "lucide-react"

interface StatsCardsProps {
  stats: {
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
  } | null
  loading?: boolean
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_assets}</div>
          <p className="text-xs text-muted-foreground">
            Monitored equipment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Health</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.average_health_score.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Fleet health score
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. RUL</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.average_rul_days.toFixed(0)} days
          </div>
          <p className="text-xs text-muted-foreground">
            Remaining useful life
          </p>
        </CardContent>
      </Card>

      <Card className={stats.assets_needing_attention > 0 ? "border-orange-500/50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attention Needed</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${stats.assets_needing_attention > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.assets_needing_attention > 0 ? "text-orange-500" : ""}`}>
            {stats.assets_needing_attention}
          </div>
          <p className="text-xs text-muted-foreground">
            Critical + High risk assets
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

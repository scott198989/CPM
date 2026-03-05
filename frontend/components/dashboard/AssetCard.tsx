"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getRiskColor, getHealthColor } from "@/lib/utils"
import type { Asset } from "@/lib/api"

interface AssetCardProps {
  asset: Asset
}

export function AssetCard({ asset }: AssetCardProps) {
  const riskVariant = {
    critical: "danger" as const,
    high: "warning" as const,
    medium: "warning" as const,
    low: "success" as const,
  }[asset.risk_level] || "secondary"

  return (
    <Link href={`/assets/${asset.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{asset.name}</CardTitle>
            <Badge variant={riskVariant}>
              {asset.risk_level.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{asset.asset_type}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Health Score</span>
                <span
                  className="font-medium"
                  style={{ color: getHealthColor(asset.health_score) }}
                >
                  {asset.health_score.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={asset.health_score}
                className="h-2"
                indicatorClassName={`transition-all`}
                style={{
                  ["--progress-color" as string]: getHealthColor(asset.health_score)
                }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">RUL</span>
              <span className="font-medium">{asset.rul_days.toFixed(0)} days</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Location</span>
              <span className="text-xs">{asset.location}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Criticality</span>
              <Badge variant="outline" className="text-xs capitalize">
                {asset.criticality}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

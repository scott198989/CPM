"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, X } from "lucide-react"
import { api, type Asset, type RULPrediction } from "@/lib/api"
import { mockAssets, generateMockRUL } from "@/lib/mock-data"
import { getHealthColor } from "@/lib/utils"

// Dynamic import for Three.js (client-side only)
const HealthGalaxy = dynamic(
  () => import("@/components/three/HealthGalaxy").then((mod) => mod.HealthGalaxy),
  { ssr: false, loading: () => <div className="h-full bg-muted animate-pulse" /> }
)

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export default function GalaxyPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedRul, setSelectedRul] = useState<RULPrediction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        if (USE_MOCK) {
          setAssets(mockAssets)
        } else {
          const res = await api.getAssets()
          setAssets(res.assets)
        }
      } catch (error) {
        console.error("Failed to fetch assets:", error)
        setAssets(mockAssets)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    async function fetchRul() {
      if (!selectedAsset) {
        setSelectedRul(null)
        return
      }

      try {
        if (USE_MOCK) {
          setSelectedRul(generateMockRUL(selectedAsset.id))
        } else {
          const rul = await api.getRUL(selectedAsset.id)
          setSelectedRul(rul)
        }
      } catch (error) {
        console.error("Failed to fetch RUL:", error)
        setSelectedRul(generateMockRUL(selectedAsset.id))
      }
    }

    fetchRul()
  }, [selectedAsset])

  const riskVariant = selectedAsset
    ? ({
        critical: "danger" as const,
        high: "warning" as const,
        medium: "warning" as const,
        low: "success" as const,
      }[selectedAsset.risk_level] || "secondary")
    : "secondary"

  return (
    <div className="h-[calc(100vh-8rem)] relative">
      <div className="absolute inset-0 rounded-lg overflow-hidden border">
        {!loading && <HealthGalaxy
          assets={assets}
          selectedAsset={selectedAsset}
          onSelectAsset={setSelectedAsset}
        />}
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-background/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Health Galaxy</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Healthy (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Warning (60-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>At Risk (40-60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Critical (&lt;40%)</span>
            </div>
            <div className="pt-2 border-t text-muted-foreground">
              Node size = criticality
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected asset panel */}
      {selectedAsset && (
        <div className="absolute top-4 right-4 z-10 w-80">
          <Card className="bg-background/90 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedAsset.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedAsset.asset_type}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAsset(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Level</span>
                <Badge variant={riskVariant}>
                  {selectedAsset.risk_level.toUpperCase()}
                </Badge>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Health Score</span>
                  <span
                    className="font-medium"
                    style={{ color: getHealthColor(selectedAsset.health_score) }}
                  >
                    {selectedAsset.health_score.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={selectedAsset.health_score}
                  className="h-2"
                />
              </div>

              {selectedRul && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">RUL</span>
                    <span className="font-medium">
                      {selectedRul.rul_days.toFixed(0)} days
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      30-day Failure Risk
                    </span>
                    <span
                      className={`font-medium ${
                        selectedRul.failure_probability_30d > 0.3
                          ? "text-red-500"
                          : selectedRul.failure_probability_30d > 0.1
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      {(selectedRul.failure_probability_30d * 100).toFixed(1)}%
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span className="text-xs">{selectedAsset.location}</span>
              </div>

              <Link href={`/assets/${selectedAsset.id}`}>
                <Button className="w-full" size="sm">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <Card className="bg-background/80 backdrop-blur">
          <CardContent className="py-2 px-4 text-xs text-muted-foreground">
            Click assets to select • Drag to rotate • Scroll to zoom
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

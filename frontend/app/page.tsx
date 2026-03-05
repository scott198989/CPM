"use client"

import { useEffect, useState } from "react"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { AssetCard } from "@/components/dashboard/AssetCard"
import { RiskDistribution } from "@/components/dashboard/RiskDistribution"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type Asset, type SystemStats } from "@/lib/api"
import { mockAssets, mockStats } from "@/lib/mock-data"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        if (USE_MOCK) {
          setAssets(mockAssets)
          setStats(mockStats)
        } else {
          const [assetsRes, statsRes] = await Promise.all([
            api.getAssets(),
            api.getStats(),
          ])
          setAssets(assetsRes.assets)
          setStats(statsRes)
        }
      } catch (err) {
        console.error("Failed to fetch data:", err)
        // Fallback to mock data on error
        setAssets(mockAssets)
        setStats(mockStats)
        setError("Using demo data (backend unavailable)")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Sort assets by risk level (critical first)
  const sortedAssets = [...assets].sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return (riskOrder[a.risk_level as keyof typeof riskOrder] || 4) -
           (riskOrder[b.risk_level as keyof typeof riskOrder] || 4)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Predictive maintenance overview and asset health monitoring
          </p>
        </div>
        {error && (
          <div className="text-sm text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-md">
            {error}
          </div>
        )}
      </div>

      <StatsCards stats={stats} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Assets</h2>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[200px]" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <RiskDistribution
            data={stats?.by_risk_level || null}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

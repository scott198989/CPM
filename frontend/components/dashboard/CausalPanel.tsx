"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { CausalEffects, CounterfactualResult } from "@/lib/api"

interface CausalPanelProps {
  causalData: CausalEffects | null
  onPredictCounterfactual: (interventions: Record<string, number>) => Promise<CounterfactualResult>
  loading?: boolean
}

export function CausalPanel({ causalData, onPredictCounterfactual, loading }: CausalPanelProps) {
  const [interventions, setInterventions] = useState({
    load: 70,
    speed: 1200,
    lubrication_interval: 100,
  })
  const [counterfactual, setCounterfactual] = useState<CounterfactualResult | null>(null)
  const [predicting, setPredicting] = useState(false)

  const handlePredict = async () => {
    setPredicting(true)
    try {
      const result = await onPredictCounterfactual(interventions)
      setCounterfactual(result)
    } catch (error) {
      console.error("Counterfactual prediction failed:", error)
    } finally {
      setPredicting(false)
    }
  }

  if (loading || !causalData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Causal Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Causal Analysis</CardTitle>
        <CardDescription>
          Understand what drives failure risk and predict what-if scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top drivers */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top Risk Drivers</h4>
          <div className="space-y-2">
            {causalData.top_drivers.map((driver, i) => (
              <div
                key={driver.variable}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{i + 1}</span>
                  <span className="text-sm font-medium capitalize">
                    {driver.variable.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {driver.direction === "increases" ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                  <Badge
                    variant={driver.significance === "high" ? "destructive" : "secondary"}
                  >
                    {driver.significance}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Causal graph visualization (simplified) */}
        <div>
          <h4 className="text-sm font-medium mb-3">Causal Pathway</h4>
          <div className="flex items-center justify-center gap-1 flex-wrap p-4 bg-muted/30 rounded-md">
            <Badge variant="outline">Load</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline">Vibration</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline">Heat</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline">Wear</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="destructive">Failure Risk</Badge>
          </div>
        </div>

        {/* Counterfactual prediction */}
        <div>
          <h4 className="text-sm font-medium mb-3">What-If Analysis</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Load (%)</span>
                <span className="font-mono">{interventions.load}</span>
              </div>
              <Slider
                value={[interventions.load]}
                onValueChange={([v]) => setInterventions({ ...interventions, load: v })}
                min={20}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Speed (RPM)</span>
                <span className="font-mono">{interventions.speed}</span>
              </div>
              <Slider
                value={[interventions.speed]}
                onValueChange={([v]) => setInterventions({ ...interventions, speed: v })}
                min={500}
                max={2000}
                step={50}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lubrication Interval (hrs)</span>
                <span className="font-mono">{interventions.lubrication_interval}</span>
              </div>
              <Slider
                value={[interventions.lubrication_interval]}
                onValueChange={([v]) =>
                  setInterventions({ ...interventions, lubrication_interval: v })
                }
                min={24}
                max={200}
                step={12}
              />
            </div>

            <Button onClick={handlePredict} disabled={predicting} className="w-full">
              {predicting ? "Predicting..." : "Predict Outcome"}
            </Button>

            {counterfactual && (
              <div className="mt-4 p-4 rounded-md border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">RUL Change</span>
                  <div className="flex items-center gap-2">
                    {counterfactual.rul_change > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : counterfactual.rul_change < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span
                      className={`font-medium ${
                        counterfactual.rul_change > 0
                          ? "text-green-500"
                          : counterfactual.rul_change < 0
                          ? "text-red-500"
                          : ""
                      }`}
                    >
                      {counterfactual.rul_change > 0 ? "+" : ""}
                      {counterfactual.rul_change.toFixed(1)} days
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">New RUL</span>
                  <span className="font-mono">{counterfactual.counterfactual_rul.toFixed(0)} days</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Risk Change</span>
                  <span
                    className={`font-mono ${
                      counterfactual.counterfactual_risk < counterfactual.original_risk
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {counterfactual.original_risk.toFixed(1)}% →{" "}
                    {counterfactual.counterfactual_risk.toFixed(1)}%
                  </span>
                </div>

                {counterfactual.recommendations.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Recommendations:</p>
                    <ul className="text-xs space-y-1">
                      {counterfactual.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-primary">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

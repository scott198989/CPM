import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case "critical":
      return "text-red-500"
    case "high":
      return "text-orange-500"
    case "medium":
      return "text-yellow-500"
    case "low":
      return "text-green-500"
    default:
      return "text-gray-500"
  }
}

export function getRiskBgColor(riskLevel: string): string {
  switch (riskLevel) {
    case "critical":
      return "bg-red-500/10 border-red-500/20"
    case "high":
      return "bg-orange-500/10 border-orange-500/20"
    case "medium":
      return "bg-yellow-500/10 border-yellow-500/20"
    case "low":
      return "bg-green-500/10 border-green-500/20"
    default:
      return "bg-gray-500/10 border-gray-500/20"
  }
}

export function getHealthColor(health: number): string {
  if (health >= 80) return "#22c55e"
  if (health >= 60) return "#eab308"
  if (health >= 40) return "#f97316"
  return "#ef4444"
}

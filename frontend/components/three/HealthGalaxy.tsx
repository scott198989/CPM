"use client"

import { useRef, useMemo, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Text, Html, Line } from "@react-three/drei"
import * as THREE from "three"
import type { Asset } from "@/lib/api"

interface AssetNodeProps {
  asset: Asset
  position: [number, number, number]
  onClick: (asset: Asset) => void
  isSelected: boolean
}

function AssetNode({ asset, position, onClick, isSelected }: AssetNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Color based on health
  const color = useMemo(() => {
    if (asset.health_score >= 80) return "#22c55e"
    if (asset.health_score >= 60) return "#eab308"
    if (asset.health_score >= 40) return "#f97316"
    return "#ef4444"
  }, [asset.health_score])

  // Size based on criticality
  const size = useMemo(() => {
    switch (asset.criticality) {
      case "high":
        return 0.8
      case "medium":
        return 0.6
      default:
        return 0.4
    }
  }, [asset.criticality])

  // Pulse animation for critical/high risk
  useFrame((state) => {
    if (meshRef.current) {
      if (asset.risk_level === "critical" || asset.risk_level === "high") {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1
        meshRef.current.scale.setScalar(size * pulse)
      }

      // Rotate slightly
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => onClick(asset)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={size}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Glow effect */}
      <mesh scale={size * 1.3}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Ring for selected */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={size * 1.5}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label on hover */}
      {(hovered || isSelected) && (
        <Html distanceFactor={10} position={[0, size + 0.5, 0]}>
          <div className="bg-background/90 border rounded-md px-2 py-1 text-xs whitespace-nowrap">
            <div className="font-medium">{asset.name}</div>
            <div className="text-muted-foreground">
              Health: {asset.health_score.toFixed(0)}%
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

function ConnectionLines({ assets }: { assets: Asset[] }) {
  const positions = useMemo(() => {
    // Create connections between assets in the same location
    const connections: [Asset, Asset][] = []
    const byLocation: Record<string, Asset[]> = {}

    assets.forEach((asset) => {
      if (!byLocation[asset.location]) {
        byLocation[asset.location] = []
      }
      byLocation[asset.location].push(asset)
    })

    Object.values(byLocation).forEach((group) => {
      for (let i = 0; i < group.length - 1; i++) {
        connections.push([group[i], group[i + 1]])
      }
    })

    return connections
  }, [assets])

  return (
    <>
      {positions.map(([a, b], i) => {
        const posA = getAssetPosition(a, assets.indexOf(a), assets.length)
        const posB = getAssetPosition(b, assets.indexOf(b), assets.length)

        return (
          <Line
            key={i}
            points={[posA, posB]}
            color="#4b5563"
            opacity={0.3}
            transparent
            lineWidth={1}
          />
        )
      })}
    </>
  )
}

function getAssetPosition(asset: Asset, index: number, total: number): [number, number, number] {
  // Arrange in a 3D spiral pattern
  const angle = (index / total) * Math.PI * 2 * 2 // Two full rotations
  const radius = 5 + (index / total) * 3
  const height = ((index / total) - 0.5) * 6

  // Adjust position based on health (healthier assets are closer to center)
  const healthFactor = asset.health_score / 100

  return [
    Math.cos(angle) * radius * (1 + (1 - healthFactor) * 0.3),
    height + (1 - healthFactor) * 2,
    Math.sin(angle) * radius * (1 + (1 - healthFactor) * 0.3),
  ]
}

function Stars() {
  const starsRef = useRef<THREE.Points>(null)

  const [positions] = useMemo(() => {
    const positions = new Float32Array(1000 * 3)
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100
    }
    return [positions]
  }, [])

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0002
    }
  })

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#ffffff" transparent opacity={0.6} />
    </points>
  )
}

interface HealthGalaxyProps {
  assets: Asset[]
  selectedAsset: Asset | null
  onSelectAsset: (asset: Asset | null) => void
}

export function HealthGalaxy({ assets, selectedAsset, onSelectAsset }: HealthGalaxyProps) {
  return (
    <Canvas
      camera={{ position: [15, 10, 15], fov: 50 }}
      style={{ background: "linear-gradient(to bottom, #0f172a, #1e1b4b)" }}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />

      <Stars />
      <ConnectionLines assets={assets} />

      {assets.map((asset, i) => (
        <AssetNode
          key={asset.id}
          asset={asset}
          position={getAssetPosition(asset, i, assets.length)}
          onClick={onSelectAsset}
          isSelected={selectedAsset?.id === asset.id}
        />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={!selectedAsset}
        autoRotateSpeed={0.5}
      />
    </Canvas>
  )
}

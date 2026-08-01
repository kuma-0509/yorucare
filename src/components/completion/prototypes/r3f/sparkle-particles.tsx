"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SparkleParticlesProps {
  active: boolean;
  count?: number;
  position?: [number, number, number];
  spread?: [number, number, number];
}

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function SparkleParticles({
  active,
  count = 24,
  position = [0, 0, 0],
  spread = [2.2, 1.2, 1.2],
}: SparkleParticlesProps) {
  const ref = useRef<THREE.Points>(null);
  const [spreadX, spreadY, spreadZ] = spread;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (seeded(i, 1) - 0.5) * spreadX;
      arr[i * 3 + 1] = (seeded(i, 2) - 0.35) * spreadY;
      arr[i * 3 + 2] = (seeded(i, 3) - 0.5) * spreadZ;
    }
    return arr;
  }, [count, spreadX, spreadY, spreadZ]);

  useFrame(({ clock }) => {
    if (!ref.current || !active) return;
    const t = clock.getElapsedTime();
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 0.35 + Math.sin(t * 2) * 0.1;
    ref.current.rotation.y = t * 0.05;
  });

  if (!active) return null;

  return (
    <points ref={ref} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#c9a227"
        size={0.035}
        transparent
        opacity={0.4}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

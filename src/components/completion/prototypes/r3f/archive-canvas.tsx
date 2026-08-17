"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { ArchiveScene } from "./archive-scene";
import { detectSceneQuality } from "./quality";

interface ArchiveCanvasProps {
  lines: string[];
  heading?: string;
  soundEnabled?: boolean;
  onDone?: () => void;
}

export function ArchiveCanvas({
  lines,
  heading,
  soundEnabled = false,
  onDone,
}: ArchiveCanvasProps) {
  // 端末の段階は再生中に変わらない。最初に1回だけ決める
  const quality = useMemo(() => detectSceneQuality(), []);

  return (
    <Canvas
      shadows
      dpr={quality.dpr}
      gl={{
        // 低い段階では、解像度を落としたぶんのジャギーを
        // アンチエイリアスで埋めずに済ませる（塗る回数を増やさない）
        antialias: quality.tier === "high",
        powerPreference:
          quality.tier === "high" ? "high-performance" : "default",
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = quality.softShadows
          ? THREE.PCFSoftShadowMap
          : THREE.PCFShadowMap;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
      className="touch-none"
    >
      <Suspense fallback={null}>
        <ArchiveScene
          lines={lines}
          heading={heading}
          soundEnabled={soundEnabled}
          quality={quality}
          onDone={onDone}
        />
      </Suspense>
    </Canvas>
  );
}

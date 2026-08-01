"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { ArchiveScene } from "./archive-scene";

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
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
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
          onDone={onDone}
        />
      </Suspense>
    </Canvas>
  );
}

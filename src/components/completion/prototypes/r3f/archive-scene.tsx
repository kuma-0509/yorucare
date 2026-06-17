"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { AntiqueBook } from "./antique-book";
import { Bookshelf } from "./bookshelf";
import { SparkleParticles } from "./sparkle-particles";
import {
  playBookClose,
  playPageFlip,
  playPenScratch,
  playShelfSettle,
  playShelfSlide,
  playSparkleChime,
} from "./completion-sounds";
import { createWoodMaterial } from "./materials";
import {
  TIMELINE,
  useCinematicTimeline,
  type CinematicPhase,
} from "./use-cinematic-timeline";

interface ArchiveSceneProps {
  lines: string[];
  heading?: string;
  soundEnabled?: boolean;
  onDone?: () => void;
}

const CAMERA_KEYS: Record<
  CinematicPhase,
  { pos: THREE.Vector3; target: THREE.Vector3 }
> = {
  writing: {
    pos: new THREE.Vector3(0.15, 0.35, 2.65),
    target: new THREE.Vector3(0, 0.05, 0),
  },
  pageFlip: {
    pos: new THREE.Vector3(0.08, 0.42, 2.35),
    target: new THREE.Vector3(0, 0.05, 0),
  },
  closing: {
    pos: new THREE.Vector3(0, 0.55, 3.15),
    target: new THREE.Vector3(0, 0, 0),
  },
  spine: {
    pos: new THREE.Vector3(1.75, 0.3, 1.45),
    target: new THREE.Vector3(0, 0, 0),
  },
  shelving: {
    pos: new THREE.Vector3(0.25, -0.42, 2.22),
    target: new THREE.Vector3(0, -1.35, -0.06),
  },
  afterglow: {
    pos: new THREE.Vector3(0, -0.25, 2.86),
    target: new THREE.Vector3(0, -1.34, -0.06),
  },
  done: {
    pos: new THREE.Vector3(0, -0.18, 3.14),
    target: new THREE.Vector3(0, -1.34, -0.06),
  },
};

function impactPulse(t: number) {
  if (t < 0.86) return 0;
  const local = Math.min(1, (t - 0.86) / 0.14);
  return Math.sin(local * Math.PI);
}

export function ArchiveScene({
  lines,
  heading,
  soundEnabled = false,
  onDone,
}: ArchiveSceneProps) {
  const { phase, phaseProgress } = useCinematicTimeline(onDone);
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const lookAt = useRef(new THREE.Vector3(0, 0.05, 0));
  const keyLightRef = useRef<THREE.SpotLight>(null);
  const played = useRef(new Set<string>());
  const wood = useMemo(() => createWoodMaterial(), []);

  const shelfT =
    phase === "shelving"
      ? phaseProgress
      : phase === "afterglow" || phase === "done"
        ? 1
        : 0;

  const shelfGlow =
    phase === "afterglow"
      ? 1 - phaseProgress * 0.35
      : phase === "done"
        ? 0.65
        : phase === "shelving" && phaseProgress > 0.85
          ? (phaseProgress - 0.85) / 0.15
          : 0;

  const filled = phase === "shelving" || phase === "afterglow" || phase === "done";

  useEffect(() => {
    if (!soundEnabled) return;
    const mark = (key: string, fn: () => void) => {
      if (played.current.has(key)) return;
      played.current.add(key);
      fn();
    };
    if (phase === "writing" && phaseProgress > 0.15 && phaseProgress < 0.2) {
      mark("pen1", () => playPenScratch());
    }
    if (phase === "writing" && phaseProgress > 0.45 && phaseProgress < 0.5) {
      mark("pen2", () => playPenScratch(0.1));
    }
    if (phase === "writing" && phaseProgress > 0.72 && phaseProgress < 0.77) {
      mark("pen3", () => playPenScratch(0.08));
    }
    if (phase === "pageFlip" && phaseProgress > 0.05) {
      mark("flip", playPageFlip);
    }
    if (phase === "closing" && phaseProgress > 0.88) {
      mark("close", playBookClose);
    }
    if (phase === "shelving" && phaseProgress > 0.05 && phaseProgress < 0.12) {
      mark("slide", playShelfSlide);
    }
    if (phase === "shelving" && phaseProgress > 0.84) {
      mark("settle", playShelfSettle);
    }
    if (phase === "afterglow" && phaseProgress > 0.1) {
      mark("chime", playSparkleChime);
    }
  }, [phase, phaseProgress, soundEnabled]);

  useFrame(({ clock }, delta) => {
    const cam = camRef.current;
    if (!cam) return;
    const key = CAMERA_KEYS[phase];
    const lerp = Math.min(1, delta * 2.8);
    cam.position.lerp(key.pos, lerp);
    lookAt.current.lerp(key.target, lerp);

    const closeImpact = phase === "closing" ? impactPulse(phaseProgress) : 0;
    if (closeImpact > 0) {
      cam.position.y += Math.sin(clock.elapsedTime * 70) * 0.006 * closeImpact;
      cam.position.x += Math.sin(clock.elapsedTime * 43) * 0.004 * closeImpact;
    }

    cam.lookAt(lookAt.current);

    if (keyLightRef.current) {
      keyLightRef.current.intensity =
        2.15 +
        (phase === "closing" ? impactPulse(phaseProgress) * 0.35 : 0) +
        shelfGlow * 0.22;
    }
  });

  const bookSparkles = phase === "writing" || phase === "closing";
  const shelfSparkles = phase === "afterglow" || phase === "shelving";

  return (
    <>
      <color attach="background" args={["#1a1510"]} />
      <fog attach="fog" args={["#1a1510", 4, 9]} />

      <PerspectiveCamera
        ref={camRef}
        makeDefault
        position={[0.15, 0.35, 2.65]}
        fov={42}
        near={0.1}
        far={20}
      />

      <ambientLight intensity={0.28} color="#c9a878" />
      <hemisphereLight args={["#c9a878", "#1a1510", 0.32]} />
      <spotLight
        ref={keyLightRef}
        position={[1.2, 2.8, 2.2]}
        angle={0.45}
        penumbra={0.6}
        intensity={2.2}
        color="#ffd89a"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-1.5, 1.2, 1]} intensity={0.35} color="#c9a227" />
      <pointLight position={[0, -0.5, 1.5]} intensity={0.2} color="#8b6914" />
      <pointLight
        position={[0, -1.38, 0.48]}
        intensity={0.15 + shelfGlow * 1.05}
        color="#d4af37"
      />

      {/* 机 */}
      <mesh position={[0, -0.55, 0]} receiveShadow>
        <boxGeometry args={[5.5, 0.12, 2.8]} />
        <primitive object={wood} attach="material" />
      </mesh>

      <ContactShadows
        position={[0, -0.48, 0]}
        opacity={0.55}
        scale={8}
        blur={2.4}
        far={4}
        color="#000000"
      />

      <group position={[0, -0.05, 0]}>
        <AntiqueBook
          phase={phase}
          phaseProgress={phaseProgress}
          lines={lines}
          heading={heading}
          shelfT={shelfT}
        />
      </group>

      <Bookshelf shelfGlow={shelfGlow} filled={filled && shelfT > 0.92} />

      <SparkleParticles
        active={bookSparkles}
        count={18}
        position={[0, 0.12, 0.28]}
        spread={[1.35, 0.95, 0.65]}
      />
      <SparkleParticles
        active={shelfSparkles}
        count={30}
        position={[0, -1.32, 0.2]}
        spread={[0.75, 0.7, 0.42]}
      />

      {/* 書庫の奥壁（外部 HDR 不要のローカル照明のみ） */}
      <mesh position={[0, 0.5, -2.2]} receiveShadow>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color="#14100c" roughness={0.95} />
      </mesh>
    </>
  );
}

export { TIMELINE };

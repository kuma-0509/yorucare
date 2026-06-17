"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { CinematicPhase } from "./use-cinematic-timeline";
import {
  BOOK,
  createGoldMaterial,
  createLeatherMaterial,
  createPaperMaterial,
} from "./materials";

interface AntiqueBookProps {
  phase: CinematicPhase;
  phaseProgress: number;
  lines: string[];
  heading?: string;
  /** 本棚スロットへの移動（0=机、1=収納完了） */
  shelfT: number;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function AntiqueBook({
  phase,
  phaseProgress,
  lines,
  heading,
  shelfT,
}: AntiqueBookProps) {
  const group = useRef<THREE.Group>(null);
  const coverRef = useRef<THREE.Group>(null);

  const leather = useMemo(() => createLeatherMaterial(), []);
  const leatherDark = useMemo(() => createLeatherMaterial("#3d2a20"), []);
  const gold = useMemo(() => createGoldMaterial(), []);
  const goldBand = useMemo(() => createGoldMaterial(), []);
  const paper = useMemo(() => createPaperMaterial(), []);

  const displayLines = lines.slice(0, 4);
  const visibleLineCount =
    phase === "writing"
      ? Math.min(displayLines.length, Math.floor(phaseProgress * 4) + 1)
      : displayLines.length;
  const pageFlipT = phase === "pageFlip" ? easeInOutCubic(phaseProgress) : 0;

  useFrame(() => {
    const cover = coverRef.current;
    const g = group.current;
    if (!cover || !g) return;

    let coverAngle = -2.55;
    if (phase === "writing" || phase === "pageFlip") coverAngle = -2.55;
    if (phase === "closing") {
      coverAngle = -2.55 + easeInOutCubic(phaseProgress) * 2.55;
    }
    if (
      phase === "spine" ||
      phase === "shelving" ||
      phase === "afterglow" ||
      phase === "done"
    ) {
      coverAngle = 0;
    }
    cover.rotation.y = coverAngle;

    let rotY = 0;
    let rotX = 0.04;
    if (phase === "spine") {
      rotY = -easeOutCubic(phaseProgress) * 1.56;
    } else if (phase === "shelving" || phase === "afterglow" || phase === "done") {
      rotY = -1.56;
      rotX = 0.04 + shelfT * 0.08;
    }

    g.rotation.y = rotY;
    g.rotation.x = rotX;

    const deskY = -0.05;
    const shelfY = -1.58;
    const shelfZ = -0.32;
    const t = easeInOutCubic(shelfT);
    const closeImpact =
      phase === "closing" && phaseProgress > 0.86
        ? Math.sin(((phaseProgress - 0.86) / 0.14) * Math.PI) * -0.025
        : 0;
    g.position.y = THREE.MathUtils.lerp(deskY, shelfY, t) + closeImpact;
    g.position.z = THREE.MathUtils.lerp(0, shelfZ, t);
    g.scale.setScalar(THREE.MathUtils.lerp(1, 0.36, t));

    const pulse =
      phase === "closing" && phaseProgress > 0.82
        ? 0.35 + Math.sin(phaseProgress * 20) * 0.15
        : phase === "afterglow"
          ? 0.25 * (1 - phaseProgress)
          : 0.08;
    gold.emissiveIntensity = pulse;
    goldBand.emissiveIntensity = pulse * 0.8;
  });

  const showPages =
    phase === "writing" ||
    phase === "pageFlip" ||
    (phase === "closing" && phaseProgress < 0.35);

  return (
    <group ref={group}>
      {/* 机・本棚上の接触影 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -BOOK.h / 2 - 0.02, 0]}
        receiveShadow
      >
        <circleGeometry args={[1.35, 32]} />
        <shadowMaterial opacity={0.38} />
      </mesh>

      {/* 背表紙 */}
      <mesh
        position={[-BOOK.w / 2 - BOOK.t / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[BOOK.t, BOOK.h, BOOK.t * 0.95]} />
        <primitive object={leatherDark} attach="material" />
      </mesh>

      {/* 背表紙の金線 */}
      {[-0.55, 0, 0.55].map((y) => (
        <mesh key={y} position={[-BOOK.w / 2 - BOOK.t / 2 - 0.01, y * BOOK.h * 0.35, 0]}>
          <boxGeometry args={[0.012, BOOK.h * 0.04, BOOK.t * 0.7]} />
          <primitive object={goldBand} attach="material" />
        </mesh>
      ))}
      {[-0.32, 0.32].map((y) => (
        <mesh key={`rib-${y}`} position={[-BOOK.w / 2 - BOOK.t / 2 - 0.015, y * BOOK.h, 0]}>
          <boxGeometry args={[0.03, BOOK.h * 0.055, BOOK.t * 0.95]} />
          <primitive object={leatherDark} attach="material" />
        </mesh>
      ))}

      {/* 裏表紙 */}
      <mesh position={[0, 0, -BOOK.t / 2 + BOOK.coverT / 2]} castShadow receiveShadow>
        <boxGeometry args={[BOOK.w, BOOK.h, BOOK.coverT]} />
        <primitive object={leather} attach="material" />
      </mesh>

      {/* ページ束 */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[BOOK.w - 0.08, BOOK.h - 0.12, BOOK.t - BOOK.coverT * 2]} />
        <primitive object={paper} attach="material" />
      </mesh>

      {/* 小口（ページ断面） */}
      <mesh position={[BOOK.w / 2 - 0.02, 0, 0]}>
        <boxGeometry args={[0.04, BOOK.h - 0.1, BOOK.t - 0.12]} />
        <meshStandardMaterial color="#ebe0c8" roughness={0.9} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            BOOK.w / 2 + 0.003,
            -BOOK.h * 0.42 + (i / 11) * BOOK.h * 0.84,
            0.002,
          ]}
        >
          <boxGeometry args={[0.006, 0.004, BOOK.t - 0.14]} />
          <meshStandardMaterial color="#c9b896" roughness={0.95} />
        </mesh>
      ))}

      {/* 表紙（左端ヒンジ） */}
      <group ref={coverRef} position={[-BOOK.w / 2, 0, BOOK.t / 2 - BOOK.coverT / 2]}>
        <mesh position={[BOOK.w / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[BOOK.w, BOOK.h, BOOK.coverT]} />
          <primitive object={leather} attach="material" />
        </mesh>
        {/* 金装飾フレーム */}
        <CoverGoldFrame material={gold} />
        <mesh position={[BOOK.w / 2, 0, BOOK.coverT / 2 + 0.014]}>
          <circleGeometry args={[0.25, 48]} />
          <meshStandardMaterial
            color="#2e2018"
            metalness={0.05}
            roughness={0.65}
          />
        </mesh>
        <mesh position={[BOOK.w / 2, 0, BOOK.coverT / 2 + 0.018]}>
          <torusGeometry args={[0.25, 0.012, 8, 64]} />
          <primitive object={gold} attach="material" />
        </mesh>
        <mesh position={[BOOK.w / 2, 0, BOOK.coverT / 2 + 0.02]}>
          <torusGeometry args={[0.11, 0.008, 8, 48]} />
          <primitive object={gold} attach="material" />
        </mesh>
      </group>

      {/* パラパラページ */}
      {phase === "pageFlip" &&
        [0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[
              -BOOK.w / 2 + 0.05 + i * 0.03,
              0,
              0.04 + i * 0.012 + pageFlipT * 0.04,
            ]}
            rotation={[0, -0.25 - pageFlipT * (1.1 + i * 0.2), 0]}
          >
            <boxGeometry args={[BOOK.w - 0.2, BOOK.h - 0.2, 0.008]} />
            <primitive object={paper} attach="material" />
          </mesh>
        ))}

      {/* 手書きテキスト（ページ上） */}
      {showPages && (
        <Html
          transform
          occlude
          distanceFactor={1.35}
          position={[0, 0, BOOK.t / 2 + 0.02]}
          style={{
            width: "220px",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            className="font-serif text-[10px] leading-relaxed text-[#3d2e24]"
            style={{ fontStyle: "italic" }}
          >
            {heading && (
              <p className="mb-1 text-[9px] tracking-widest text-[#6b5a42] not-italic">
                {heading}
              </p>
            )}
            {displayLines.slice(0, visibleLineCount).map((line, i) => (
              <p key={i} className="mb-1">
                {line}
              </p>
            ))}
          </div>
        </Html>
      )}

      {/* 背表紙ラベル（収納後も見える） */}
      {(phase === "spine" ||
        phase === "shelving" ||
        phase === "afterglow" ||
        phase === "done") && (
        <Html
          transform
          occlude
          distanceFactor={1.8}
          position={[-BOOK.w / 2 - BOOK.t / 2 - 0.06, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          style={{ pointerEvents: "none" }}
        >
          <p
            className="font-serif text-[8px] text-[#d4af37]"
            style={{ writingMode: "vertical-rl", textShadow: "0 0 6px rgba(201,162,39,0.4)" }}
          >
            {heading ?? "記録"}
          </p>
        </Html>
      )}
    </group>
  );
}

function CoverGoldFrame({ material }: { material: THREE.Material }) {
  const z = BOOK.coverT / 2 + 0.012;

  return (
    <>
      <mesh position={[BOOK.w / 2, BOOK.h / 2 - 0.14, z]}>
        <boxGeometry args={[BOOK.w - 0.36, 0.026, 0.014]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[BOOK.w / 2, -BOOK.h / 2 + 0.14, z]}>
        <boxGeometry args={[BOOK.w - 0.36, 0.026, 0.014]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[0.18, 0, z]}>
        <boxGeometry args={[0.026, BOOK.h - 0.36, 0.014]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[BOOK.w - 0.18, 0, z]}>
        <boxGeometry args={[0.026, BOOK.h - 0.36, 0.014]} />
        <primitive object={material} attach="material" />
      </mesh>
      {[
        [0.24, BOOK.h / 2 - 0.2],
        [BOOK.w - 0.24, BOOK.h / 2 - 0.2],
        [0.24, -BOOK.h / 2 + 0.2],
        [BOOK.w - 0.24, -BOOK.h / 2 + 0.2],
      ].map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, z + 0.003]}>
          <boxGeometry args={[0.12, 0.026, 0.014]} />
          <primitive object={material} attach="material" />
        </mesh>
      ))}
    </>
  );
}

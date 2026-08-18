"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { CinematicPhase } from "./use-cinematic-timeline";
import {
  BOOK,
  createGoldMaterial,
  createLeatherEdgeMaterial,
  createLeatherMaterial,
  createPaperMaterial,
} from "./materials";
import { PAGE_TEXT_WIDTH_PX, pageTextDistanceFactor } from "./framing";
import {
  DESK_POSE,
  SHELF_POSE,
  SPINE_POSE,
  computeShelfScale,
  getSlotLocalCenter,
  shelvedDepthOffset,
} from "./shelf-layout";

interface AntiqueBookProps {
  phase: CinematicPhase;
  phaseProgress: number;
  lines: string[];
  heading?: string;
  /** 本棚スロットへの移動（0=机、1=収納完了） */
  shelfT: number;
  /** 収納後の背表紙ラベル glow（0–1） */
  spineGlow?: number;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 背表紙のふくらみの外側の面。
 *
 * ふくらみは幅 `BOOK.t` の箱を中心 `-BOOK.w/2 - BOOK.t/2` に置いたものなので、
 * 外側の面はその半分ぶん先にある。**金線・帯・題箋をふくらみの中心を基準に置くと、
 * 箱の内側に埋まって1本も見えない。** 面を基準にして、そこから外へ出す。
 */
const SPINE_FACE_X = -BOOK.w / 2 - BOOK.t;

/** 収納直前のわずかな沈み込み */
function settleEase(t: number) {
  if (t < 0.82) return easeInOutCubic(t / 0.82) * 0.82;
  const tail = (t - 0.82) / 0.18;
  const bounce = Math.sin(tail * Math.PI) * 0.045 * (1 - tail);
  return 0.82 + tail * 0.18 - bounce;
}

export function AntiqueBook({
  phase,
  phaseProgress,
  lines,
  heading,
  shelfT,
  spineGlow = 0,
}: AntiqueBookProps) {
  const group = useRef<THREE.Group>(null);
  const coverRef = useRef<THREE.Group>(null);
  const shelfScale = useMemo(() => computeShelfScale(), []);
  const depthOffset = useMemo(() => shelvedDepthOffset(), []);
  const size = useThree((state) => state.size);
  const textFactor = pageTextDistanceFactor(size.width / size.height);

  const leather = useMemo(() => createLeatherMaterial(), []);
  const leatherDark = useMemo(() => createLeatherMaterial("#3d2a20"), []);
  const leatherEdge = useMemo(() => createLeatherEdgeMaterial(), []);
  const gold = useMemo(() => createGoldMaterial(), []);
  const goldBand = useMemo(() => createGoldMaterial(), []);
  const paper = useMemo(() => createPaperMaterial(), []);

  const displayLines = lines.slice(0, 4);
  const visibleLineCount =
    phase === "writing"
      ? Math.min(displayLines.length, Math.floor(phaseProgress * 4) + 1)
      : displayLines.length;
  const pageFlipT = phase === "pageFlip" ? easeInOutCubic(phaseProgress) : 0;

  const isShelved =
    phase === "shelving" || phase === "afterglow" || phase === "done";

  useFrame(() => {
    const cover = coverRef.current;
    const g = group.current;
    if (!cover || !g) return;

    let coverAngle = -2.55;
    if (phase === "writing" || phase === "pageFlip") coverAngle = -2.55;
    if (phase === "closing") {
      coverAngle = -2.55 + easeInOutCubic(phaseProgress) * 2.55;
    }
    if (isShelved) coverAngle = 0;
    cover.rotation.y = coverAngle;

    const slotCenter = getSlotLocalCenter();
    const deskPos = DESK_POSE.position;
    const deskScale = DESK_POSE.scale;

    if (!isShelved && phase !== "spine") {
      g.rotation.y = DESK_POSE.rotationY;
      g.rotation.x = DESK_POSE.rotationX;
      g.position.copy(deskPos);
      g.scale.copy(deskScale);
    } else if (phase === "spine") {
      const spineT = easeOutCubic(phaseProgress);
      g.rotation.y = THREE.MathUtils.lerp(
        DESK_POSE.rotationY,
        SPINE_POSE.rotationY,
        spineT
      );
      g.rotation.x = THREE.MathUtils.lerp(
        DESK_POSE.rotationX,
        SPINE_POSE.rotationX,
        spineT
      );
      g.position.copy(deskPos);
      g.position.y += spineT * 0.04;
      g.scale.copy(deskScale);
    } else {
      const t = settleEase(shelfT);
      const moveT = easeInOutCubic(Math.min(1, t / 0.92));

      // 背表紙を見せた向きから、棚に差し込む向きへ戻すだけにする。
      // 前の段の角度を始点にしないと、収納の入りで本が一度回り直す
      g.rotation.y = THREE.MathUtils.lerp(
        SPINE_POSE.rotationY,
        SHELF_POSE.rotationY,
        moveT
      );
      g.rotation.x = THREE.MathUtils.lerp(
        SPINE_POSE.rotationX,
        SHELF_POSE.rotationX,
        moveT
      );

      g.position.x = THREE.MathUtils.lerp(deskPos.x, slotCenter.x, moveT);
      g.position.y = THREE.MathUtils.lerp(deskPos.y, slotCenter.y, moveT);
      g.position.z = THREE.MathUtils.lerp(
        deskPos.z,
        slotCenter.z + depthOffset,
        moveT
      );

      if (shelfT > 0.78) {
        const settle = Math.sin(((shelfT - 0.78) / 0.22) * Math.PI) * 0.018;
        g.position.z -= settle;
      }

      /*
        飛んでいる間は高さの比率で一様に縮め、棚の口へ入ってから
        背表紙の幅と奥行きを詰める。**最初から非均一に潰すと、
        机の上の本が空中で紙のように薄くなる。**
      */
      const flight = THREE.MathUtils.lerp(deskScale.y, shelfScale.y, moveT);
      const fitBlend = easeInOutCubic(
        THREE.MathUtils.clamp((moveT - 0.55) / 0.45, 0, 1)
      );
      g.scale.set(
        THREE.MathUtils.lerp(flight, shelfScale.x, fitBlend),
        THREE.MathUtils.lerp(flight, shelfScale.y, fitBlend),
        THREE.MathUtils.lerp(flight, shelfScale.z, fitBlend)
      );
    }

    const closeImpact =
      phase === "closing" && phaseProgress > 0.86
        ? Math.sin(((phaseProgress - 0.86) / 0.14) * Math.PI) * -0.028
        : 0;
    g.position.y += closeImpact;

    const pulse =
      phase === "closing" && phaseProgress > 0.82
        ? 0.22 + Math.sin(phaseProgress * 18) * 0.08
        : spineGlow > 0
          ? 0.12 + spineGlow * 0.35
          : 0.06;
    gold.emissiveIntensity = pulse;
    goldBand.emissiveIntensity = pulse * 0.75;
  });

  const showPages =
    phase === "writing" ||
    phase === "pageFlip" ||
    (phase === "closing" && phaseProgress < 0.35);

  const pageW = BOOK.w - BOOK.pageInset * 2;
  const pageH = BOOK.h - BOOK.pageInset * 2;
  const pageT = BOOK.t - BOOK.coverT * 2;

  return (
    <group ref={group}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -BOOK.h / 2 - 0.02, 0]}
        receiveShadow
      >
        <circleGeometry args={[1.35, 32]} />
        <shadowMaterial opacity={isShelved && shelfT > 0.85 ? 0.22 : 0.38} />
      </mesh>

      <mesh
        position={[-BOOK.w / 2 - BOOK.t / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[BOOK.t, BOOK.h, BOOK.t * 0.92]} />
        <primitive object={leatherDark} attach="material" />
      </mesh>

      {[-0.52, 0.52].map((y) => (
        <mesh
          key={y}
          position={[SPINE_FACE_X - 0.005, y * BOOK.h * 0.34, 0]}
        >
          <boxGeometry args={[0.01, BOOK.h * 0.035, BOOK.t * 0.72]} />
          <primitive object={goldBand} attach="material" />
        </mesh>
      ))}
      {[-0.3, 0.3].map((y) => (
        <mesh
          key={`rib-${y}`}
          position={[SPINE_FACE_X - 0.014, y * BOOK.h * 0.92, 0]}
        >
          <boxGeometry args={[0.028, BOOK.h * 0.05, BOOK.t * 0.9]} />
          <primitive object={leatherDark} attach="material" />
        </mesh>
      ))}

      {/*
        題箋（背表紙の札）。金を前面に置くと札全体が金の板になって
        日付が読めないので、金は縁として後ろに、暗い革の札を前に重ねる
      */}
      <group position={[SPINE_FACE_X - 0.003, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.005, BOOK.h * 0.38, BOOK.t * 0.55]} />
          <primitive object={goldBand} attach="material" />
        </mesh>
        <mesh position={[-0.004, 0, 0]}>
          <boxGeometry args={[0.004, BOOK.h * 0.34, BOOK.t * 0.46]} />
          <meshStandardMaterial color="#2a1e14" roughness={0.85} />
        </mesh>
      </group>

      <mesh position={[0, 0, -BOOK.t / 2 + BOOK.coverT / 2]} castShadow receiveShadow>
        <boxGeometry args={[BOOK.w, BOOK.h, BOOK.coverT]} />
        <primitive object={leather} attach="material" />
      </mesh>

      {[
        [BOOK.w / 2 - 0.06, BOOK.h / 2 - 0.06, BOOK.t / 2],
        [BOOK.w / 2 - 0.06, -BOOK.h / 2 + 0.06, BOOK.t / 2],
        [-BOOK.w / 2 + 0.06, BOOK.h / 2 - 0.06, -BOOK.t / 2 + BOOK.coverT],
        [-BOOK.w / 2 + 0.06, -BOOK.h / 2 + 0.06, -BOOK.t / 2 + BOOK.coverT],
      ].map(([x, y, z], i) => (
        <mesh key={`edge-${i}`} position={[x, y, z]}>
          <boxGeometry args={[0.1, 0.1, BOOK.coverT * 0.9]} />
          <primitive object={leatherEdge} attach="material" />
        </mesh>
      ))}

      {[0, 0.012, 0.024].map((inset, i) => (
        <mesh
          key={`pages-${i}`}
          position={[inset * 0.5, 0, inset * 0.3]}
          castShadow={i === 0}
        >
          <boxGeometry
            args={[
              pageW - inset * 2,
              pageH - inset * 0.6,
              pageT - inset * 1.2,
            ]}
          />
          <primitive object={paper} attach="material" />
        </mesh>
      ))}

      <mesh position={[BOOK.w / 2 - 0.025, 0, 0]}>
        <boxGeometry args={[0.035, pageH + 0.04, pageT - 0.06]} />
        <meshStandardMaterial color="#ebe0c8" roughness={0.92} />
      </mesh>
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            BOOK.w / 2 + 0.002,
            -pageH * 0.44 + (i / 13) * pageH * 0.88,
            0.003,
          ]}
        >
          <boxGeometry args={[0.005, 0.0035, pageT - 0.1]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#d8ccb0" : "#c9b896"}
            roughness={0.95}
          />
        </mesh>
      ))}

      <group ref={coverRef} position={[-BOOK.w / 2, 0, BOOK.t / 2 - BOOK.coverT / 2]}>
        <mesh position={[BOOK.w / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[BOOK.w, BOOK.h, BOOK.coverT]} />
          <primitive object={leather} attach="material" />
        </mesh>
        <CoverGoldFrame material={gold} />
        <mesh position={[BOOK.w / 2, 0, BOOK.coverT / 2 + 0.012]}>
          <circleGeometry args={[0.22, 48]} />
          <meshStandardMaterial color="#2e2018" roughness={0.68} metalness={0.04} />
        </mesh>
        <mesh position={[BOOK.w / 2, 0, BOOK.coverT / 2 + 0.016]}>
          <torusGeometry args={[0.22, 0.01, 8, 64]} />
          <primitive object={gold} attach="material" />
        </mesh>
        <mesh position={[BOOK.w / 2, 0, BOOK.coverT / 2 + 0.018]}>
          <torusGeometry args={[0.095, 0.007, 8, 48]} />
          <primitive object={gold} attach="material" />
        </mesh>
      </group>

      {phase === "pageFlip" &&
        [0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[
              -BOOK.w / 2 + 0.06 + i * 0.028,
              0,
              0.035 + i * 0.01 + pageFlipT * 0.035,
            ]}
            rotation={[0, -0.22 - pageFlipT * (1.05 + i * 0.18), 0]}
          >
            <boxGeometry args={[pageW - 0.12, pageH - 0.08, 0.007]} />
            <primitive object={paper} attach="material" />
          </mesh>
        ))}

      {showPages && (
        <Html
          transform
          occlude
          distanceFactor={textFactor}
          position={[0, 0, BOOK.t / 2 + 0.02]}
          style={{
            width: `${PAGE_TEXT_WIDTH_PX}px`,
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

      {(phase === "spine" || isShelved) && (
        <Html
          transform
          /*
            題箋の上に載るだけで、間に入るものが無い。遮蔽の判定は
            毎フレームの ray を1本増やすだけになるので付けない
          */
          distanceFactor={3.2}
          position={[SPINE_FACE_X - 0.03, 0, 0]}
          /*
            背表紙は本のローカル -X 側にある。棚姿勢（Y軸 +90°）で
            ラベルが手前を向くよう、ここで -90° 戻しておく
          */
          rotation={[0, -Math.PI / 2, 0]}
          style={{ pointerEvents: "none" }}
        >
          <p
            className="font-serif text-[8px] text-[#d4af37]"
            style={{
              writingMode: "vertical-rl",
              textShadow: `0 0 ${6 + spineGlow * 8}px rgba(201,162,39,${0.35 + spineGlow * 0.45})`,
            }}
          >
            {heading ?? "記録"}
          </p>
        </Html>
      )}
    </group>
  );
}

function CoverGoldFrame({ material }: { material: THREE.Material }) {
  const z = BOOK.coverT / 2 + 0.011;

  return (
    <>
      <mesh position={[BOOK.w / 2, BOOK.h / 2 - 0.13, z]}>
        <boxGeometry args={[BOOK.w - 0.34, 0.022, 0.012]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[BOOK.w / 2, -BOOK.h / 2 + 0.13, z]}>
        <boxGeometry args={[BOOK.w - 0.34, 0.022, 0.012]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[0.17, 0, z]}>
        <boxGeometry args={[0.022, BOOK.h - 0.34, 0.012]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[BOOK.w - 0.17, 0, z]}>
        <boxGeometry args={[0.022, BOOK.h - 0.34, 0.012]} />
        <primitive object={material} attach="material" />
      </mesh>
      {[
        [0.22, BOOK.h / 2 - 0.19],
        [BOOK.w - 0.22, BOOK.h / 2 - 0.19],
        [0.22, -BOOK.h / 2 + 0.19],
        [BOOK.w - 0.22, -BOOK.h / 2 + 0.19],
      ].map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, z + 0.002]}>
          <boxGeometry args={[0.11, 0.022, 0.012]} />
          <primitive object={material} attach="material" />
        </mesh>
      ))}
    </>
  );
}

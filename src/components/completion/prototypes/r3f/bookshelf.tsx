"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createWoodMaterial } from "./materials";

const SHELF_BOOKS = [
  { color: "#3d2a20", h: 0.72, label: "記" },
  { color: "#4a2828", h: 0.66, label: "録" },
  { color: "#2a3d32", h: 0.78, label: "庫" },
  null,
  { color: "#3a2e42", h: 0.62, label: "蔵" },
  { color: "#4a3228", h: 0.74, label: "書" },
  { color: "#2e3a4a", h: 0.68, label: "架" },
] as const;

const EMPTY_SLOT = 3;

interface BookshelfProps {
  /** 本が収納された後の揺れ・光 */
  shelfGlow: number;
  filled: boolean;
}

export function Bookshelf({ shelfGlow, filled }: BookshelfProps) {
  const rowRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const wood = useMemo(() => createWoodMaterial(), []);

  useFrame(() => {
    if (rowRef.current && filled) {
      const wobble = Math.sin(shelfGlow * Math.PI * 3) * 0.012 * (1 - shelfGlow);
      rowRef.current.rotation.z = wobble;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = filled ? shelfGlow * 0.55 : 0;
    }
  });

  return (
    <group position={[0, -1.55, 0.05]}>
      <mesh position={[-2.16, -0.03, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.12, 1.02, 0.62]} />
        <primitive object={wood} attach="material" />
      </mesh>
      <mesh position={[2.16, -0.03, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.12, 1.02, 0.62]} />
        <primitive object={wood} attach="material" />
      </mesh>
      <mesh position={[0, 0.43, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.35, 0.12, 0.62]} />
        <primitive object={wood} attach="material" />
      </mesh>

      {/* 本棚板 */}
      <mesh position={[0, -0.42, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.2, 0.14, 0.55]} />
        <primitive object={wood} attach="material" />
      </mesh>
      <mesh position={[0, 0.02, -0.18]} receiveShadow>
        <boxGeometry args={[4.1, 0.85, 0.08]} />
        <meshStandardMaterial color="#2a2018" roughness={0.9} />
      </mesh>

      {/* 収納時の祝福の光 */}
      <mesh ref={glowRef} position={[0, 0.05, 0.12]}>
        <planeGeometry args={[0.55, 0.95]} />
        <meshBasicMaterial
          color="#c9a227"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <group ref={rowRef} position={[0, -0.08, 0.08]}>
        {SHELF_BOOKS.map((book, i) => {
          const x = (i - 3) * 0.28;
          if (book === null) {
            return (
              <group key={i} position={[x, 0, 0]}>
                {/* 空きスロット — 影の落ちた溝 */}
                <mesh position={[0, bookHeight(0.58) / 2 - 0.35, -0.02]}>
                  <boxGeometry args={[0.22, bookHeight(0.58), 0.32]} />
                  <meshStandardMaterial color="#1a1510" roughness={1} />
                </mesh>
                {!filled && (
                  <mesh position={[0, 0.02, 0.04]}>
                    <boxGeometry args={[0.18, 0.04, 0.02]} />
                    <meshBasicMaterial color="#c9a227" transparent opacity={0.12} />
                  </mesh>
                )}
                <mesh position={[-0.13, -0.03, 0.08]}>
                  <boxGeometry args={[0.015, 0.62, 0.04]} />
                  <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={filled ? 0.18 : 0.28}
                    depthWrite={false}
                  />
                </mesh>
                <mesh position={[0.13, -0.03, 0.08]}>
                  <boxGeometry args={[0.015, 0.62, 0.04]} />
                  <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={filled ? 0.18 : 0.28}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          }
          const h = bookHeight(book.h);
          const nudge = filled
            ? i === EMPTY_SLOT - 1
              ? -0.014
              : i === EMPTY_SLOT + 1
                ? 0.014
                : 0
            : 0;
          return (
            <group key={i} position={[x + nudge, 0, 0]} rotation={[0, 0, nudge * -0.9]}>
              <mesh position={[0, h / 2 - 0.35, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.18, h, 0.34]} />
                <meshStandardMaterial color={book.color} roughness={0.7} metalness={0.03} />
              </mesh>
              <mesh position={[0.1, h / 2 - 0.35, 0]}>
                <boxGeometry args={[0.03, h * 0.92, 0.28]} />
                <meshStandardMaterial color="#d8ccb0" roughness={0.85} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

function bookHeight(ratio: number) {
  return ratio;
}

export { EMPTY_SLOT };

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  createGoldMaterial,
  createShelfSpineMaterial,
  createWoodMaterial,
} from "./materials";
import { SHELF_LAYOUT, getSlotRowPosition } from "./shelf-layout";

const SHELF_BOOKS = [
  { color: "#3d2a20", h: 0.72, label: "記" },
  { color: "#4a2828", h: 0.66, label: "録" },
  { color: "#2a3d32", h: 0.78, label: "庫" },
  null,
  { color: "#3a2e42", h: 0.62, label: "蔵" },
  { color: "#4a3228", h: 0.74, label: "書" },
  { color: "#2e3a4a", h: 0.68, label: "架" },
] as const;

interface BookshelfProps {
  shelfGlow: number;
  filled: boolean;
  shelfT?: number;
}

export function Bookshelf({ shelfGlow, filled, shelfT = 0 }: BookshelfProps) {
  const rowRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const slotGlowRef = useRef<THREE.Mesh>(null);
  const wood = useMemo(() => createWoodMaterial(), []);
  const spineMat = useMemo(() => createShelfSpineMaterial(), []);
  const gold = useMemo(() => createGoldMaterial(), []);
  const slotPos = useMemo(() => getSlotRowPosition(), []);

  useFrame(() => {
    if (rowRef.current && filled) {
      const wobble = Math.sin(shelfGlow * Math.PI * 2.2) * 0.006 * (1 - shelfGlow * 0.6);
      rowRef.current.rotation.z = wobble;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = filled ? shelfGlow * 0.38 : 0;
    }
    if (slotGlowRef.current) {
      const mat = slotGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = filled ? 0.08 + shelfGlow * 0.22 : 0;
    }
    if (filled && shelfT > 0.9) {
      gold.emissiveIntensity = 0.08 + shelfGlow * 0.28;
    }
  });

  const showPlacedBook = filled && shelfT > 0.88;

  return (
    <group position={[0, SHELF_LAYOUT.groupY, SHELF_LAYOUT.groupZ]}>
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
      <mesh position={[0, -0.42, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.2, 0.14, 0.55]} />
        <primitive object={wood} attach="material" />
      </mesh>
      <mesh position={[0, 0.02, -0.18]} receiveShadow>
        <boxGeometry args={[4.1, 0.85, 0.08]} />
        <meshStandardMaterial color="#1a1410" roughness={0.95} />
      </mesh>

      <mesh ref={glowRef} position={[0, 0.05, 0.1]}>
        <planeGeometry args={[3.8, 0.88]} />
        <meshBasicMaterial
          color="#c9a227"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <group ref={rowRef} position={[0, SHELF_LAYOUT.rowY, SHELF_LAYOUT.rowZ]}>
        {SHELF_BOOKS.map((book, i) => {
          const x = (i - 3) * SHELF_LAYOUT.slotSpacing;
          if (book === null) {
            return (
              <group key={i} position={[x, 0, 0]}>
                <mesh position={[0, slotHeight(0.58) / 2 - 0.35, -0.04]}>
                  <boxGeometry args={[0.24, slotHeight(0.58), 0.36]} />
                  <meshStandardMaterial color="#120e0a" roughness={1} />
                </mesh>
                <mesh position={[-0.125, -0.02, 0.02]}>
                  <boxGeometry args={[0.012, 0.64, 0.38]} />
                  <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={showPlacedBook ? 0.12 : 0.32}
                    depthWrite={false}
                  />
                </mesh>
                <mesh position={[0.125, -0.02, 0.02]}>
                  <boxGeometry args={[0.012, 0.64, 0.38]} />
                  <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={showPlacedBook ? 0.12 : 0.32}
                    depthWrite={false}
                  />
                </mesh>
                {!showPlacedBook && (
                  <mesh position={[0, 0.02, 0.06]}>
                    <boxGeometry args={[0.16, 0.03, 0.015]} />
                    <meshBasicMaterial color="#c9a227" transparent opacity={0.1} />
                  </mesh>
                )}
                <mesh ref={slotGlowRef} position={[0, 0.02, 0.14]}>
                  <planeGeometry args={[0.14, 0.42]} />
                  <meshBasicMaterial
                    color="#d4af37"
                    transparent
                    opacity={0}
                    depthWrite={false}
                  />
                </mesh>
                {showPlacedBook && (
                  <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, -0.36, 0.04]}
                    receiveShadow
                  >
                    <planeGeometry args={[0.2, 0.34]} />
                    <shadowMaterial opacity={0.45} />
                  </mesh>
                )}
              </group>
            );
          }

          const h = slotHeight(book.h);
          const nudge = showPlacedBook
            ? i === SHELF_LAYOUT.emptySlotIndex - 1
              ? -0.012
              : i === SHELF_LAYOUT.emptySlotIndex + 1
                ? 0.012
                : 0
            : 0;

          return (
            <group
              key={i}
              position={[x + nudge, 0, 0]}
              rotation={[0, 0, nudge * -0.6]}
            >
              <mesh position={[0, h / 2 - 0.35, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.18, h, 0.34]} />
                <meshStandardMaterial
                  color={book.color}
                  roughness={0.72}
                  metalness={0.03}
                />
              </mesh>
              <mesh position={[0.092, h / 2 - 0.35, 0]}>
                <boxGeometry args={[0.028, h * 0.9, 0.28]} />
                <meshStandardMaterial color="#d8ccb0" roughness={0.88} />
              </mesh>
            </group>
          );
        })}

        {showPlacedBook && (
          <group position={[slotPos.x, slotPos.y, slotPos.z]}>
            <mesh position={[0, SHELF_LAYOUT.slotHeight / 2 - 0.35, 0]}>
              <boxGeometry
                args={[
                  SHELF_LAYOUT.slotSpineWidth * 0.92,
                  SHELF_LAYOUT.slotHeight,
                  SHELF_LAYOUT.slotDepth,
                ]}
              />
              <meshStandardMaterial
                color="#4a3228"
                roughness={0.68}
                transparent
                opacity={0.08}
                depthWrite={false}
              />
            </mesh>
            <mesh position={[0.088, SHELF_LAYOUT.slotHeight / 2 - 0.35, 0]}>
              <boxGeometry args={[0.024, SHELF_LAYOUT.slotHeight * 0.55, 0.26]} />
              <primitive object={spineMat} attach="material" />
            </mesh>
            <mesh position={[0.098, SHELF_LAYOUT.slotHeight / 2 - 0.35, 0]}>
              <boxGeometry args={[0.008, SHELF_LAYOUT.slotHeight * 0.42, 0.22]} />
              <primitive object={gold} attach="material" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

function slotHeight(ratio: number) {
  return ratio;
}

export { SHELF_LAYOUT };

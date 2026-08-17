"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { getGlowSprite } from "./materials";

interface GlowSpriteProps {
  position: [number, number, number];
  /** 0 のときは何も描かない */
  intensity: number;
  /** 広がり（ワールド単位） */
  size: number;
  color?: string;
}

/**
 * 光っているものの周りへ置く、加算合成の板。
 *
 * **全画面のブルームパスは入れない。** ポストプロセスのブルームは、明るさの抽出と
 * 複数回のぼかしを毎フレーム画面全体に掛ける。9秒とはいえ、スマートフォンでは
 * その全画面処理ぶんだけ素直に発熱する。ここで欲しいのは「金と灯りの周りがにじむ」
 * ことだけなので、光源の位置に板を1枚ずつ置いて加算で塗る。
 * 塗る面積は画面のごく一部で、ぼかしのパスも増えない。
 */
export function GlowSprite({
  position,
  intensity,
  size,
  color = "#ffd89a",
}: GlowSpriteProps) {
  const texture = useMemo(() => getGlowSprite(), []);

  if (intensity <= 0.001) return null;

  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={THREE.MathUtils.clamp(intensity, 0, 1)}
        blending={THREE.AdditiveBlending}
        // 手前のものには隠れてほしいので深度は見る。ただし深度は書かない
        depthWrite={false}
        depthTest
        // 加算合成に霧を掛けると、遠いものほど明るくなって逆になる
        fog={false}
        toneMapped={false}
      />
    </sprite>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGlowSprite } from "./materials";

interface GlowSpriteProps {
  position: [number, number, number];
  /**
   * 0 のときは何も描かない。
   *
   * 関数を渡すと毎フレーム読み直し、板の表示と濃さだけを直に書き換える。
   * にじみの強さは演出の途中で連続して変わるので、数値を props で渡すと
   * その値を出すためにシーンの再描画が要る。
   */
  intensity: number | (() => number);
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
  const spriteRef = useRef<THREE.Sprite>(null);
  const readRef = useRef(intensity);
  readRef.current = intensity;

  useFrame(() => {
    const read = readRef.current;
    const sprite = spriteRef.current;
    if (typeof read !== "function" || !sprite) return;
    const value = read();
    // 板ごと消しておけば、濃さ0の板を毎フレーム塗ることにはならない
    sprite.visible = value > 0.001;
    if (!sprite.visible) return;
    (sprite.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.clamp(
      value,
      0,
      1
    );
  });

  const initial = typeof intensity === "function" ? intensity() : intensity;

  if (typeof intensity !== "function" && initial <= 0.001) return null;

  return (
    <sprite
      ref={spriteRef}
      position={position}
      scale={[size, size, 1]}
      visible={initial > 0.001}
    >
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={THREE.MathUtils.clamp(initial, 0, 1)}
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

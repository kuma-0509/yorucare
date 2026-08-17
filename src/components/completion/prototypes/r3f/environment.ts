"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 書庫の環境光。
 *
 * 外部のHDRも drei の Environment preset も使わない（管理表 2026-08-15 の判断）。
 * 代わりに、64×32 の小さなグラデーションをその場で作って PMREM へ通し、
 * `scene.environment` に入れる。取得するファイルは無い。
 *
 * これが要る理由: 金と革は、直接光だけでは面の向きが変わっても色がほとんど動かない。
 * 特に metalness の高い金は、映り込む先が無いと暗い場所でほぼ黒く沈む。
 * 弱い環境光を1枚入れるだけで、背表紙の金が「暗がりの中で鈍く光る」ようになる。
 */

const WIDTH = 64;
const HEIGHT = 32;

/** ランプの向き（equirect の u）。キーライト（右上手前）と揃える */
const LAMP_U = 0.62;
const LAMP_V = 0.18;

function createArchiveEquirect(): THREE.DataTexture {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y++) {
    const v = y / (HEIGHT - 1);
    // 上（天井側）は暖かく、下（床側）は沈める
    const vertical = Math.pow(1 - v, 1.7);

    for (let x = 0; x < WIDTH; x++) {
      const u = x / (WIDTH - 1);
      // u は円周なので、端をまたぐ距離を取る
      const du = Math.min(Math.abs(u - LAMP_U), 1 - Math.abs(u - LAMP_U));
      const dv = v - LAMP_V;
      const lamp = Math.exp(-((du * du) / 0.012 + (dv * dv) / 0.02));

      const warm = vertical * 0.34 + lamp * 0.78;
      const i = (y * WIDTH + x) * 4;
      data[i] = Math.round(THREE.MathUtils.clamp(warm * 255, 6, 255));
      data[i + 1] = Math.round(THREE.MathUtils.clamp(warm * 218, 5, 255));
      data[i + 2] = Math.round(THREE.MathUtils.clamp(warm * 158, 4, 255));
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, WIDTH, HEIGHT, THREE.RGBAFormat);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function useArchiveEnvironment(): void {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    let target: THREE.WebGLRenderTarget | null = null;
    const source = createArchiveEquirect();

    try {
      const pmrem = new THREE.PMREMGenerator(gl);
      target = pmrem.fromEquirectangular(source);
      scene.environment = target.texture;
      pmrem.dispose();
    } catch {
      // 環境光を作れない環境でも、直接光だけで演出は最後まで流れる
      scene.environment = null;
    }

    source.dispose();

    return () => {
      scene.environment = null;
      target?.dispose();
    };
  }, [gl, scene]);
}

import * as THREE from "three";

export const BOOK = {
  w: 2.85,
  h: 1.85,
  t: 0.5,
  coverT: 0.075,
  pageInset: 0.1,
} as const;

/**
 * 表面の質感は、外部のGLB・HDR・テクスチャ画像を読まず、その場で作った
 * 法線マップと粗さマップで出す。
 *
 * GLBを採用しなかった理由:
 * - 追加のダウンロードが要る。「書庫にしまう」を選んだ瞬間から9秒の演出が始まるので、
 *   その頭に数百KB〜数MBの取得を挟むと、待ち時間がそのまま体験に乗る。
 * - 弱いのは形ではなく光の返り方だった。箱で組んだ本のシルエットは実物と大きく違わない一方、
 *   一様な roughness のせいで革も紙も金も同じ照り方をしていた。ここは法線と粗さの
 *   ムラで直せる。
 * - リポジトリはバイナリの原本を追跡対象から外す方針で運用している（管理表 2026-08-01 の行）。
 */

type GrainKind = "leather" | "paper" | "wood";

/** 格子上のハッシュ。period で折り返して、繰り返しても継ぎ目が出ないようにする */
function hash2(x: number, y: number, period: number): number {
  const xi = ((x % period) + period) % period;
  const yi = ((y % period) + period) % period;
  const s = Math.sin(xi * 127.1 + yi * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, y: number, period: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, period);
  const b = hash2(xi + 1, yi, period);
  const c = hash2(xi, yi + 1, period);
  const d = hash2(xi + 1, yi + 1, period);
  return (
    a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
  );
}

function fbm(x: number, y: number, period: number, octaves: number): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, y * freq, period * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** 0–1 の高さ場。素材ごとに粒の向きと細かさを変える */
function heightField(kind: GrainKind, size: number): Float32Array {
  const out = new Float32Array(size * size);
  const period = 8;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * period;
      const v = (y / size) * period;
      let h: number;

      if (kind === "leather") {
        // 不規則な革のシボ。粗い塊の上に細かいひび
        h = fbm(u, v, period, 4) * 0.72 + fbm(u * 3.1, v * 3.1, period * 3, 3) * 0.28;
      } else if (kind === "paper") {
        // 紙の繊維。ごく浅く、細かい
        h = fbm(u * 4.2, v * 4.2, period * 4, 3);
      } else {
        // 木目。板の長手（x）方向へ伸ばし、年輪の縞を重ねる
        const grain = fbm(u * 0.6, v * 7.5, period, 3);
        const rings = Math.abs(Math.sin((v * 2.1 + grain * 1.6) * Math.PI));
        h = grain * 0.55 + rings * 0.45;
      }

      out[y * size + x] = h;
    }
  }

  return out;
}

function wrapIndex(i: number, size: number): number {
  return ((i % size) + size) % size;
}

/** 高さ場から法線マップを作る。隣との差を法線へ変換するだけ */
function normalTextureFrom(
  height: Float32Array,
  size: number,
  strength: number,
  repeat: number
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = height[y * size + wrapIndex(x - 1, size)];
      const right = height[y * size + wrapIndex(x + 1, size)];
      const up = height[wrapIndex(y - 1, size) * size + x];
      const down = height[wrapIndex(y + 1, size) * size + x];

      const dx = (right - left) * strength;
      const dy = (down - up) * strength;
      const len = Math.hypot(dx, dy, 1);

      const i = (y * size + x) * 4;
      data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((1 / len) * 0.5 * 255 + 127.5);
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.needsUpdate = true;
  return texture;
}

/**
 * 高さ場から粗さマップを作る。
 * 高いところ（山）はこすれて艶が出るので粗さを下げ、低いところは粗くする。
 * これで一様な照りが消え、光が動いたときに面が読めるようになる。
 */
function roughnessTextureFrom(
  height: Float32Array,
  size: number,
  min: number,
  max: number,
  repeat: number
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);

  for (let p = 0; p < height.length; p++) {
    const value = THREE.MathUtils.clamp(
      max - (max - min) * height[p],
      0,
      1
    );
    const byte = Math.round(value * 255);
    const i = p * 4;
    data[i] = byte;
    data[i + 1] = byte;
    data[i + 2] = byte;
    data[i + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.needsUpdate = true;
  return texture;
}

interface SurfaceMaps {
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
  normalScale: THREE.Vector2;
}

/**
 * 素材ごとの法線・粗さマップ。同じ素材は1組を使い回す。
 * 生成は1回きり（128×128）なので、演出中に作り直すことはない。
 */
const surfaceCache = new Map<GrainKind, SurfaceMaps>();

function surfaceMaps(kind: GrainKind): SurfaceMaps {
  const cached = surfaceCache.get(kind);
  if (cached) return cached;

  const size = kind === "paper" ? 96 : 128;
  const height = heightField(kind, size);

  const spec = {
    leather: { strength: 9, repeat: 4, rough: [0.42, 0.78] as const, scale: 0.85 },
    paper: { strength: 4, repeat: 6, rough: [0.72, 0.98] as const, scale: 0.4 },
    wood: { strength: 7, repeat: 3, rough: [0.55, 0.92] as const, scale: 0.7 },
  }[kind];

  const maps: SurfaceMaps = {
    normalMap: normalTextureFrom(height, size, spec.strength, spec.repeat),
    roughnessMap: roughnessTextureFrom(
      height,
      size,
      spec.rough[0],
      spec.rough[1],
      spec.repeat
    ),
    normalScale: new THREE.Vector2(spec.scale, spec.scale),
  };

  surfaceCache.set(kind, maps);
  return maps;
}

/**
 * 環境光の効き。scene.environment（この演出では手作りのグラデーション）を
 * どれだけ拾うか。強くしすぎると夜の書庫に見えなくなるので控えめにする。
 */
const ENV_INTENSITY = {
  leather: 0.5,
  paper: 0.35,
  gold: 1.15,
  wood: 0.4,
} as const;

export function createLeatherMaterial(color = "#4a3228"): THREE.MeshStandardMaterial {
  const maps = surfaceMaps("leather");
  return new THREE.MeshStandardMaterial({
    color,
    normalMap: maps.normalMap,
    normalScale: maps.normalScale.clone(),
    roughnessMap: maps.roughnessMap,
    roughness: 1,
    metalness: 0.06,
    envMapIntensity: ENV_INTENSITY.leather,
  });
}

/** 表紙端の摩耗した革 */
export function createLeatherEdgeMaterial(): THREE.MeshStandardMaterial {
  const maps = surfaceMaps("leather");
  return new THREE.MeshStandardMaterial({
    color: "#352418",
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: maps.roughnessMap,
    roughness: 1,
    metalness: 0.02,
    envMapIntensity: ENV_INTENSITY.leather * 0.7,
  });
}

/**
 * 金装飾。粗さのムラを入れて、磨き残しのある古い金にする。
 * 一様な roughness の金属は、暗い場所ではほぼ真っ黒か真っ白のどちらかにしかならない。
 */
export function createGoldMaterial(): THREE.MeshStandardMaterial {
  const maps = surfaceMaps("leather");
  return new THREE.MeshStandardMaterial({
    color: "#c4a035",
    roughnessMap: maps.roughnessMap,
    roughness: 0.55,
    metalness: 0.82,
    emissive: "#5a4010",
    emissiveIntensity: 0.06,
    envMapIntensity: ENV_INTENSITY.gold,
  });
}

export function createPaperMaterial(): THREE.MeshStandardMaterial {
  const maps = surfaceMaps("paper");
  return new THREE.MeshStandardMaterial({
    color: "#f0e6d0",
    normalMap: maps.normalMap,
    normalScale: maps.normalScale.clone(),
    roughnessMap: maps.roughnessMap,
    roughness: 1,
    metalness: 0,
    envMapIntensity: ENV_INTENSITY.paper,
  });
}

export function createWoodMaterial(): THREE.MeshStandardMaterial {
  const maps = surfaceMaps("wood");
  return new THREE.MeshStandardMaterial({
    color: "#3d2e22",
    normalMap: maps.normalMap,
    normalScale: maps.normalScale.clone(),
    roughnessMap: maps.roughnessMap,
    roughness: 1,
    metalness: 0.02,
    envMapIntensity: ENV_INTENSITY.wood,
  });
}

/** 棚に収まった後の背表紙用 */
export function createShelfSpineMaterial(): THREE.MeshStandardMaterial {
  const maps = surfaceMaps("leather");
  return new THREE.MeshStandardMaterial({
    color: "#4a3228",
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: maps.roughnessMap,
    roughness: 1,
    metalness: 0.04,
    envMapIntensity: ENV_INTENSITY.leather * 0.8,
  });
}

/**
 * 加算合成の発光板に貼る、中心が明るい円のテクスチャ。
 * 全画面のブルームパスの代わりに、光っているものの周りへこれを数枚置く。
 */
let glowSprite: THREE.DataTexture | null = null;

export function getGlowSprite(): THREE.DataTexture {
  if (glowSprite) return glowSprite;

  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - center, y - center) / center;
      // 中心から外へ、二乗で落とす。縁は完全に0にして四角い切れ目を出さない
      const a = Math.max(0, 1 - d) ** 2.2;
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 236;
      data[i + 2] = 188;
      data[i + 3] = Math.round(a * 255);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  glowSprite = texture;
  return texture;
}

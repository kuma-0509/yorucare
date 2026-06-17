import * as THREE from "three";

export const BOOK = {
  w: 2.85,
  h: 1.85,
  t: 0.5,
  coverT: 0.075,
} as const;

function createNoiseTexture(size = 64, repeat = 4): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain =
        122 +
        Math.sin(x * 0.7 + y * 0.17) * 20 +
        Math.sin(y * 1.3) * 12 +
        (Math.random() - 0.5) * 34;
      const value = THREE.MathUtils.clamp(Math.round(grain), 70, 190);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
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

export function createLeatherMaterial(color = "#4a3228"): THREE.MeshStandardMaterial {
  const grain = createNoiseTexture(96, 5);
  return new THREE.MeshStandardMaterial({
    color,
    bumpMap: grain,
    bumpScale: 0.045,
    roughness: 0.68,
    metalness: 0.04,
  });
}

export function createGoldMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#c9a227",
    roughness: 0.28,
    metalness: 0.92,
    emissive: "#6b4a10",
    emissiveIntensity: 0.08,
  });
}

export function createPaperMaterial(): THREE.MeshStandardMaterial {
  const grain = createNoiseTexture(64, 7);
  return new THREE.MeshStandardMaterial({
    color: "#f0e6d0",
    bumpMap: grain,
    bumpScale: 0.012,
    roughness: 0.88,
    metalness: 0,
  });
}

export function createWoodMaterial(): THREE.MeshStandardMaterial {
  const grain = createNoiseTexture(96, 3);
  return new THREE.MeshStandardMaterial({
    color: "#3d2e22",
    bumpMap: grain,
    bumpScale: 0.035,
    roughness: 0.82,
    metalness: 0.02,
  });
}

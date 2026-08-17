/**
 * 3D演出の描画コストを端末に合わせて決める。
 *
 * 前提: この演出は約9秒の一度きりの再生であって、走らせ続けるゲームではない。
 * それでも、スマートフォンでフレームが落ちる・発熱するなら、記録を締めくくる
 * 体験としては壊れている。**見た目の作り込み（法線・粗さ・環境光・ビネット）は
 * どの端末でも同じにし、フレームあたりのコストだけを段階で下げる。**
 *
 * ここで下げるのは、解像度・影の精度・粒の数といった「増やしても質感の方向が
 * 変わらない」ものに限る。色や陰影の付き方は端末で変えない。
 */

export type QualityTier = "high" | "low";

export interface SceneQuality {
  tier: QualityTier;
  /** Canvas の devicePixelRatio 範囲 */
  dpr: [number, number];
  /** 影のシャドウマップ解像度 */
  shadowMapSize: number;
  /** 接地影（ContactShadows）の解像度 */
  contactShadowResolution: number;
  /** やわらかい影（PCFSoft）を使うか */
  softShadows: boolean;
  /** 粒の数の倍率 */
  particleScale: number;
  /** 加算合成の発光板（Bloom の代わり）を出すか */
  glow: boolean;
}

/** 判定に使う端末情報。呼び出し側が window から集めて渡す */
export interface QualityEnv {
  /** 指などの粗いポインタが主か（スマートフォン・タブレット） */
  coarsePointer: boolean;
  /** navigator.hardwareConcurrency。取れないなら undefined */
  cores?: number;
  /** navigator.deviceMemory（GB）。取れないなら undefined */
  memoryGb?: number;
  /** window.devicePixelRatio */
  pixelRatio?: number;
}

/**
 * 端末の段階を決める。
 *
 * 指で触る端末は、素の性能値が高く見えても筐体が小さく放熱に余裕がないため、
 * まとめて `low` にする。**性能が足りないという判定ではなく、9秒のために
 * 熱を持たせないという判定。** 逆に、マウス操作の端末でも実際のコア数・
 * メモリが小さければ `low` に落とす。判定材料が何も取れないときは、
 * 上げるのではなく `low` に倒す。
 */
export function detectQualityTier(env: QualityEnv): QualityTier {
  if (env.coarsePointer) return "low";
  if (env.cores !== undefined && env.cores <= 4) return "low";
  if (env.memoryGb !== undefined && env.memoryGb <= 4) return "low";
  if (env.cores === undefined && env.memoryGb === undefined) return "low";
  return "high";
}

const HIGH: Omit<SceneQuality, "dpr"> = {
  tier: "high",
  shadowMapSize: 1024,
  contactShadowResolution: 512,
  softShadows: true,
  particleScale: 1,
  glow: true,
};

const LOW: Omit<SceneQuality, "dpr"> = {
  tier: "low",
  shadowMapSize: 512,
  contactShadowResolution: 256,
  softShadows: false,
  particleScale: 0.5,
  glow: true,
};

/**
 * 段階ごとの設定を返す。
 *
 * `low` でも発光板（glow）は残す。全画面のポストプロセスではなく板を数枚足すだけで、
 * 塗る面積もわずかなので、これを削っても発熱は下がらず、演出の芯だけが失われる。
 */
export function qualityFor(
  tier: QualityTier,
  pixelRatio = 1
): SceneQuality {
  const base = tier === "high" ? HIGH : LOW;
  const cap = tier === "high" ? 1.75 : 1.25;
  return {
    ...base,
    dpr: [1, Math.max(1, Math.min(cap, pixelRatio || 1))],
  };
}

/** ブラウザから判定材料を集める。ブラウザ以外では `low` 相当を返す */
export function detectSceneQuality(): SceneQuality {
  if (typeof window === "undefined") return qualityFor("low", 1);

  const nav = window.navigator as Navigator & { deviceMemory?: number };
  const env: QualityEnv = {
    coarsePointer:
      window.matchMedia?.("(pointer: coarse)").matches ?? false,
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    pixelRatio: window.devicePixelRatio,
  };

  return qualityFor(detectQualityTier(env), env.pixelRatio);
}

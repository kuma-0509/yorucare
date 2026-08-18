"use client";

import { useEffect, useRef, useState } from "react";

export type CinematicPhase =
  | "writing"
  | "pageFlip"
  | "closing"
  | "spine"
  | "shelving"
  | "afterglow"
  | "done";

/** 演出タイムライン（約7.4秒） */
export const TIMELINE = {
  pageFlip: 2300,
  closing: 2900,
  spine: 3800,
  shelving: 4700,
  afterglow: 6200,
  done: 7400,
} as const;

type TimedPhase = Exclude<CinematicPhase, "done">;

/** 段ごとの [開始, 終了]（演出開始からのミリ秒） */
const PHASE_SPAN: Record<TimedPhase, readonly [number, number]> = {
  writing: [0, TIMELINE.pageFlip],
  pageFlip: [TIMELINE.pageFlip, TIMELINE.closing],
  closing: [TIMELINE.closing, TIMELINE.spine],
  spine: [TIMELINE.spine, TIMELINE.shelving],
  shelving: [TIMELINE.shelving, TIMELINE.afterglow],
  afterglow: [TIMELINE.afterglow, TIMELINE.done],
};

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 段の中の進み具合（0–1）。段の外の経過時間は端で頭打ちにする */
export function phaseProgressAt(phase: CinematicPhase, elapsed: number) {
  if (phase === "done") return 1;
  const [from, to] = PHASE_SPAN[phase];
  return clamp01((elapsed - from) / (to - from));
}

/** 段と、その段の中の進み具合から、演出開始からのミリ秒を出す */
export function phaseTimeMs(phase: CinematicPhase, progress: number) {
  if (phase === "done") return TIMELINE.done;
  const [from, to] = PHASE_SPAN[phase];
  return from + (to - from) * progress;
}

/** 本が棚へ向かい始めてからの段かどうか */
export function isShelvedPhase(phase: CinematicPhase) {
  return phase === "shelving" || phase === "afterglow" || phase === "done";
}

/** 机から棚のスロットへ移る進み具合（0=机、1=収納完了） */
export function shelfTAt(phase: CinematicPhase, progress: number) {
  if (phase === "shelving") return progress;
  return phase === "afterglow" || phase === "done" ? 1 : 0;
}

/** 棚まわりの灯りの強さ（0–1） */
export function shelfGlowAt(phase: CinematicPhase, progress: number) {
  if (phase === "afterglow") return 1 - progress * 0.4;
  if (phase === "done") return 0.55;
  if (phase === "shelving" && progress > 0.82) return (progress - 0.82) / 0.18;
  return 0;
}

/** 収納後、背表紙の金がにじむ強さ（0–1） */
export function spineGlowAt(phase: CinematicPhase, progress: number) {
  if (phase === "afterglow") return Math.max(0, 1 - progress * 0.85);
  if (phase === "done") return 0.35;
  return 0;
}

export type SoundCueKey =
  | "pen1"
  | "pen2"
  | "pen3"
  | "flip"
  | "close"
  | "slide"
  | "settle"
  | "chime";

/**
 * 効果音を鳴らす位置。段と、その段の中の進み具合で書く。
 *
 * **鳴らす時刻は描画とは別に測る。** 毎フレーム進み具合を見て
 * 「窓に入ったら鳴らす」やり方だと、端末が重くてフレームが飛んだときに
 * 窓ごと飛び越えて鳴らない。
 */
export const SOUND_CUES: {
  key: SoundCueKey;
  phase: CinematicPhase;
  at: number;
}[] = [
  { key: "pen1", phase: "writing", at: 0.18 },
  { key: "pen2", phase: "writing", at: 0.48 },
  { key: "pen3", phase: "writing", at: 0.74 },
  { key: "flip", phase: "pageFlip", at: 0.08 },
  { key: "close", phase: "closing", at: 0.9 },
  { key: "slide", phase: "shelving", at: 0.04 },
  { key: "settle", phase: "shelving", at: 0.86 },
  { key: "chime", phase: "afterglow", at: 0.42 },
];

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * 段の中の進み具合を読む口。
 *
 * **React の状態としては持たない。** 状態に置くと、値が変わるたびシーン全体が
 * 再描画の対象になる（毎秒30回を超える）。読む側は `useFrame` の中から
 * その場で呼ぶ。時計は `performance.now()` なので、呼ぶ順番に依存しない。
 */
export interface CinematicProgress {
  /** 演出開始からの経過ミリ秒 */
  elapsed(): number;
  /** いまの段の中の進み具合（0–1） */
  value(): number;
}

export interface CinematicTimeline {
  /** いまの段。**React の状態として持つのはこれだけ** */
  phase: CinematicPhase;
  progress: CinematicProgress;
}

export function useCinematicTimeline(onDone?: () => void): CinematicTimeline {
  const [phase, setPhase] = useState<CinematicPhase>("writing");
  const phaseRef = useRef<CinematicPhase>("writing");
  const startRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  const doneCalledRef = useRef(false);
  onDoneRef.current = onDone;

  const progressRef = useRef<CinematicProgress | null>(null);
  if (progressRef.current === null) {
    const elapsed = () =>
      startRef.current === null ? 0 : performance.now() - startRef.current;
    progressRef.current = {
      elapsed,
      value: () => phaseProgressAt(phaseRef.current, elapsed()),
    };
  }

  useEffect(() => {
    const finish = () => {
      if (doneCalledRef.current) return;
      doneCalledRef.current = true;
      onDoneRef.current?.();
    };

    // 段の切り替えは、読む側が `useFrame` から見る値でもあるので
    // 状態と ref の両方へ入れる
    const enter = (next: CinematicPhase) => {
      phaseRef.current = next;
      setPhase(next);
    };

    startRef.current = performance.now();

    if (prefersReducedMotion()) {
      const t = setTimeout(() => {
        enter("done");
        finish();
      }, 150);
      return () => clearTimeout(t);
    }

    const timers = Object.entries(TIMELINE).map(([key, at]) =>
      setTimeout(() => {
        enter(key as CinematicPhase);
        if (key === "done") finish();
      }, at)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return { phase, progress: progressRef.current };
}

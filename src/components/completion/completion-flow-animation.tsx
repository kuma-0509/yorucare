"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { COPY } from "@/lib/copy";

interface CompletionFlowAnimationProps {
  /** 整い切ったあとに表示する見出し */
  title?: string;
  /** 見出しの下に添える一文 */
  subtitle?: string;
  /** 演出が終わった（メッセージ表示まで到達した）ときに呼ぶ */
  onDone?: () => void;
  /** 完了文言を読み上げ用に親へ伝える */
  onLiveMessage?: (message: string) => void;
}

const PARTICLE_COUNT = 52;
/** 粒1つずつの開始タイミングのずれ（ms） */
const STAGGER_MS = 12;
/** 粒が流れ込む1回のアニメ時間（globals.css と合わせる） */
const FLOW_MS = 1400;
/** 整い切るまでの目安（最後の粒の開始 + アニメ時間） */
const SETTLE_MS = FLOW_MS + PARTICLE_COUNT * STAGGER_MS;

/** 落ち着いた、夜にやさしい粒の色（テーマ配色から） */
const PARTICLE_COLORS = [
  "#3d7ab8", // primary（淡いブルー）
  "#6d92ab", // mood negative（くすんだ青）
  "#8fb9a8", // mood slightly-negative（青みの緑）
  "#b8d088", // mood neutral（やわらかい緑）
  "#a99ec9", // accent 寄りのラベンダー
];

/** 決定的な擬似乱数（SSR と CSR で粒の位置がズレないように index から生成） */
function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface Particle {
  /** 整ったあとの最終位置（ステージ中心からの % オフセット） */
  left: number;
  top: number;
  size: number;
  color: string;
  opacity: number;
  /** 流れ込む前の散らばり位置（画面全体に広がる vmin オフセット） */
  fromX: number;
  fromY: number;
  fromScale: number;
  delay: number;
}

/**
 * 記録完了後の「整える」全画面演出（CSS のみ・依存追加なし）。
 *
 * 設計思想（参考画像の "散らばった砂が流れて整う" 気持ちよさを借りる）：
 * - 画面全体に散らばった小さな粒が、静かに中央へ流れ込んで集まる。
 * - 集まった粒は、やわらかい丸（月のような形）に整う。
 * - 整い切ったら、短い完了メッセージをそっと出す。
 * - ゲーム化しない：スコア・派手さ・効果音前提の演出は出さない。
 * - prefers-reduced-motion では動かさず、整った状態とメッセージを静かに出す。
 */
export function CompletionFlowAnimation({
  title = COPY.completion.flowTitle,
  subtitle = COPY.completion.flowSubtitle,
  onDone,
  onLiveMessage,
}: CompletionFlowAnimationProps) {
  const [settled, setSettled] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onLiveRef = useRef(onLiveMessage);
  onLiveRef.current = onLiveMessage;

  const particles = useMemo<Particle[]>(() => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      // 中心からのらせん配置（均等に詰まった丸い面になる）
      const r = Math.sqrt((i + 0.5) / PARTICLE_COUNT);
      const theta = i * golden;
      const radiusPct = 30; // ステージに対する丸の半径（%）
      const left = 50 + Math.cos(theta) * r * radiusPct;
      const top = 50 + Math.sin(theta) * r * radiusPct;

      // 散らばりの開始位置：画面全体（vmin）からふわっと流れ込む
      const angle = seeded(i, 1) * Math.PI * 2;
      const dist = 28 + seeded(i, 2) * 55;

      return {
        left,
        top,
        size: 5 + Math.round(seeded(i, 3) * 5),
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        opacity: 0.5 + seeded(i, 4) * 0.4,
        fromX: Math.cos(angle) * dist,
        fromY: Math.sin(angle) * dist - 10,
        fromScale: 0.3 + seeded(i, 5) * 0.4,
        delay: i * STAGGER_MS,
      };
    });
  }, []);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const at = reduce ? 120 : SETTLE_MS - 120;
    const t = setTimeout(() => {
      setSettled(true);
      onLiveRef.current?.(title);
      onDoneRef.current?.();
    }, at);
    return () => clearTimeout(t);
  }, [title]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-accent/60 via-background to-background">
      {/* 集まった粒の奥でやわらかく灯る光（整い切ってから現れる） */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 h-[42vmin] w-[42vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0",
          settled && "yc-anim-orb-breath"
        )}
        style={{
          background:
            "radial-gradient(circle, rgba(61,122,184,0.18) 0%, rgba(169,158,201,0.10) 45%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* 粒のステージ（正方形・画面中央） */}
      <div
        className="absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        {particles.map((p, i) => (
          <span
            key={i}
            className={cn(
              "yc-anim-flow-gather absolute rounded-full",
              settled && "yc-anim-particle-settle"
            )}
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size}px ${p.color}55`,
                "--fx": `${p.fromX}vmin`,
                "--fy": `${p.fromY}vmin`,
                "--fs": `${p.fromScale}`,
                "--op": `${p.opacity}`,
                "--delay": `${p.delay}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* 完了メッセージ（整い切ってからそっと現れる） */}
      <div className="absolute inset-x-0 bottom-[18%] flex justify-center px-6">
        <div
          className={cn(
            "max-w-sm text-center opacity-0 transition-opacity",
            settled && "yc-anim-soft-rise opacity-100"
          )}
          aria-live="polite"
        >
          <p className="text-lg font-medium text-foreground">{title}</p>
          {subtitle && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

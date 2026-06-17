"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklesProps {
  /** 表示するキラキラの数（多すぎないこと） */
  count?: number;
  /** 配置領域に重ねるための追加クラス（絶対配置のコンテナ想定） */
  className?: string;
}

/** 決定的な擬似乱数（SSR と CSR で位置がズレないように index から生成） */
function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** やわらかい4点星のキラキラ（金色寄り・低彩度・点滅しすぎない） */
const STAR_CLIP =
  "polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)";

const SPARKLE_COLORS = ["#c9a227", "#d4af37", "#b8943a"];

/**
 * 書庫・アンティーク本向けの上品なキラキラ。
 * 星形と淡い光の粒子を混ぜ、派手さを抑えて温かい祝福感に寄せる。
 */
export function Sparkles({ count = 6, className }: SparklesProps) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: 8 + seeded(i, 1) * 84,
        top: 6 + seeded(i, 2) * 72,
        size: 6 + Math.round(seeded(i, 3) * 8),
        color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
        delay: Math.round(seeded(i, 4) * 1800),
        isOrb: seeded(i, 5) > 0.55,
      })),
    [count]
  );

  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-hidden="true"
    >
      {items.map((s, i) =>
        s.isOrb ? (
          <span
            key={i}
            className="yc-anim-archive-dust-float absolute rounded-full"
            style={
              {
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: `${s.size + 4}px`,
                height: `${s.size + 4}px`,
                background: `radial-gradient(circle, ${s.color}55 0%, transparent 70%)`,
                "--delay": `${s.delay}ms`,
              } as React.CSSProperties
            }
          />
        ) : (
          <span
            key={i}
            className="yc-anim-sparkle-twinkle absolute block opacity-80"
            style={
              {
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                backgroundColor: s.color,
                clipPath: STAR_CLIP,
                filter: `drop-shadow(0 0 ${s.size / 3}px ${s.color}66)`,
                "--delay": `${s.delay}ms`,
              } as React.CSSProperties
            }
          />
        )
      )}
    </div>
  );
}

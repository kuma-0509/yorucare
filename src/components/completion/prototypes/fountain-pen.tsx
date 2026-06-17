"use client";

import { cn } from "@/lib/utils";

interface FountainPenProps {
  className?: string;
  style?: React.CSSProperties;
  /** 筆記中のインクのにじみを表示 */
  showInk?: boolean;
}

/** 万年筆（SVG・CSS のみ）。書庫の手書き演出用。 */
export function FountainPen({
  className,
  style,
  showInk = false,
}: FountainPenProps) {
  return (
    <div className={cn("relative", className)} style={style}>
      <svg
        viewBox="0 0 52 128"
        className="h-[4.8rem] w-[1.2rem] drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
        aria-hidden="true"
      >
        {/* ペン先（金メッキ） */}
        <path d="M26 118 L21 100 L31 100 Z" fill="#2a1e14" />
        <path d="M26 112 L23 102 L29 102 Z" fill="#c9a227" opacity="0.85" />
        <rect x="22" y="94" width="8" height="12" rx="1" fill="#8b6914" />
        {/* 軸（ダークブラウン＋金リング） */}
        <rect x="20" y="30" width="12" height="68" rx="2" fill="#3d2a20" />
        <rect
          x="19"
          y="30"
          width="14"
          height="68"
          rx="2"
          fill="url(#pen-barrel)"
          opacity="0.35"
        />
        <rect
          x="18"
          y="54"
          width="16"
          height="3.5"
          rx="1"
          fill="#c9a227"
          opacity="0.9"
        />
        <rect
          x="18"
          y="70"
          width="16"
          height="2.5"
          rx="1"
          fill="#d4af37"
          opacity="0.75"
        />
        <rect
          x="18"
          y="82"
          width="16"
          height="2"
          rx="1"
          fill="#c9a227"
          opacity="0.5"
        />
        {/* キャップ */}
        <rect x="17" y="6" width="18" height="26" rx="4" fill="#4a3228" />
        <ellipse cx="26" cy="6" rx="9" ry="3.5" fill="#5c3d2e" />
        <rect
          x="20"
          y="14"
          width="12"
          height="2"
          rx="1"
          fill="#c9a227"
          opacity="0.6"
        />
        <defs>
          <linearGradient id="pen-barrel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
      {showInk && (
        <span
          className="absolute bottom-[6%] left-[38%] h-1.5 w-1.5 rounded-full bg-[#2a1e14]/70 yc-anim-archive-ink-dot blur-[0.5px]"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

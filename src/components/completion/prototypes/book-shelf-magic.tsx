"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { COPY } from "@/lib/copy";
import { Sparkles } from "./sparkles";
import { FountainPen } from "./fountain-pen";

interface BookShelfMagicProps {
  lines: string[];
  heading?: string;
  title?: string;
  subtitle?: string;
  onDone?: () => void;
  onLiveMessage?: (message: string) => void;
}

type Phase =
  | "closed"
  | "opening"
  | "writing"
  | "closing"
  | "spine"
  | "shelving"
  | "done";

const OPEN_AT = 500;
const WRITE_AT = 1300;
const CLOSE_AT = 4200;
const SPINE_AT = 5100;
const SHELF_AT = 6000;
const DONE_AT = 7200;

const LINE_WRITE_MS = 580;

/** 書庫の既存蔵書（背表紙の色） */
const SHELF_BOOKS = [
  { color: "#3d2a20", h: "82%", label: "記", thick: "42%" },
  { color: "#4a2828", h: "76%", label: "録", thick: "38%" },
  { color: "#2a3d32", h: "88%", label: "庫", thick: "44%" },
  null,
  { color: "#3a2e42", h: "72%", label: "蔵", thick: "36%" },
  { color: "#4a3228", h: "85%", label: "書", thick: "40%" },
  { color: "#2e3a4a", h: "78%", label: "架", thick: "38%" },
] as const;

const EMPTY_SLOT = 3;

const BOOK_VARS = {
  "--book-thick": "5vmin",
  "--book-w": "58vmin",
  "--book-h": "40vmin",
} as React.CSSProperties;

const PAPER_TEXTURE =
  "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.05%22/%3E%3C/svg%3E')";

/**
 * 「書庫に記録を保管する」演出（アンティーク本・CSS疑似3D・無音）。
 */
export function BookShelfMagic({
  lines,
  heading,
  title = COPY.completion.bookDone,
  subtitle = COPY.completion.bookDoneSub,
  onDone,
  onLiveMessage,
}: BookShelfMagicProps) {
  const [phase, setPhase] = useState<Phase>("closed");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onLiveRef = useRef(onLiveMessage);
  onLiveRef.current = onLiveMessage;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      const t = setTimeout(() => {
        setPhase("done");
        onLiveRef.current?.(title);
        onDoneRef.current?.();
      }, 150);
      return () => clearTimeout(t);
    }

    const timers = [
      setTimeout(() => setPhase("opening"), OPEN_AT),
      setTimeout(() => setPhase("writing"), WRITE_AT),
      setTimeout(() => setPhase("closing"), CLOSE_AT),
      setTimeout(() => setPhase("spine"), SPINE_AT),
      setTimeout(() => setPhase("shelving"), SHELF_AT),
      setTimeout(() => {
        setPhase("done");
        onLiveRef.current?.(title);
        onDoneRef.current?.();
      }, DONE_AT),
    ];
    return () => timers.forEach(clearTimeout);
  }, [title]);

  const isOpen =
    phase === "opening" || phase === "writing" || phase === "closing";
  const coverOpen = phase === "opening" || phase === "writing";
  const coverClosing = phase === "closing";
  const showSparkle = phase === "writing" || phase === "closing";
  const showGlow =
    phase === "writing" || phase === "closing" || phase === "shelving";
  const showFloatingBook = phase !== "done";
  const shelfFilled = phase === "shelving" || phase === "done";

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#241c14] via-[#2e261c] to-[#383028]"
      style={BOOK_VARS}
    >
      {/* 書庫の薄い照明 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-[#c9a227]/12 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-[15%] top-[8%] h-[35%] rounded-full bg-[radial-gradient(ellipse,rgba(201,162,39,0.08)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      {/* 本のステージ */}
      <div className="absolute inset-x-0 top-[8%] flex justify-center">
        <div className="relative h-[52vmin] w-[76vmin] max-w-[26rem]">
          {showSparkle && (
            <Sparkles count={6} className="-m-6 opacity-70" />
          )}

          {showGlow && (
            <div
              className="pointer-events-none absolute inset-0 z-0 rounded-full bg-[radial-gradient(circle,rgba(201,162,39,0.18)_0%,transparent_68%)] yc-anim-archive-gold-glow"
              aria-hidden="true"
            />
          )}

          {showFloatingBook && (
            <div
              className={cn(
                "absolute inset-0 z-10 flex items-start justify-center [perspective:1400px]",
                phase === "spine" && "yc-anim-archive-to-spine",
                phase === "shelving" && "yc-anim-archive-shelf-slide",
                coverClosing && "yc-anim-archive-close-settle"
              )}
              aria-hidden="true"
            >
              <ThickAntiqueBook
                phase={phase}
                isOpen={isOpen}
                coverOpen={coverOpen}
                coverClosing={coverClosing}
                lines={lines}
                heading={heading}
              />
            </div>
          )}
        </div>
      </div>

      {/* 書庫の本棚 */}
      <div className="absolute inset-x-0 bottom-[16%] flex justify-center px-4">
        <div className="w-full max-w-[22rem]">
          <p className="mb-2 text-center text-[10px] tracking-[0.22em] text-[#c9a227]/45">
            記録の書庫
          </p>
          <div className="relative rounded-t-sm bg-[#4a3828]/85 px-2 pb-0 pt-3 shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)]">
            {shelfFilled && (
              <div
                className="pointer-events-none absolute inset-x-4 bottom-6 h-8 rounded-full bg-[radial-gradient(ellipse,rgba(201,162,39,0.35)_0%,transparent_70%)] yc-anim-archive-shelf-glow"
                aria-hidden="true"
              />
            )}
            <div className="flex h-[11vmin] max-h-[4.5rem] items-end justify-center gap-[3px]">
              {SHELF_BOOKS.map((book, i) =>
                book === null ? (
                  <EmptySlot
                    key={i}
                    filled={shelfFilled && i === EMPTY_SLOT}
                    heading={heading}
                  />
                ) : (
                  <ShelfSpine
                    key={i}
                    color={book.color}
                    h={book.h}
                    label={book.label}
                    thick={book.thick}
                  />
                )
              )}
            </div>
            <div className="mt-0 h-2.5 rounded-b-sm bg-[#6b5344] shadow-md" />
          </div>
        </div>
      </div>

      {/* 完了メッセージ */}
      <div className="absolute inset-x-0 bottom-[4%] flex justify-center px-6 pb-[env(safe-area-inset-bottom)]">
        <div
          className={cn(
            "max-w-sm text-center opacity-0",
            phase === "done" && "yc-anim-soft-rise opacity-100"
          )}
          aria-live="polite"
        >
          <p className="text-lg font-medium text-[#f0e6d0]">{title}</p>
          {subtitle && (
            <p className="mt-1.5 text-sm leading-relaxed text-[#c9a227]/70">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** 分厚い英国系アンティーク本（CSS疑似3D） */
function ThickAntiqueBook({
  phase,
  isOpen,
  coverOpen,
  coverClosing,
  lines,
  heading,
}: {
  phase: Phase;
  isOpen: boolean;
  coverOpen: boolean;
  coverClosing: boolean;
  lines: string[];
  heading?: string;
}) {
  return (
    <div
      className="relative mt-[1vmin] max-w-[19rem] [transform-style:preserve-3d]"
      style={{ width: "var(--book-w)", height: "var(--book-h)" }}
    >
      {/* 床面の影 */}
      <div
        className="absolute -bottom-[0.8vmin] left-[12%] right-[8%] h-[1.2vmin] rounded-[50%] bg-black/45 blur-md [transform:translateZ(-30px)_rotateX(75deg)]"
        aria-hidden="true"
      />

      {/* 裏表紙 */}
      <div
        className="absolute inset-0 rounded-sm [backface-visibility:hidden]"
        style={{ transform: "translateZ(calc(-1 * var(--book-thick)))" }}
      >
        <LeatherSurface variant="back" />
      </div>

      {/* ページ束＋書き込み面 */}
      <PageBlock
        isOpen={isOpen}
        phase={phase}
        lines={lines}
        heading={heading}
      />

      {/* 天（上端） */}
      <BookEdge type="top" />
      {/* 地（下端） */}
      <BookEdge type="bottom" />
      {/* 小口（ページ断面） */}
      <ForeEdge visible={!isOpen || phase === "closing"} />

      {/* 背表紙（3D左面） */}
      <Spine3D heading={heading} />

      {/* パラパラとめくられるページ */}
      {phase === "opening" &&
        [0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute inset-y-[3px] left-[2px] right-[var(--book-thick)] rounded-sm border border-[#e8dcc0]/40 bg-[#ebe0c8] yc-anim-archive-page-flip shadow-sm [transform-style:preserve-3d]"
            style={{
              animationDelay: `${i * 120}ms`,
              transformOrigin: "left center",
              transform: `translateZ(calc(-0.05 * var(--book-thick) + ${i * 0.5}px))`,
            }}
          />
        ))}

      {/* 表紙（開閉） */}
      <div
        className={cn(
          "absolute inset-0 [transform-style:preserve-3d]",
          coverOpen && "yc-anim-archive-cover-open",
          coverClosing && "yc-anim-archive-cover-close"
        )}
        style={{ transformOrigin: "left center" }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <LeatherSurface variant="front" />
        </div>
        <div
          className="absolute inset-0 bg-[#3a2818] [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        />
      </div>
    </div>
  );
}

/** 革張り表紙・裏表紙 */
function LeatherSurface({ variant }: { variant: "front" | "back" }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-sm shadow-[5px_8px_20px_rgba(0,0,0,0.5),inset_-2px_0_6px_rgba(0,0,0,0.25)]"
      style={{
        background:
          variant === "front"
            ? "linear-gradient(148deg, #6b4a38 0%, #5c3d2e 28%, #4a3228 62%, #3d2a20 100%)"
            : "linear-gradient(148deg, #4a3228 0%, #3d2a20 50%, #2e2018 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-35 bg-[radial-gradient(ellipse_at_28%_18%,rgba(255,255,255,0.18)_0%,transparent_55%)]"
        aria-hidden="true"
      />
      {variant === "front" && (
        <>
          <div className="absolute inset-[6px] rounded-sm border border-[#c9a227]/65" />
          <div className="absolute inset-[10px] rounded-sm border border-[#d4af37]/25" />
          {[
            "top-[6px] left-[6px]",
            "top-[6px] right-[6px]",
            "bottom-[6px] left-[6px]",
            "bottom-[6px] right-[6px]",
          ].map((pos) => (
            <span
              key={pos}
              className={cn(
                "absolute h-3.5 w-3.5 border-[#c9a227]/80",
                pos,
                pos.includes("top") ? "border-t-2" : "border-b-2",
                pos.includes("left") ? "border-l-2" : "border-r-2"
              )}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#c9a227]/75 bg-[#c9a227]/8 shadow-[0_0_16px_rgba(201,162,39,0.25)]">
              <span
                className="font-serif text-xl text-[#d4af37]"
                style={{ textShadow: "0 0 10px rgba(201,162,39,0.45)" }}
              >
                記
              </span>
            </div>
          </div>
          <p className="absolute bottom-5 inset-x-0 text-center font-serif text-[9px] tracking-[0.38em] text-[#c9a227]/75">
            ヨルケア・記録
          </p>
        </>
      )}
    </div>
  );
}

/** ページ束ブロック */
function PageBlock({
  isOpen,
  phase,
  lines,
  heading,
}: {
  isOpen: boolean;
  phase: Phase;
  lines: string[];
  heading?: string;
}) {
  return (
    <div
      className="absolute inset-[4px] rounded-sm [transform-style:preserve-3d]"
      style={{
        transform: "translateZ(calc(-0.12 * var(--book-thick)))",
        right: "calc(var(--book-thick) + 2px)",
      }}
    >
      {isOpen && (
        <div
          className="absolute inset-0 overflow-hidden rounded-sm border border-[#d4c4a0]/45 bg-[#f0e6d0] shadow-[inset_0_0_24px_rgba(74,50,40,0.14)]"
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{ backgroundImage: PAPER_TEXTURE }}
            aria-hidden="true"
          />
          <WritingPage
            lines={lines}
            heading={heading}
            active={phase === "writing"}
          />
        </div>
      )}
    </div>
  );
}

/** 万年筆で書き込むページ */
function WritingPage({
  lines,
  heading,
  active,
}: {
  lines: string[];
  heading?: string;
  active: boolean;
}) {
  const displayLines = lines.slice(0, 4);

  return (
    <div className="relative h-full px-3 py-3">
      {heading && (
        <p className="font-serif text-[10px] tracking-widest text-[#6b5a42]">
          {heading}
        </p>
      )}
      <div className="mt-2 space-y-2.5">
        {displayLines.map((line, i) => (
          <div key={i} className="relative min-h-[1.2rem]">
            <p
              className={cn(
                "font-serif text-[10px] leading-relaxed text-[#3d2e24] italic",
                active && "yc-anim-archive-line-reveal"
              )}
              style={
                active ? { animationDelay: `${i * LINE_WRITE_MS}ms` } : undefined
              }
            >
              {line}
            </p>
            {active && (
              <span
                className="absolute bottom-0 left-0 h-px bg-[#3d2e24]/35 yc-anim-archive-ink-stroke"
                style={{ animationDelay: `${i * LINE_WRITE_MS}ms` }}
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>

      {active && (
        <FountainPen
          showInk
          className="absolute z-20 yc-anim-archive-pen-write"
        />
      )}
    </div>
  );
}

/** 天・地の断面 */
function BookEdge({ type }: { type: "top" | "bottom" }) {
  const isTop = type === "top";
  return (
    <div
      className={cn(
        "absolute left-[5%] right-[calc(var(--book-thick)+4px)] h-[var(--book-thick)] [backface-visibility:hidden]",
        isTop ? "top-0 origin-top" : "bottom-0 origin-bottom"
      )}
      style={{
        background:
          "linear-gradient(90deg, #ebe0c8 0%, #f0e6d0 40%, #d8ccb0 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        transform: isTop
          ? "rotateX(90deg) translateZ(calc(var(--book-thick) * 0.45))"
          : "rotateX(-90deg) translateZ(calc(var(--book-thick) * 0.45))",
      }}
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-y-[15%] w-px bg-[#c9b896]/40"
          style={{ left: `${12 + i * 14}%` }}
        />
      ))}
    </div>
  );
}

/** 小口（ページの束が見える右端） */
function ForeEdge({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      className="absolute top-[5px] bottom-[5px] w-[var(--book-thick)] [backface-visibility:hidden]"
      style={{
        right: 0,
        transform:
          "rotateY(90deg) translateZ(calc(var(--book-thick) * -0.35))",
        transformOrigin: "right center",
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-r-[1px]"
        style={{
          background:
            "linear-gradient(180deg, #f0e6d0 0%, #ebe0c8 30%, #d8ccb0 70%, #cfc4a8 100%)",
          boxShadow:
            "inset -2px 0 4px rgba(0,0,0,0.15), 2px 0 4px rgba(0,0,0,0.2)",
        }}
      />
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-x-0 border-b border-[#c9b896]/50"
          style={{ top: `${(i / 14) * 100}%` }}
        />
      ))}
    </div>
  );
}

/** 背表紙（3D左面・金装飾） */
function Spine3D({ heading }: { heading?: string }) {
  return (
    <div
      className="absolute left-0 top-0 h-full w-[var(--book-thick)] [backface-visibility:hidden]"
      style={{
        transform: "rotateY(-90deg) translateX(calc(-1 * var(--book-thick)))",
        transformOrigin: "left center",
      }}
      aria-hidden="true"
    >
      <div
        className="relative h-full w-full rounded-l-[2px] shadow-[inset_-3px_0_8px_rgba(0,0,0,0.35),2px_0_6px_rgba(0,0,0,0.25)]"
        style={{
          background:
            "linear-gradient(90deg, #2e2018 0%, #4a3228 35%, #5c3d2e 55%, #4a3228 80%, #3d2a20 100%)",
        }}
      >
        {/* 装飾帯（英国蔵書風の段） */}
        {[18, 42, 68].map((top) => (
          <div
            key={top}
            className="absolute inset-x-[8%] h-px bg-[#c9a227]/35"
            style={{ top: `${top}%` }}
          />
        ))}
        <div className="absolute inset-x-[15%] top-[12%] h-[3px] rounded-full bg-[#c9a227]/25" />
        <div className="absolute inset-x-[15%] bottom-[12%] h-[3px] rounded-full bg-[#c9a227]/25" />

        <div className="flex h-full flex-col items-center justify-center gap-1 px-0.5">
          <span
            className="font-serif text-[8px] tracking-[0.15em] text-[#d4af37]/90 [writing-mode:vertical-rl]"
            style={{ textShadow: "0 0 6px rgba(201,162,39,0.3)" }}
          >
            {heading ?? "記録"}
          </span>
          <span className="mt-1 h-8 w-px bg-[#c9a227]/45" />
        </div>
      </div>
    </div>
  );
}

/** 本棚の既存蔵書（背表紙＋厚み） */
function ShelfSpine({
  color,
  h,
  label,
  thick,
}: {
  color: string;
  h: string;
  label: string;
  thick: string;
}) {
  return (
    <div
      className="relative flex items-end"
      style={{ height: h, width: thick }}
    >
      <div
        className="relative flex w-full flex-col items-center justify-end rounded-t-[2px] shadow-[inset_-2px_0_3px_rgba(0,0,0,0.35),1px_0_2px_rgba(0,0,0,0.2)]"
        style={{
          height: "100%",
          background: `linear-gradient(90deg, ${color} 0%, color-mix(in srgb, ${color} 80%, #c9a227) 50%, ${color} 100%)`,
        }}
      >
        <span className="mb-1 font-serif text-[7px] text-[#c9a227]/55 [writing-mode:vertical-rl]">
          {label}
        </span>
        <div className="absolute inset-x-0 top-2 h-px bg-[#c9a227]/20" />
        <div className="absolute inset-x-0 bottom-3 h-px bg-[#c9a227]/15" />
      </div>
      {/* 小口の厚みヒント */}
      <div
        className="absolute bottom-0 right-0 top-[8%] w-[3px] rounded-r-[1px] bg-[#d8ccb0]/40"
        style={{ transform: "translateX(100%)" }}
        aria-hidden="true"
      />
    </div>
  );
}

/** 本棚の空きスペース */
function EmptySlot({
  filled,
  heading,
}: {
  filled: boolean;
  heading?: string;
}) {
  const spineLabel =
    heading && heading.length <= 6 ? heading.slice(0, 4) : "今日";

  return (
    <div className="relative flex w-[14%] max-w-[1.8rem] items-end justify-center">
      <div
        className={cn(
          "w-[42%] rounded-t-[2px] bg-[#2a2218]/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.55)] transition-all duration-500",
          filled ? "h-0 opacity-0" : "h-[70%] opacity-100"
        )}
        aria-hidden="true"
      />
      {filled && (
        <div
          className="absolute bottom-0 flex w-[48%] flex-col items-center justify-end rounded-t-[2px] yc-anim-archive-spine-settle shadow-[inset_-2px_0_3px_rgba(0,0,0,0.35),0_0_12px_rgba(201,162,39,0.2)]"
          style={{
            height: "88%",
            background:
              "linear-gradient(90deg, #2e2018 0%, #4a3228 40%, #5c3d2e 55%, #4a3228 100%)",
          }}
        >
          <span
            className="mb-1 font-serif text-[7px] text-[#d4af37]/90 [writing-mode:vertical-rl]"
            style={{ textShadow: "0 0 4px rgba(201,162,39,0.35)" }}
          >
            {spineLabel}
          </span>
          <div className="absolute inset-x-[15%] top-2 h-px bg-[#c9a227]/40" />
          <div className="absolute inset-x-[15%] bottom-3 h-px bg-[#c9a227]/25" />
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookMarked, CheckCircle2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import { prefersReducedMotion } from "@/lib/motion";
import {
  getActivePaperDates,
  recordCompletion,
  type CompletionStyle,
} from "@/lib/completion-log";
import { BookShelfCinematic } from "./prototypes/book-shelf-cinematic";
import { PaperTrashAnimation } from "./paper-trash-animation";
import {
  WeeklyBurnAnimation,
  WeeklyBurnBanner,
} from "./weekly-burn-animation";

type Phase = "choosing" | "shelf" | "paper" | "burn" | "done";
type DoneKind = CompletionStyle | "skip" | "burn";

interface CompletionChoiceProps {
  /** 締めくくる対象の記録日（YYYY-MM-DD） */
  date: string;
  /** 演出で「書かれる」記録の要約行 */
  lines: string[];
  /** 完了後に表示する戻る導線（編集／これまで／閉じる など） */
  footer: React.ReactNode;
  /** 完了文言を読み上げ用に親へ伝える */
  onLiveMessage?: (message: string) => void;
}

const DONE_MESSAGE: Record<DoneKind, string> = {
  shelf: COPY.completion.shelfDone,
  paper: COPY.completion.paperDone,
  skip: COPY.completion.skipDone,
  burn: COPY.completion.burnDone,
};

/**
 * 「書庫にしまう」演出が終わってから、完了画面へ切り替えるまでの余韻。
 * 演出の最後に出る一文が読める長さにする（R3F版はここでフェードインする）。
 */
const SHELF_AFTERGLOW_MS = 2200;

/** 背表紙と書き込みページに出す日付。長い表記だと背表紙に収まらない */
function shortHeading(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  if (!month || !day) return "";
  return `${month}月${day}日`;
}

export function CompletionChoice({
  date,
  lines,
  footer,
  onLiveMessage,
}: CompletionChoiceProps) {
  const [phase, setPhase] = useState<Phase>("choosing");
  const [doneKind, setDoneKind] = useState<DoneKind>("skip");
  const [burnPaperDates, setBurnPaperDates] = useState<string[]>([]);
  const afterglowRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAfterglow = () => {
    if (afterglowRef.current !== null) {
      clearTimeout(afterglowRef.current);
      afterglowRef.current = null;
    }
  };

  useEffect(() => clearAfterglow, []);

  const finish = useCallback(
    (kind: DoneKind) => {
      clearAfterglow();
      setDoneKind(kind);
      setPhase("done");
      onLiveMessage?.(DONE_MESSAGE[kind]);
    },
    [onLiveMessage]
  );

  /**
   * 演出は終わっているが、最後の一文はまだ画面に出たばかりなので、
   * すぐには完了画面へ切り替えない。途中で「このまま終える」を押されたら
   * この待ち時間も取り消す。
   */
  const handleShelfDone = useCallback(() => {
    clearAfterglow();
    afterglowRef.current = setTimeout(
      () => finish("shelf"),
      SHELF_AFTERGLOW_MS
    );
  }, [finish]);

  const handleSelect = (style: CompletionStyle) => {
    recordCompletion(date, style);
    setDoneKind(style);
    // 動きを控える設定のときは全画面の演出を出さず、完了の一文だけを出す
    if (style === "shelf" && prefersReducedMotion()) {
      finish("shelf");
      return;
    }
    setPhase(style);
  };

  if (phase === "shelf") {
    return (
      <div
        // 演出中は下の記録画面へ触れさせない（誤タップと背面スクロールを防ぐ）
        className="fixed inset-0 z-50 touch-none overscroll-contain bg-[#1a1510]"
        role="dialog"
        aria-modal="true"
        aria-label={COPY.completion.shelfRunning}
      >
        <BookShelfCinematic
          lines={lines}
          heading={shortHeading(date)}
          onDone={handleShelfDone}
        />
        <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#f0e6d0]/80 hover:bg-white/10 hover:text-[#f0e6d0]"
            onClick={() => finish("shelf")}
          >
            {COPY.completion.skipAction}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "paper") {
    return (
      <div className="flex flex-col gap-2">
        <PaperTrashAnimation lines={lines} onDone={() => finish("paper")} />
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground"
          onClick={() => finish("paper")}
        >
          {COPY.completion.skipAction}
        </Button>
      </div>
    );
  }

  if (phase === "burn") {
    return (
      <WeeklyBurnAnimation
        paperDates={burnPaperDates}
        onDone={() => finish("burn")}
      />
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col gap-3">
        <div className="yc-anim-soft-rise flex flex-col items-center gap-1 rounded-xl bg-secondary px-3 py-5 text-center">
          <CheckCircle2 className="h-7 w-7 text-secondary-foreground" />
          <p className="text-base font-medium text-secondary-foreground">
            {DONE_MESSAGE[doneKind]}
          </p>
          {doneKind === "shelf" && (
            <p className="text-sm leading-relaxed text-secondary-foreground/90">
              {COPY.completion.shelfDoneSub}
            </p>
          )}
        </div>
        <p className="px-1 text-sm leading-relaxed text-muted-foreground">
          {COPY.completion.doneGuide}
        </p>
        {footer}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <p className="text-base font-medium">{COPY.completion.prompt}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {COPY.completion.hint}
        </p>
      </div>

      <ChoiceCard
        icon={<BookMarked className="h-6 w-6 text-primary" />}
        title={COPY.completion.shelf}
        description={COPY.completion.shelfDesc}
        onClick={() => handleSelect("shelf")}
      />
      <ChoiceCard
        icon={<Newspaper className="h-6 w-6 text-accent-foreground" />}
        title={COPY.completion.paper}
        description={COPY.completion.paperDesc}
        onClick={() => handleSelect("paper")}
      />

      {/* 紙が7枚以上たまっていれば「燃やす」バナーを表示する */}
      <WeeklyBurnBanner
        onBurnStart={() => {
          setBurnPaperDates(getActivePaperDates());
          setPhase("burn");
        }}
      />

      <Button
        variant="ghost"
        className="text-muted-foreground"
        onClick={() => finish("skip")}
      >
        {COPY.completion.skip}
      </Button>
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border-2 border-border bg-white px-4 py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-base font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

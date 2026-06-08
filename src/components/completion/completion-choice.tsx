"use client";

import { useState } from "react";
import { BookMarked, CheckCircle2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import { recordCompletion, type CompletionStyle } from "@/lib/completion-log";
import { BookArchiveAnimation } from "./book-archive-animation";
import { PaperTrashAnimation } from "./paper-trash-animation";

type Phase = "choosing" | "shelf" | "paper" | "done";
type DoneKind = CompletionStyle | "skip";

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
};

export function CompletionChoice({
  date,
  lines,
  footer,
  onLiveMessage,
}: CompletionChoiceProps) {
  const [phase, setPhase] = useState<Phase>("choosing");
  const [doneKind, setDoneKind] = useState<DoneKind>("skip");

  const finish = (kind: DoneKind) => {
    setDoneKind(kind);
    setPhase("done");
    onLiveMessage?.(DONE_MESSAGE[kind]);
  };

  const handleSelect = (style: CompletionStyle) => {
    recordCompletion(date, style);
    setDoneKind(style);
    setPhase(style);
  };

  if (phase === "shelf" || phase === "paper") {
    return (
      <div className="flex flex-col gap-2">
        {phase === "shelf" ? (
          <BookArchiveAnimation lines={lines} onDone={() => finish("shelf")} />
        ) : (
          <PaperTrashAnimation lines={lines} onDone={() => finish("paper")} />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground"
          onClick={() => finish(phase)}
        >
          {COPY.completion.skipAction}
        </Button>
      </div>
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
        </div>
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

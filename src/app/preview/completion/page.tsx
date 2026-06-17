"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompletionFlowAnimation } from "@/components/completion/completion-flow-animation";

/**
 * 記録完了後「整える」演出のプレビュー専用画面。
 * 本番フロー（記録保存・既存の締めくくり演出）には一切つながっていない。
 * http://localhost:3000/preview/completion で質感を確認するためのもの。
 */
export default function CompletionPreviewPage() {
  const [runId, setRunId] = useState(0);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      <CompletionFlowAnimation key={runId} />

      <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-1">
        <Button
          variant="secondary"
          onClick={() => setRunId((n) => n + 1)}
          className="shadow-sm"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          もう一度見る
        </Button>
        <p className="text-xs text-muted-foreground">
          プレビュー用の画面です（本番の記録には影響しません）
        </p>
      </div>
    </main>
  );
}

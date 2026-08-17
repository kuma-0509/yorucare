"use client";

import Link from "next/link";
import { ReportCard } from "@/components/report/report-card";
import { Button } from "@/components/ui/button";
import { isExternalNarrativeEnabled } from "@/lib/ai/report-narrative";

/**
 * 期間の報告書のプレビュー。
 *
 * 本番のタブからは到達させない。`/preview` 配下は本番ビルドで 404 になる
 * （`src/app/preview/layout.tsx`）ので、投入条件を満たすまで利用者の画面に出ない。
 *
 * 外部 AI API への送信は `isExternalNarrativeEnabled()` が既定で false のため
 * 起きない。この画面は端末内の記録から骨格を組み立て、文章の穴を定型文で埋めた
 * 状態を確認するためのもの。
 */
export default function ReportPreviewPage() {
  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg space-y-6 px-4 py-8 pb-safe">
      <div>
        <h1 className="text-xl font-medium text-foreground">
          期間の報告書（プレビュー）
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          この端末の記録から組み立てます。どこへも送信しません。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          文章の穴を外部へ書いてもらう経路は
          {isExternalNarrativeEnabled() ? "有効です。" : "まだ使いません。"}
          いまは決まった文が入ります。
        </p>
      </div>

      <ReportCard />

      <div className="flex flex-col gap-3">
        <Button asChild variant="outline" className="w-full">
          <Link href="/preview">プレビューの入口へ</Link>
        </Button>
      </div>
    </main>
  );
}

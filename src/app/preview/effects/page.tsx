"use client";

import { useState } from "react";
import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookShelfCinematic } from "@/components/completion/prototypes/book-shelf-cinematic";
import {
  releaseAudio,
  unlockAudio,
} from "@/components/completion/prototypes/r3f/completion-sounds";

/**
 * 記録完了後の演出プロトタイプ（古い書庫・重厚な本・静かな光のトーン）のプレビュー画面。
 * 本番フロー（記録保存・既存の締めくくり演出）には一切つながっていない。
 * http://localhost:3000/preview/effects で質感とテンポを確認するためのもの。
 *
 * 現時点では「書庫にしまう」3D演出（React Three Fiber・効果音あり）。
 */
const SAMPLE_LINES = [
  "気分：少し疲れぎみ",
  "睡眠：6時間30分",
  "しんどさのサイン：少しあり",
  "できたこと：朝の散歩",
  "メモ：今日はよくがんばった",
];

export default function EffectsPreviewPage() {
  const [runId, setRunId] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const replay = (withSound: boolean) => {
    // 自動再生ブロックはこのクリックの中でしか解けない。
    // 本番の「書庫にしまう」と同じ経路（unlockAudio）で確かめる
    if (withSound) {
      unlockAudio();
    } else {
      releaseAudio();
    }
    setSoundEnabled(withSound);
    setRunId((n) => n + 1);
  };

  return (
    <main className="relative min-h-[100dvh] min-h-[100svh] w-full overflow-hidden bg-background">
      <BookShelfCinematic
        key={runId}
        lines={SAMPLE_LINES}
        heading="6月18日（木）"
        soundEnabled={soundEnabled}
      />

      <div className="absolute right-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-2 pt-[env(safe-area-inset-top)]">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => replay(false)}
            className="shadow-sm"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            もう一度見る
          </Button>
          <Button
            variant={soundEnabled ? "default" : "outline"}
            onClick={() => replay(!soundEnabled)}
            className="shadow-sm"
          >
            {soundEnabled ? (
              <Volume2 className="mr-2 h-4 w-4" />
            ) : (
              <VolumeX className="mr-2 h-4 w-4" />
            )}
            {soundEnabled ? "音あり" : "音なし"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          プレビュー用（本番の記録には影響しません）
        </p>
      </div>
    </main>
  );
}

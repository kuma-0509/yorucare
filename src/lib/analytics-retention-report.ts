import type { RetentionSummary } from "./analytics-retention";

/**
 * 継続指標を運用者向けのプレーンテキストにする。
 *
 * ここは画面に出す文言ではなく、接続文字列を持つ管理環境で実行する
 * `pnpm analytics:summary` の出力なので、`src/lib/copy.ts` には置かない。
 *
 * 次の3つを必ず併記する。数値だけを切り出して読ませないためのもの。
 *
 * 1. すべての割合に母数。母数が0のときは 0% ではなく「出さない」と書く。
 * 2. Gate 1 の判定を出さないこと。合否は `docs/phase2-plan.md` 4節と、
 *    実機テストの結果をあわせて人が判断する。
 * 3. 集計上の限界（複数端末、データ削除、不同意、送信失敗）。
 */

/** Gate 1 の判定を出せる最小の対象数（`docs/phase2-plan.md` 4節） */
export const GATE1_MINIMUM_INSTALLS = 15;

const LIMITS = [
  "複数の端末やブラウザを使う場合は、別々の対象として数える。",
  "ブラウザのデータを削除した場合、以降は別の対象として数える。",
  "送信に同意していない利用と、送信に失敗した利用は数に入らない。",
  "利用継続率は使いやすさを見るための指標で、医学的効果の根拠ではない。",
];

/** 「58.3%（対象12件中7件）」の形。母数が0のときは割合を出さない */
function formatRate(
  rate: number | null,
  numerator: number,
  denominator: number,
  denominatorLabel: string
): string {
  if (rate === null) {
    return `—（${denominatorLabel}が0件のため出さない）`;
  }
  return `${rate}%（${denominatorLabel}${denominator}件中${numerator}件）`;
}

function formatMedian(median: number | null, samples: number): string {
  if (median === null) {
    return "—（対象が0件のため出さない）";
  }
  return `${median}日（対象は端末・ブラウザ×週で${samples}件）`;
}

export function formatRetentionReport(summary: RetentionSummary): string {
  const lines = [
    "ヨルケア 匿名利用イベントの継続指標",
    `集計日（日本時間）: ${summary.asOfDate}`,
    "",
    `対象: Day 27 まで終わった端末・ブラウザ ${summary.matureInstalls}件`,
    "（Day 0 は record_saved の最初のサーバ受信日。人ではなく端末・ブラウザ単位で数える）",
    "",
    `初週複数日記録率: ${formatRate(
      summary.firstWeekMultiDayRate,
      summary.firstWeekMultiDayInstalls,
      summary.matureInstalls,
      "対象"
    )}`,
    `Week 2 継続率: ${formatRate(
      summary.week2RetentionRate,
      summary.week2RetainedInstalls,
      summary.matureInstalls,
      "対象"
    )}`,
    `Week 4 継続率: ${formatRate(
      summary.week4RetentionRate,
      summary.week4RetainedInstalls,
      summary.matureInstalls,
      "対象"
    )}`,
    `週あたり記録日数（中央値）: ${formatMedian(
      summary.medianWeeklyRecordDays,
      summary.weeklyRecordDaySamples
    )}`,
    `中断後再開率: ${formatRate(
      summary.resumptionRate,
      summary.resumedInstalls,
      summary.interruptedInstalls,
      "記録がない日が7日以上続いた対象"
    )}`,
    "",
  ];

  if (summary.matureInstalls < GATE1_MINIMUM_INSTALLS) {
    lines.push(
      `Gate 1 の判定: 出さない。判定には対象が${GATE1_MINIMUM_INSTALLS}件以上必要で、` +
        `いまは${summary.matureInstalls}件（docs/phase2-plan.md 4節）。`
    );
  } else {
    lines.push(
      "Gate 1 の判定: このスクリプトは合否を出さない。docs/phase2-plan.md 4節の表と、" +
        "実機テストの2分以内完了の人数をあわせて人が判断する。"
    );
  }

  lines.push("", "集計上の限界:");
  for (const limit of LIMITS) {
    lines.push(`- ${limit}`);
  }
  lines.push(
    "",
    "共有するときは、少人数の個人を推測できる内訳を出さない（docs/anonymous-analytics.md 7節）。"
  );

  return lines.join("\n");
}

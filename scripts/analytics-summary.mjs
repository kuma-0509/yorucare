/**
 * 匿名利用イベントの継続指標を集計して表示する。
 *
 * 接続文字列を持つ管理環境で実行する運用者向けのスクリプトで、
 * 公開されるエンドポイントは増やさない（`pnpm db:analytics:setup` と同じ運用形）。
 *
 * 出力するのは集計値だけで、端末・ブラウザごとの行は出さない。
 * 数え方と言い方は `src/lib/analytics-retention.ts` と
 * `src/lib/analytics-retention-report.ts` に置き、ここでは持たない。
 * ここで数え直すと、単体テストで固定した定義と静かにずれる。
 *
 * `src/lib/*.ts` をそのまま読み込むため、実行には Node.js 22.18 以降が要る。
 * `package.json` の `analytics:summary` に付けたフラグは、TypeScript を
 * 読み込むときに出る警告を止めるためのもので、動作は変えない。
 */
import { neon } from "@neondatabase/serverless";

const MODULE_URLS = {
  retention: new URL("../src/lib/analytics-retention.ts", import.meta.url),
  report: new URL("../src/lib/analytics-retention-report.ts", import.meta.url),
};

async function loadModule(url) {
  try {
    return await import(url.href);
  } catch (error) {
    throw new Error(
      `${url.pathname} を読み込めませんでした。` +
        "TypeScript をそのまま実行できる Node.js 22.18 以降で実行してください。",
      { cause: error }
    );
  }
}

const databaseUrl =
  process.env.ANALYTICS_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

if (!databaseUrl) {
  throw new Error(
    "ANALYTICS_DATABASE_URL または DATABASE_URL を設定してください。"
  );
}

const { calculateRetentionSummary, toJapanDate } = await loadModule(
  MODULE_URLS.retention
);
const { formatRetentionReport } = await loadModule(MODULE_URLS.report);

const sql = neon(databaseUrl);
const rows = await sql`
  SELECT install_id_hash, activity_date::text AS activity_date
  FROM anonymous_analytics_record_days
  ORDER BY install_id_hash, activity_date
`;

const summary = calculateRetentionSummary(
  rows.map((row) => ({
    installIdHash: row.install_id_hash,
    activityDate: row.activity_date,
  })),
  toJapanDate(new Date())
);

console.log(formatRetentionReport(summary));

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

// 本人記録用のNeonプロジェクトへ適用する。匿名利用イベント用の
// ANALYTICS_DATABASE_URL は意図的に読まない（データ境界を分けるため）。
const databaseUrl = process.env.USER_DATA_DATABASE_URL ?? "";

if (!databaseUrl) {
  throw new Error(
    "USER_DATA_DATABASE_URL を設定してください（匿名分析用のURLは使えません）。"
  );
}

const migrationUrl = new URL(
  "../db/migrations/0002_user_data_snapshots.sql",
  import.meta.url
);
const migration = await readFile(fileURLToPath(migrationUrl), "utf8");
const statements = migration
  .split("-- statement-breakpoint")
  .map((statement) => statement.trim())
  .filter(Boolean);
const sql = neon(databaseUrl);

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`本人記録用のDB構造を更新しました（${statements.length}件）。`);

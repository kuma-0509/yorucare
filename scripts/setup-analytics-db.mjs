import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.ANALYTICS_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

if (!databaseUrl) {
  throw new Error(
    "ANALYTICS_DATABASE_URL または DATABASE_URL を設定してください。"
  );
}

const migrationUrl = new URL(
  "../db/migrations/0001_anonymous_analytics.sql",
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

console.log(`匿名利用イベント用のDB構造を更新しました（${statements.length}件）。`);

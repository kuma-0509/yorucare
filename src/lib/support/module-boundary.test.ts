import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * 個人の記録と外部公開データを、モジュールとして分けたままにする。
 *
 * `src/lib/support/**` から記録の保存層へ手が届くと、
 * 「記録の内容に応じて表示する窓口を変える」実装が書けてしまう。
 * ヨルケアは入力内容から危険度・緊急度を推定しないので、
 * その経路を境界として塞いだままにする。
 */

const SUPPORT_DIR = fileURLToPath(new URL(".", import.meta.url));

/** 支援先データ層から参照してはいけないモジュール */
const FORBIDDEN_IMPORTS = [
  "repository",
  "storage",
  "schemas",
  "analytics",
  "completion-log",
];

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(path));
      continue;
    }
    if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(path);
    }
  }
  return files;
}

function importedPaths(source: string): string[] {
  return [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
}

describe("支援先データ層の境界", () => {
  const files = listSourceFiles(SUPPORT_DIR);

  it("走査対象のファイルがある", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("本人の記録を扱うモジュールを読み込まない", () => {
    for (const file of files) {
      const imports = importedPaths(readFileSync(file, "utf8"));
      for (const specifier of imports) {
        for (const forbidden of FORBIDDEN_IMPORTS) {
          expect(
            specifier.includes(forbidden),
            `${file} が ${specifier} を読み込んでいる`
          ).toBe(false);
        }
      }
    }
  });

  it("DailyRecord 型を参照しない", () => {
    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toContain("DailyRecord");
    }
  });
});

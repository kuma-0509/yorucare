// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "./constants";
import { clearCompletionForDate, clearCompletionLog } from "./completion-log";

/**
 * 締めくくり演出は削除済みで、このログへ新しく書き込む経路は無い。
 * 残っているのは、以前の版を使っていた端末から消すための入口だけなので、
 * 保存済みの形を直接置いてから消せることを確かめる。
 */
function seedLog(log: {
  entries?: { date: string; style?: string; at?: string }[];
  burnedDates?: string[];
}): void {
  localStorage.setItem(
    STORAGE_KEYS.completionLog,
    JSON.stringify({ entries: [], burnedDates: [], ...log })
  );
}

function readRaw(): { entries: { date: string }[]; burnedDates: string[] } {
  const raw = localStorage.getItem(STORAGE_KEYS.completionLog);
  return raw
    ? (JSON.parse(raw) as { entries: { date: string }[]; burnedDates: string[] })
    : { entries: [], burnedDates: [] };
}

beforeEach(() => {
  localStorage.clear();
});

describe("以前の版が残した演出の記録を消す", () => {
  it("指定した日の演出と手放し済み状態だけを消す", () => {
    seedLog({
      entries: [
        { date: "2026-08-17", style: "paper", at: "2026-08-17T12:00:00.000Z" },
        { date: "2026-08-18", style: "shelf", at: "2026-08-18T12:00:00.000Z" },
      ],
      burnedDates: ["2026-08-17"],
    });

    clearCompletionForDate("2026-08-17");

    expect(readRaw().entries.map((entry) => entry.date)).toEqual([
      "2026-08-18",
    ]);
    expect(readRaw().burnedDates).toEqual([]);
  });

  it("最後の1件を消したら保存キー自体を残さない", () => {
    seedLog({
      entries: [
        { date: "2026-08-18", style: "shelf", at: "2026-08-18T12:00:00.000Z" },
      ],
    });

    clearCompletionForDate("2026-08-18");

    expect(localStorage.getItem(STORAGE_KEYS.completionLog)).toBeNull();
  });

  it("保存内容が壊れていても例外を投げず、消したい日を残さない", () => {
    localStorage.setItem(STORAGE_KEYS.completionLog, "{壊れたJSON");

    expect(() => clearCompletionForDate("2026-08-18")).not.toThrow();
    expect(localStorage.getItem(STORAGE_KEYS.completionLog)).toBeNull();
  });

  it("端末から演出の記録をすべて消す", () => {
    seedLog({
      entries: [
        { date: "2026-08-17", style: "paper", at: "2026-08-17T12:00:00.000Z" },
        { date: "2026-08-18", style: "shelf", at: "2026-08-18T12:00:00.000Z" },
      ],
      burnedDates: ["2026-08-17"],
    });

    clearCompletionLog();

    expect(localStorage.getItem(STORAGE_KEYS.completionLog)).toBeNull();
  });

  it("何も保存していなくても失敗しない", () => {
    expect(() => clearCompletionLog()).not.toThrow();
    expect(() => clearCompletionForDate("2026-08-18")).not.toThrow();
  });
});

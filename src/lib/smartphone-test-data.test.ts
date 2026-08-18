import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getGoalToReview } from "./goal";
import { parseExportPayload } from "./schemas";
import { summarizePeriod } from "./ai/period-summary";
import type { DailyRecord } from "./types";

/**
 * `scripts/make-test-data.mjs` が作る実機テスト用の見本データを固定する。
 *
 * 見本は `docs/smartphone-test-checklist.md` の C-10・F-6・F-7・F-17・G-7 を
 * 実施できる状態にするためのもので、条件を1つでも落とすと
 * 「その項目を確かめられない見本」になる。実機で気づいても作り直せないため、
 * ここで確かめる。
 */

const TODAY = "2026-08-17";
const SCRIPT = join(process.cwd(), "scripts", "make-test-data.mjs");

function generate() {
  const dir = mkdtempSync(join(tmpdir(), "yorucare-testdata-"));
  execFileSync(process.execPath, [SCRIPT, "--out", dir, "--today", TODAY], {
    stdio: "pipe",
  });
  return {
    current: JSON.parse(
      readFileSync(join(dir, "yorucare-testdata.json"), "utf8")
    ) as Record<string, unknown>,
    legacy: JSON.parse(
      readFileSync(join(dir, "yorucare-testdata-legacy.json"), "utf8")
    ) as Record<string, unknown>,
  };
}

function parsedRecords(payload: Record<string, unknown>): DailyRecord[] {
  const parsed = parseExportPayload(payload);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.data.records as DailyRecord[];
}

describe("実機テスト用の見本データ", () => {
  const { current, legacy } = generate();

  it("アプリの取り込みが受け付ける形式になっている", () => {
    const parsed = parseExportPayload(current);
    expect(parsed.ok).toBe(true);
  });

  it("記録が直近7日の範囲に入っていて、今日のぶんは持たない", () => {
    const dates = parsedRecords(current).map((record) => record.date);
    // 今日のぶんは実機テストで本人が書く。見本が先に埋めない
    expect(dates).not.toContain(TODAY);
    expect(dates).toEqual(["2026-08-16", "2026-08-15", "2026-08-14", "2026-08-12"]);
  });

  it("C-10: 昨日の記録に目標が入っていて、今日ふりかえりが出る", () => {
    const yesterday = parsedRecords(current).find(
      (record) => record.date === "2026-08-16"
    );
    expect(getGoalToReview(yesterday ?? null)).not.toBeNull();
  });

  it("F-7: 続けて書けた日が2日以上ある（連続の行が出る）", () => {
    const dates = parsedRecords(current)
      .map((record) => record.date)
      .sort();
    let longest = 1;
    let current_ = 1;
    for (let i = 1; i < dates.length; i += 1) {
      const previous = new Date(`${dates[i - 1]}T00:00:00`);
      previous.setDate(previous.getDate() + 1);
      const isNextDay = previous.toISOString().slice(0, 10) === dates[i];
      current_ = isNextDay ? current_ + 1 : 1;
      longest = Math.max(longest, current_);
    }
    expect(longest).toBeGreaterThanOrEqual(2);
    // 途切れた日がないと、記録できなかった日の見え方（F-5）を確かめられない
    expect(dates.length).toBeLessThan(6);
  });

  it("F-6: できたことがあった日が1日以上あり、登録簿にある項目だけを指す", () => {
    const records = parsedRecords(current);
    const itemIds = new Set(
      (current.selfCareItems as { id: string }[]).map((item) => item.id)
    );
    const doneDays = records.filter((record) => record.selfCareIds.length > 0);
    expect(doneDays.length).toBeGreaterThan(0);
    for (const record of records) {
      for (const id of record.selfCareIds) {
        expect(itemIds.has(id)).toBe(true);
      }
    }
  });

  it("F-17/F-24: 週のまとめの母数が行ごとに違う", () => {
    const summary = summarizePeriod(parsedRecords(current), "2026-08-11", TODAY);
    const denominators = [
      summary.mood.scoredDays,
      summary.sleep.measuredDays,
      summary.medication.answeredDays,
      summary.warning.answeredDays,
      summary.goalReview.answeredDays,
    ];
    // 「行によって母数が違ってよい」ことを実機で見せるための見本なので、
    // すべて同じ数になっていたら見本として役に立たない
    expect(new Set(denominators).size).toBeGreaterThan(1);
    for (const days of denominators) {
      expect(days).toBeGreaterThan(0);
    }
    expect(summary.recordedDays).toBe(4);
  });

  it("G-7: 旧形式は復職日のフィールドを持たず、記録は現行形式と同じ", () => {
    expect("returnDate" in legacy).toBe(false);
    expect(current.returnDate).toBe("2026-08-07");

    const parsed = parseExportPayload(legacy);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // 未設定へ戻ることだけを見たいので、記録が消える見本にはしない
    expect(parsed.data.returnDate).toBeNull();
    expect(parsed.data.records).toHaveLength(4);
    expect(legacy.records).toEqual(current.records);
  });

  it("見本に自由記述を持たせない", () => {
    for (const record of parsedRecords(current)) {
      expect(record.note).toBe("");
      expect(record.warningNote).toBe("");
      expect(record.selfCareMemo).toBe("");
    }
  });
});

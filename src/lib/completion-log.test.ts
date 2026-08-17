// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./constants";
import {
  WEEKLY_BURN_THRESHOLD,
  burnActivePapers,
  canBurnWeekly,
  getActivePaperCount,
  getActivePaperDates,
  getCompletionForDate,
  getCompletionLog,
  recordCompletion,
} from "./completion-log";

function readRaw(): { entries: unknown[]; burnedDates: unknown[] } {
  const raw = localStorage.getItem(STORAGE_KEYS.completionLog);
  return raw
    ? (JSON.parse(raw) as { entries: unknown[]; burnedDates: unknown[] })
    : { entries: [], burnedDates: [] };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("記録完了演出の記録", () => {
  it("何も選んでいない端末では空のログを返す", () => {
    expect(getCompletionLog()).toEqual({ entries: [], burnedDates: [] });
    expect(getCompletionForDate("2026-08-17")).toBe(null);
    expect(getActivePaperDates()).toEqual([]);
    expect(canBurnWeekly()).toBe(false);
  });

  it("選んだ演出を日付ごとに残す", () => {
    recordCompletion("2026-08-17", "shelf");

    const entry = getCompletionForDate("2026-08-17");
    expect(entry?.style).toBe("shelf");
    expect(entry?.date).toBe("2026-08-17");
    // 選んだ時刻は ISO 文字列で持つ
    expect(Number.isNaN(Date.parse(entry?.at ?? ""))).toBe(false);
  });

  it("同じ日に選び直したら上書きし、件数を増やさない", () => {
    recordCompletion("2026-08-17", "shelf");
    recordCompletion("2026-08-17", "paper");

    const log = getCompletionLog();
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]?.style).toBe("paper");
  });

  it("別の日の選択は残したまま追加する", () => {
    recordCompletion("2026-08-16", "shelf");
    recordCompletion("2026-08-17", "paper");

    expect(getCompletionLog().entries).toHaveLength(2);
    expect(getCompletionForDate("2026-08-16")?.style).toBe("shelf");
  });

  it("保存内容が壊れていても空のログとして読み、例外を投げない", () => {
    localStorage.setItem(STORAGE_KEYS.completionLog, "{壊れたJSON");

    expect(() => getCompletionLog()).not.toThrow();
    expect(getCompletionLog()).toEqual({ entries: [], burnedDates: [] });
  });

  it("形の合わない項目だけを捨て、読める項目は残す", () => {
    localStorage.setItem(
      STORAGE_KEYS.completionLog,
      JSON.stringify({
        entries: [
          { date: "2026-08-17", style: "shelf", at: "2026-08-17T12:00:00.000Z" },
          { date: "2026-08-16", style: "unknown", at: "x" },
          { date: 20260815, style: "paper", at: "x" },
          null,
        ],
        burnedDates: ["2026-08-10", 3, null],
      })
    );

    const log = getCompletionLog();
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]?.date).toBe("2026-08-17");
    expect(log.burnedDates).toEqual(["2026-08-10"]);
  });

  it("保存できない端末でも例外を投げず、コア機能を止めない", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => recordCompletion("2026-08-17", "shelf")).not.toThrow();
  });
});

describe("手放していない紙の集計", () => {
  it("紙を選んだ日だけを古い順に返す", () => {
    recordCompletion("2026-08-17", "paper");
    recordCompletion("2026-08-15", "shelf");
    recordCompletion("2026-08-16", "paper");

    expect(getActivePaperDates()).toEqual(["2026-08-16", "2026-08-17"]);
    expect(getActivePaperCount()).toBe(2);
  });

  it("しきい値に届くまでは「まとめて手放す」を出さない", () => {
    for (let i = 1; i < WEEKLY_BURN_THRESHOLD; i += 1) {
      recordCompletion(`2026-08-${String(i).padStart(2, "0")}`, "paper");
    }
    expect(canBurnWeekly()).toBe(false);

    recordCompletion(
      `2026-08-${String(WEEKLY_BURN_THRESHOLD).padStart(2, "0")}`,
      "paper"
    );
    expect(canBurnWeekly()).toBe(true);
  });

  it("まとめて手放しても記録の選択自体は消さない", () => {
    recordCompletion("2026-08-16", "paper");
    recordCompletion("2026-08-17", "paper");

    burnActivePapers();

    // 演出上は手放し済みでも、選んだ記録は残す（記録データを消さない設計）
    expect(getCompletionLog().entries).toHaveLength(2);
    expect(getCompletionForDate("2026-08-17")?.style).toBe("paper");
    expect(getActivePaperDates()).toEqual([]);
    expect(canBurnWeekly()).toBe(false);
  });

  it("続けて手放しても、手放した日付を二重に積まない", () => {
    recordCompletion("2026-08-17", "paper");
    burnActivePapers();
    burnActivePapers();

    expect(readRaw().burnedDates).toEqual(["2026-08-17"]);
  });

  it("手放したあとに新しく紙を選んだら、その日が次の対象になる", () => {
    recordCompletion("2026-08-17", "paper");
    burnActivePapers();
    recordCompletion("2026-08-18", "paper");

    expect(getActivePaperDates()).toEqual(["2026-08-18"]);
  });
});

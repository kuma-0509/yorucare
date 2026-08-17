import { describe, expect, it, vi } from "vitest";
import {
  buildNarrativeRequest,
  fillReport,
  isExternalNarrativeEnabled,
  resolveNarrativeFiller,
  type NarrativeFiller,
} from "./report-narrative";
import { buildReportSkeleton, type ReportSkeleton } from "./report";
import type { DailyRecord, SelfCareItem } from "../types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-07-21",
    moodScore: 4,
    moodLabels: [],
    sleepStart: "23:00",
    sleepEnd: "07:00",
    sleepMinutes: 480,
    medication: "done",
    warningLevel: "none",
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    selfCareFeeling: null,
    note: "",
    tomorrowGoal: "",
    goalReviewStatus: null,
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

const ITEMS: SelfCareItem[] = [
  {
    id: "s1",
    title: "散歩する",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

const FROM = "2026-07-21";
const TO = "2026-07-27";

function skeleton(): ReportSkeleton {
  return buildReportSkeleton(
    [
      makeRecord({
        id: "a",
        date: "2026-07-21",
        moodScore: 3,
        note: "誰にも見せたくないメモ本文",
        warningTags: ["眠れない"],
        selfCareIds: ["s1"],
      }),
      makeRecord({ id: "b", date: "2026-07-22", moodScore: 5 }),
    ],
    ITEMS,
    FROM,
    TO
  );
}

/** 穴をすべて埋める filler。テストからだけ使う */
function fillerReturning(text: string): NarrativeFiller {
  return async (request) =>
    request.slots.map((requested) => ({ slotId: requested.id, text }));
}

describe("外部送信の既定", () => {
  it("外部AI APIへの送信は既定で無効のまま固定されている", () => {
    expect(isExternalNarrativeEnabled()).toBe(false);
  });

  it("同梱している filler は無い", () => {
    expect(resolveNarrativeFiller()).toBeNull();
  });
});

describe("buildNarrativeRequest", () => {
  it("報告書に出る見出しと数値だけを渡す", () => {
    const request = buildNarrativeRequest(skeleton());
    const serialized = JSON.stringify(request);

    for (const text of [
      "誰にも見せたくないメモ本文",
      "眠れない",
      "散歩する",
      "2026-07-22",
    ]) {
      expect(serialized).not.toContain(text);
    }
    expect(request.range).toEqual({ from: FROM, to: TO });
  });

  it("穴ごとに、何を書くかと文字数の上限を渡す", () => {
    const request = buildNarrativeRequest(skeleton());

    expect(request.slots.map((entry) => entry.id)).toEqual([
      "overview",
      "mood",
      "sleep",
      "selfCare",
    ]);
    for (const entry of request.slots) {
      expect(entry.purpose.length).toBeGreaterThan(0);
      expect(entry.maxLength).toBeGreaterThan(0);
    }
  });

  it("守らせたい制約を指示として並べる", () => {
    const instructions = buildNarrativeRequest(skeleton()).instructions.join("");

    expect(instructions).toContain("数を書かない");
    expect(instructions).toContain("評価しない");
    expect(instructions).toContain("助言");
  });
});

describe("fillReport", () => {
  it("filler を渡さなければ外部を呼ばず、すべて定型文になる", async () => {
    const { report, outcomes } = await fillReport(skeleton());

    expect(outcomes.every((outcome) => outcome.source === "fallback")).toBe(true);
    expect(outcomes.every((outcome) => outcome.reason === "notRequested")).toBe(
      true
    );
    for (const section of report.sections) {
      expect(section.narrative).toBe(section.slot.fallback);
    }
  });

  it("検証を通った文だけを差し込む", async () => {
    const { report, outcomes } = await fillReport(
      skeleton(),
      fillerReturning("この期間に残った記録を並べています。")
    );

    expect(outcomes.every((outcome) => outcome.source === "llm")).toBe(true);
    for (const section of report.sections) {
      expect(section.narrative).toBe("この期間に残った記録を並べています。");
      expect(section.narrativeSource).toBe("llm");
    }
  });

  it("評価語を含む文は定型文へ差し替える", async () => {
    const { report, outcomes } = await fillReport(
      skeleton(),
      fillerReturning("記録は順調に残っています。")
    );

    expect(outcomes[0]).toEqual({
      slotId: "overview",
      source: "fallback",
      reason: "forbiddenWord",
      detail: "順調",
    });
    for (const section of report.sections) {
      expect(section.narrative).toBe(section.slot.fallback);
      expect(section.narrativeSource).toBe("fallback");
    }
  });

  it("数を含む文は定型文へ差し替える（数値はアプリが埋めるため）", async () => {
    const { outcomes } = await fillReport(
      skeleton(),
      fillerReturning("この期間は5日分の記録が残りました。")
    );

    expect(
      outcomes.every((outcome) => outcome.reason === "containsNumber")
    ).toBe(true);
  });

  it("落ちた穴だけを差し替え、他の節の文は残す", async () => {
    const filler: NarrativeFiller = async (request) =>
      request.slots.map((requested) => ({
        slotId: requested.id,
        text:
          requested.id === "mood"
            ? "記録は順調に残っています。"
            : "この期間に残った記録を並べています。",
      }));

    const { report } = await fillReport(skeleton(), filler);
    const bySlot = new Map(
      report.sections.map((section) => [section.id, section])
    );

    expect(bySlot.get("mood")?.narrativeSource).toBe("fallback");
    expect(bySlot.get("overview")?.narrativeSource).toBe("llm");
    expect(bySlot.get("sleep")?.narrativeSource).toBe("llm");
  });

  it("答えが返らなかった穴は定型文になる", async () => {
    const filler: NarrativeFiller = async () => [
      { slotId: "overview", text: "この期間に残った記録を並べています。" },
    ];

    const { outcomes } = await fillReport(skeleton(), filler);

    expect(outcomes[0].source).toBe("llm");
    expect(outcomes.slice(1).every((outcome) => outcome.reason === "notFilled")).toBe(
      true
    );
  });

  it("知らない穴の答えは無視する", async () => {
    const filler: NarrativeFiller = async () => [
      { slotId: "unknown", text: "この期間に残った記録を並べています。" },
    ];

    const { report } = await fillReport(skeleton(), filler);

    expect(
      report.sections.every((section) => section.narrativeSource === "fallback")
    ).toBe(true);
  });

  it("filler が例外を投げてもすべて定型文で成立する", async () => {
    const filler = vi.fn(async () => {
      throw new Error("送信に失敗しました");
    });

    const { report, outcomes } = await fillReport(skeleton(), filler);

    expect(filler).toHaveBeenCalledTimes(1);
    expect(outcomes.every((outcome) => outcome.reason === "fillerFailed")).toBe(
      true
    );
    expect(
      report.sections.every((section) => section.narrative === section.slot.fallback)
    ).toBe(true);
  });

  it("配列でない戻り値も失敗として扱う", async () => {
    const filler = (async () => "文字列" as unknown) as NarrativeFiller;

    const { outcomes } = await fillReport(skeleton(), filler);

    expect(outcomes.every((outcome) => outcome.reason === "fillerFailed")).toBe(
      true
    );
  });

  it("同じ穴が複数返っても最初の答えだけを使う", async () => {
    const filler: NarrativeFiller = async () => [
      { slotId: "overview", text: "この期間に残った記録を並べています。" },
      { slotId: "overview", text: "記録は順調に残っています。" },
    ];

    const { report } = await fillReport(skeleton(), filler);
    const overview = report.sections.find((section) => section.id === "overview");

    expect(overview?.narrative).toBe("この期間に残った記録を並べています。");
  });
});

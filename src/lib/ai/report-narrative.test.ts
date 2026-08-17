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


/** 各穴で n 番目の候補を選ぶ filler。テストからだけ使う */
function fillerChoosing(index: number): NarrativeFiller {
  return async (request) =>
    request.slots.map((requested) => ({
      slotId: requested.id,
      candidateId: requested.candidates[index].id,
    }));
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

  it("穴ごとに、選べる候補と文字数の上限を渡す", () => {
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
      expect(entry.candidates.length).toBeGreaterThan(1);
    }
  });

  it("候補から1つ選ばせる指示を並べ、文を書かせない", () => {
    const instructions = buildNarrativeRequest(skeleton()).instructions.join("");

    expect(instructions).toContain("候補");
    expect(instructions).toContain("文を書かない");
    expect(instructions).toContain("評価しない");
  });
});

describe("fillReport", () => {
  it("filler を渡さなければ外部を呼ばず、すべて既定の文になる", async () => {
    const { report, outcomes } = await fillReport(skeleton());

    expect(outcomes.every((outcome) => outcome.source === "fallback")).toBe(true);
    expect(outcomes.every((outcome) => outcome.reason === "notRequested")).toBe(
      true
    );
    for (const section of report.sections) {
      expect(section.narrative).toBe(section.slot.candidates[0].text);
    }
  });

  it("選ばれた候補の文をそのまま差し込む", async () => {
    const { report, outcomes } = await fillReport(skeleton(), fillerChoosing(1));

    expect(outcomes.every((outcome) => outcome.source === "llm")).toBe(true);
    for (const section of report.sections) {
      expect(section.narrative).toBe(section.slot.candidates[1].text);
      expect(section.narrativeSource).toBe("llm");
    }
  });

  it("候補に無い id は既定の文へ差し替える（アプリが書いた文しか出さない）", async () => {
    const filler: NarrativeFiller = async (request) =>
      request.slots.map((requested) => ({
        slotId: requested.id,
        candidateId: "存在しない候補",
      }));

    const { report, outcomes } = await fillReport(skeleton(), filler);

    expect(outcomes[0]).toEqual({
      slotId: "overview",
      source: "fallback",
      reason: "unknownCandidate",
      detail: "存在しない候補",
    });
    for (const section of report.sections) {
      expect(section.narrative).toBe(section.slot.candidates[0].text);
      expect(section.narrativeSource).toBe("fallback");
    }
  });

  it("自由文を返しても、報告書には入らない", async () => {
    // 型では書けないが、実行時にJSONが返ってくる場面を想定する
    const filler = (async (request) =>
      request.slots.map((requested) => ({
        slotId: requested.id,
        candidateId: requested.candidates[0].id,
        text: "肺炎です。",
      }))) as NarrativeFiller;

    const { report } = await fillReport(skeleton(), filler);

    for (const section of report.sections) {
      expect(section.narrative).toBe(section.slot.candidates[0].text);
    }
    expect(JSON.stringify(report)).not.toContain("肺炎");
  });

  it("落ちた穴だけを差し替え、他の節の選択は残す", async () => {
    const filler: NarrativeFiller = async (request) =>
      request.slots.map((requested) => ({
        slotId: requested.id,
        candidateId:
          requested.id === "mood" ? "存在しない候補" : requested.candidates[1].id,
      }));

    const { report } = await fillReport(skeleton(), filler);
    const bySlot = new Map(
      report.sections.map((section) => [section.id, section])
    );

    expect(bySlot.get("mood")?.narrativeSource).toBe("fallback");
    expect(bySlot.get("overview")?.narrativeSource).toBe("llm");
    expect(bySlot.get("sleep")?.narrativeSource).toBe("llm");
  });

  it("答えが返らなかった穴は既定の文になる", async () => {
    const filler: NarrativeFiller = async (request) => [
      {
        slotId: "overview",
        candidateId: request.slots[0].candidates[1].id,
      },
    ];

    const { outcomes } = await fillReport(skeleton(), filler);

    expect(outcomes[0].source).toBe("llm");
    expect(
      outcomes.slice(1).every((outcome) => outcome.reason === "notFilled")
    ).toBe(true);
  });

  it("知らない穴の答えは無視する", async () => {
    const filler: NarrativeFiller = async (request) => [
      { slotId: "unknown", candidateId: request.slots[0].candidates[1].id },
    ];

    const { report } = await fillReport(skeleton(), filler);

    expect(
      report.sections.every((section) => section.narrativeSource === "fallback")
    ).toBe(true);
  });

  it("filler が例外を投げてもすべて既定の文で成立する", async () => {
    const filler = vi.fn(async () => {
      throw new Error("送信に失敗しました");
    });

    const { report, outcomes } = await fillReport(skeleton(), filler);

    expect(filler).toHaveBeenCalledTimes(1);
    expect(outcomes.every((outcome) => outcome.reason === "fillerFailed")).toBe(
      true
    );
    expect(
      report.sections.every(
        (section) => section.narrative === section.slot.candidates[0].text
      )
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
    const filler: NarrativeFiller = async (request) => [
      { slotId: "overview", candidateId: request.slots[0].candidates[1].id },
      { slotId: "overview", candidateId: request.slots[0].candidates[2].id },
    ];

    const { report } = await fillReport(skeleton(), filler);
    const overview = report.sections.find((section) => section.id === "overview");

    expect(overview?.narrative).toBe(overview?.slot.candidates[1].text);
  });
});

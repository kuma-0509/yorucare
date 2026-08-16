import { describe, expect, it } from "vitest";
import {
  buildAccumulationBoard,
  ELAPSED_DAY_MILESTONES,
  RECORDED_DAY_MILESTONES,
  resolveStartPoint,
  summarizeAccumulation,
} from "./milestones";
import type { DailyRecord } from "../types";

function record(date: string, overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: `id-${date}`,
    date,
    moodScore: null,
    moodLabels: [],
    sleepStart: null,
    sleepEnd: null,
    sleepMinutes: null,
    medication: null,
    warningLevel: null,
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    selfCareFeeling: null,
    note: "",
    tomorrowGoal: "",
    goalReviewStatus: null,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

/** from から日数分の連番の日付 */
function dates(from: string, count: number): string[] {
  const base = Date.parse(`${from}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(base + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
}

describe("resolveStartPoint", () => {
  it("復職日が設定されていればそれを起点にする", () => {
    expect(resolveStartPoint([record("2026-05-01")], "2026-04-01")).toEqual({
      date: "2026-04-01",
      source: "returnDate",
    });
  });

  it("復職日が未設定なら最初の記録日を起点にする", () => {
    const records = [record("2026-05-10"), record("2026-05-02"), record("2026-05-20")];
    expect(resolveStartPoint(records, null)).toEqual({
      date: "2026-05-02",
      source: "firstRecord",
    });
  });

  it("復職日も記録もなければ起点を決めない", () => {
    expect(resolveStartPoint([], null)).toBeNull();
  });
});

describe("summarizeAccumulation", () => {
  it("起点以降の記録だけを累計に数える", () => {
    const records = [
      record("2026-03-20"),
      record("2026-04-01"),
      record("2026-04-05"),
    ];
    const totals = summarizeAccumulation(records, "2026-04-01", "2026-04-10");

    expect(totals.recordedDays).toBe(2);
  });

  it("空いた日があっても累計は減らない", () => {
    const records = [record("2026-04-01"), record("2026-04-02"), record("2026-04-09")];
    const totals = summarizeAccumulation(records, "2026-04-01", "2026-04-09");

    expect(totals.recordedDays).toBe(3);
  });

  it("「できること」を残した日だけを活動日数に数える", () => {
    const records = [
      record("2026-04-01", { selfCareIds: ["a"] }),
      record("2026-04-02"),
      record("2026-04-03", { selfCareIds: ["a", "b"] }),
    ];
    const totals = summarizeAccumulation(records, "2026-04-01", "2026-04-03");

    expect(totals.recordedDays).toBe(3);
    expect(totals.activeDays).toBe(2);
  });

  it("経過日数は起点当日を0として数える", () => {
    expect(
      summarizeAccumulation([], "2026-04-01", "2026-04-01").elapsedDays
    ).toBe(0);
    expect(
      summarizeAccumulation([], "2026-04-01", "2026-04-08").elapsedDays
    ).toBe(7);
  });

  it("復職日が未来ならまだ数えはじめない", () => {
    const totals = summarizeAccumulation([], "2026-12-01", "2026-04-01");

    expect(totals.hasStarted).toBe(false);
    expect(totals.elapsedDays).toBe(0);
    expect(totals.reached).toEqual([]);
  });

  it("起点も記録もなければ空の集計を返す", () => {
    const totals = summarizeAccumulation([], null, "2026-04-01");

    expect(totals.start).toBeNull();
    expect(totals.recordedDays).toBe(0);
    expect(totals.next).toEqual([]);
  });

  it("最長の連続記録を返す", () => {
    const records = [
      ...dates("2026-04-01", 3).map((d) => record(d)),
      ...dates("2026-04-06", 5).map((d) => record(d)),
    ];
    const totals = summarizeAccumulation(records, "2026-04-01", "2026-04-15");

    expect(totals.longestRecordedStreak).toBe(5);
  });

  it("連続が1日しかなければ最長を0として扱う", () => {
    const records = [record("2026-04-01"), record("2026-04-03")];
    const totals = summarizeAccumulation(records, "2026-04-01", "2026-04-04");

    expect(totals.longestRecordedStreak).toBe(0);
  });

  it("起点が何年も前でも連続日数を数えられる", () => {
    const records = dates("2026-04-01", 4).map((d) => record(d));
    const totals = summarizeAccumulation(records, "1999-01-01", "2026-04-10");

    expect(totals.longestRecordedStreak).toBe(4);
    expect(totals.recordedDays).toBe(4);
  });

  it("到達済みの節目は種類ごとに最大の1件だけを返す", () => {
    const records = dates("2026-04-01", 16).map((d) => record(d));
    const totals = summarizeAccumulation(records, "2026-04-01", "2026-04-16");

    expect(totals.reached).toEqual([
      { kind: "recordedDays", value: 14 },
      { kind: "elapsedDays", value: 7 },
    ]);
    expect(totals.next).toEqual([
      { kind: "recordedDays", value: 30 },
      { kind: "elapsedDays", value: 30 },
    ]);
  });

  it("記録した日の節目は、その累計に届いた日を過ぎたら祝わない", () => {
    // 3日連続で記録したあと、記録しない日が続いても累計は3のまま。
    // 節目ちょうどの値だからと祝い続けないこと
    const records = dates("2026-04-01", 3).map((d) => record(d));

    expect(
      summarizeAccumulation(records, "2026-04-01", "2026-04-03").justReached
    ).toContainEqual({ kind: "recordedDays", value: 3 });
    expect(
      summarizeAccumulation(records, "2026-04-01", "2026-04-04").justReached
    ).not.toContainEqual({ kind: "recordedDays", value: 3 });
    expect(
      summarizeAccumulation(records, "2026-04-01", "2026-04-20").justReached
    ).toEqual([]);
  });

  it("過去の日付をあとから記録して節目に届いても祝わない", () => {
    const records = dates("2026-04-01", 3).map((d) => record(d));
    const totals = summarizeAccumulation(records, "2026-04-01", "2026-04-05");

    expect(totals.recordedDays).toBe(3);
    expect(totals.justReached).toEqual([]);
  });

  it("経過日数の節目は記録がない日でも届いた日に祝う", () => {
    expect(
      summarizeAccumulation([], "2026-04-01", "2026-04-08").justReached
    ).toContainEqual({ kind: "elapsedDays", value: 7 });
    expect(
      summarizeAccumulation([], "2026-04-01", "2026-04-09").justReached
    ).toEqual([]);
  });

  it("ちょうど節目に届いた日だけ justReached を返す", () => {
    const records = dates("2026-04-01", 7).map((d) => record(d));
    const onDay = summarizeAccumulation(records, "2026-04-01", "2026-04-07");
    const nextDay = summarizeAccumulation(
      [...records, record("2026-04-08")],
      "2026-04-01",
      "2026-04-08"
    );

    expect(onDay.justReached).toContainEqual({ kind: "recordedDays", value: 7 });
    expect(nextDay.justReached).not.toContainEqual({
      kind: "recordedDays",
      value: 7,
    });
  });

  it("最後の節目を越えると next を返さない", () => {
    const last = RECORDED_DAY_MILESTONES[RECORDED_DAY_MILESTONES.length - 1];
    const records = dates("2026-01-01", last).map((d) => record(d));
    const totals = summarizeAccumulation(records, "2026-01-01", "2026-12-31");

    expect(totals.next).not.toContainEqual(
      expect.objectContaining({ kind: "recordedDays" })
    );
  });

  it("同じ入力からは常に同じ結果を返す", () => {
    const records = dates("2026-04-01", 5).map((d) => record(d));
    expect(summarizeAccumulation(records, "2026-04-01", "2026-04-10")).toEqual(
      summarizeAccumulation(records, "2026-04-01", "2026-04-10")
    );
  });
});

describe("buildAccumulationBoard", () => {
  it("起点がなければ空状態にし、次に書くときの負担を下げる一文を出す", () => {
    const board = buildAccumulationBoard([], null, "2026-04-01");

    expect(board.isEmpty).toBe(true);
    expect(board.lines).toEqual([]);
    expect(board.headline).toContain("1日分から");
  });

  it("累計を先に並べ、連続は最後に置く", () => {
    const records = dates("2026-04-01", 5).map((d) => record(d));
    const board = buildAccumulationBoard(records, "2026-04-01", "2026-04-10");
    const ids = board.lines.map((line) => line.id);

    expect(ids[0]).toBe("recorded-days");
    expect(ids[1]).toBe("active-days");
    expect(ids[ids.length - 1]).toBe("longest-streak");
  });

  it("連続が2日に満たなければ連続の行を出さない", () => {
    const records = [record("2026-04-01"), record("2026-04-03")];
    const board = buildAccumulationBoard(records, "2026-04-01", "2026-04-05");

    expect(board.lines.map((line) => line.id)).not.toContain("longest-streak");
  });

  it("いま何日続いているかは出さない", () => {
    const records = dates("2026-04-01", 5).map((d) => record(d));
    const board = buildAccumulationBoard(records, "2026-04-01", "2026-04-10");
    const text = JSON.stringify(board);

    expect(text).not.toContain("継続中");
    expect(text).not.toContain("連続中");
    expect(text).not.toContain("いま続");
    expect(text).not.toContain("現在");
  });

  it("復職日を設定していれば復職からの日数として呼ぶ", () => {
    const board = buildAccumulationBoard(
      [record("2026-04-05")],
      "2026-04-01",
      "2026-04-10"
    );
    const elapsed = board.lines.find((line) => line.id === "elapsed-days");

    expect(elapsed?.label).toBe("復職からの日数");
    expect(elapsed?.note).toContain("復職日");
  });

  it("復職日が未設定なら、はじめてからの日数として呼ぶ", () => {
    const board = buildAccumulationBoard(
      [record("2026-04-05")],
      null,
      "2026-04-10"
    );
    const elapsed = board.lines.find((line) => line.id === "elapsed-days");

    expect(elapsed?.label).toBe("はじめてからの日数");
    expect(elapsed?.note).not.toContain("復職");
  });

  it("節目に届いた日だけねぎらう", () => {
    const records = dates("2026-04-01", 3).map((d) => record(d));
    const onDay = buildAccumulationBoard(records, "2026-04-01", "2026-04-03");
    const nextDay = buildAccumulationBoard(
      [...records, record("2026-04-04")],
      "2026-04-01",
      "2026-04-04"
    );

    expect(onDay.messages).toContain(
      "記録した日が3日になりました。ここまでおつかれさまです。"
    );
    expect(nextDay.messages).toEqual([]);
  });

  it("経過日数の節目は週・月・年の言い方にする", () => {
    const board = buildAccumulationBoard([], "2026-04-01", "2026-04-08");

    expect(board.messages).toContain(
      "復職から1週間です。ここまでおつかれさまです。"
    );
  });

  it("記録がない期間でも経過日数の節目は届く", () => {
    const board = buildAccumulationBoard([], "2026-04-01", "2026-05-01");

    expect(board.messages.length).toBeGreaterThan(0);
    expect(board.headline).toContain("1日分から");
  });

  it("節目の表示は到達済みとつぎの節目を持つ", () => {
    const records = dates("2026-04-01", 4).map((d) => record(d));
    const board = buildAccumulationBoard(records, "2026-04-01", "2026-04-04");
    const badge = board.badges.find((item) => item.kind === "recordedDays");

    expect(badge?.reachedLabel).toBe("3日");
    expect(badge?.nextLabel).toBe("7日");
  });

  it("まだ節目に届いていなければ到達済みを持たない", () => {
    const board = buildAccumulationBoard([], "2026-04-01", "2026-04-02");
    const badge = board.badges.find((item) => item.kind === "recordedDays");

    expect(badge?.reachedLabel).toBeNull();
    expect(badge?.nextLabel).toBe("1日");
  });

  it("復職日が未来なら、まだこれからと伝える", () => {
    const board = buildAccumulationBoard([], "2026-12-01", "2026-04-01");

    expect(board.isEmpty).toBe(true);
    expect(board.headline).toContain("これから");
    expect(board.messages).toEqual([]);
  });

  it("評価語・助言・診断に読める語を文面に出さない", () => {
    const scenarios = [
      buildAccumulationBoard([], null, "2026-04-01"),
      buildAccumulationBoard([], "2026-12-01", "2026-04-01"),
      ...RECORDED_DAY_MILESTONES.map((value) =>
        buildAccumulationBoard(
          dates("2026-01-01", value).map((d) => record(d, { selfCareIds: ["a"] })),
          "2026-01-01",
          dates("2026-01-01", value)[value - 1]
        )
      ),
      ...ELAPSED_DAY_MILESTONES.map((value) =>
        buildAccumulationBoard([], "2026-01-01", dates("2026-01-01", value + 1)[value])
      ),
    ];

    const text = scenarios
      .map((board) =>
        [
          board.headline,
          ...board.messages,
          ...board.lines.flatMap((line) => [line.label, line.value, line.note ?? ""]),
          ...board.badges.flatMap((badge) => [badge.label]),
        ].join("")
      )
      .join("");

    for (const word of [
      "すごい",
      "えらい",
      "順調",
      "改善",
      "悪化",
      "達成率",
      "サボ",
      "失敗",
      "途切れました",
      "できていません",
      "しましょう",
      "ください",
      "べき",
      "がんばり",
      "症状",
      "診断",
      "治療",
      "受診",
      "医師",
      "うつ",
      "危険",
    ]) {
      expect(text).not.toContain(word);
    }
  });
});

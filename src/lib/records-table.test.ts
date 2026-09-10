import { describe, expect, it } from "vitest";
import { COPY } from "./copy";
import { buildRecordsTable } from "./records-table";
import type { DailyRecord, NotToDoItem, SelfCareItem } from "./types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-09-09",
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
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildRecordsTable", () => {
  it("新しい日が上の行になり、未記録は空欄、記録済みは値を入れる", () => {
    const { columns, rows } = buildRecordsTable({
      daysNewestFirst: ["2026-09-10", "2026-09-09"],
      records: [
        makeRecord({
          moodScore: 3,
          sleepStart: "00:21",
          sleepEnd: "06:21",
          sleepMinutes: 360,
          note: "午前はゆっくり過ごした\n夕方に散歩した",
        }),
      ],
      selfCareItems: [],
      notToDoItems: [],
    });

    expect(columns.map((column) => column.key)).toEqual([
      "mood",
      "sleep",
      "memo",
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.date).toBe("2026-09-10");
    expect(rows[0]?.kind).toBe("missing");
    expect(rows[0]?.cells.mood).toBe(COPY.recordsList.emptyCell);
    expect(rows[1]?.kind).toBe("filled");
    expect(rows[1]?.cells.mood).toBe("ふつう");
    expect(rows[1]?.cells.sleep).toBe("00:21〜06:21（6時間）");
    expect(rows[1]?.cells.memo).toBe("午前はゆっくり過ごした\n夕方に散歩した");
  });

  it("空の保存だけした日は空欄行として扱う", () => {
    const { rows } = buildRecordsTable({
      daysNewestFirst: ["2026-09-09"],
      records: [makeRecord()],
      selfCareItems: [],
      notToDoItems: [],
    });

    expect(rows[0]?.kind).toBe("empty");
    expect(rows[0]?.cells.memo).toBe(COPY.recordsList.emptyCell);
  });

  it("値がある任意項目だけ列を足す", () => {
    const selfCareItems: SelfCareItem[] = [
      {
        id: "sc1",
        title: "早めに布団に入る",
        createdAt: "2026-09-09T00:00:00.000Z",
        updatedAt: "2026-09-09T00:00:00.000Z",
      },
    ];
    const notToDoItems: NotToDoItem[] = [
      {
        id: "n1",
        title: "夜は仕事を開かない",
        createdAt: "2026-09-09T00:00:00.000Z",
        updatedAt: "2026-09-09T00:00:00.000Z",
      },
    ];

    const { columns, rows } = buildRecordsTable({
      daysNewestFirst: ["2026-09-09"],
      records: [
        makeRecord({
          moodScore: 4,
          moodLabels: [
            { label: "安心", category: "ポジティブ", isCustom: false },
          ],
          medication: "done",
          warningLevel: "small",
          selfCareIds: ["sc1"],
          notToDoIds: ["n1"],
        }),
      ],
      selfCareItems,
      notToDoItems,
    });

    expect(columns.map((column) => column.key)).toEqual([
      "mood",
      "moodLabels",
      "sleep",
      "medication",
      "warning",
      "doneToday",
      "notToDo",
      "memo",
    ]);
    expect(rows[0]?.cells.moodLabels).toBe("安心");
    expect(rows[0]?.cells.medication).toBe("できた");
    expect(rows[0]?.cells.warning).toBe("少しあり");
    expect(rows[0]?.cells.doneToday).toBe("早めに布団に入る");
    expect(rows[0]?.cells.notToDo).toBe("夜は仕事を開かない");
  });
});

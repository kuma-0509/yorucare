import { describe, expect, it } from "vitest";
import {
  EXPORT_VERSION,
  MAX_GOAL_LENGTH,
  parseExportPayload,
  parseReturnDate,
  parseRecordsJson,
} from "./schemas";

const validRecord = {
  id: "r1",
  date: "2026-01-05",
  moodScore: 3,
  moodLabels: ["嬉しい"],
  sleepStart: "23:00",
  sleepEnd: "07:00",
  sleepMinutes: 480,
  medication: "done",
  warningLevel: "none",
  warningTags: [],
  warningNote: "",
  selfCareIds: [],
  selfCareMemo: "",
  note: "",
  createdAt: "2026-01-05T00:00:00.000Z",
  updatedAt: "2026-01-05T00:00:00.000Z",
};

describe("parseRecordsJson", () => {
  it("正しい記録配列を受け付け、moodLabelsを正規化する", () => {
    const result = parseRecordsJson([validRecord]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].moodLabels).toEqual([
        { label: "嬉しい", category: "ポジティブ", isCustom: false },
      ]);
    }
  });

  it("不正な日付形式を拒否する", () => {
    const result = parseRecordsJson([{ ...validRecord, date: "2026/01/05" }]);
    expect(result.success).toBe(false);
  });

  it("不正な moodScore を拒否する", () => {
    const result = parseRecordsJson([{ ...validRecord, moodScore: 6 }]);
    expect(result.success).toBe(false);
  });
});

describe("目標フィールドの後方互換", () => {
  it("目標フィールドがない版1の保存データをそのまま読める", () => {
    // validRecord は tomorrowGoal / goalReviewStatus を持たない旧データ
    const result = parseRecordsJson([validRecord]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].tomorrowGoal).toBe("");
      expect(result.data[0].goalReviewStatus).toBeNull();
    }
  });

  it("保存済みの目標とふりかえり結果を保持する", () => {
    const result = parseRecordsJson([
      {
        ...validRecord,
        tomorrowGoal: "昼休みに5分だけ外に出る",
        goalReviewStatus: "partial",
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].tomorrowGoal).toBe("昼休みに5分だけ外に出る");
      expect(result.data[0].goalReviewStatus).toBe("partial");
    }
  });

  it("長すぎる目標を拒否する", () => {
    const result = parseRecordsJson([
      { ...validRecord, tomorrowGoal: "あ".repeat(MAX_GOAL_LENGTH + 1) },
    ]);
    expect(result.success).toBe(false);
  });

  it("未定義のふりかえり結果を拒否する", () => {
    const result = parseRecordsJson([
      { ...validRecord, goalReviewStatus: "maybe" },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("セルフケアの感想フィールドの後方互換", () => {
  it("感想フィールドがない版2以前の保存データをそのまま読める", () => {
    // validRecord は selfCareFeeling を持たない旧データ
    const result = parseRecordsJson([validRecord]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].selfCareFeeling).toBeNull();
    }
  });

  it("保存済みの感想を保持する", () => {
    const result = parseRecordsJson([
      { ...validRecord, selfCareFeeling: "notFit" },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].selfCareFeeling).toBe("notFit");
    }
  });

  it("未定義の感想を拒否する", () => {
    const result = parseRecordsJson([
      { ...validRecord, selfCareFeeling: "とてもよかった" },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("parseExportPayload", () => {
  it("正しいエクスポート形式を受け付ける", () => {
    const result = parseExportPayload({
      version: EXPORT_VERSION,
      exportedAt: "2026-01-05T00:00:00.000Z",
      records: [validRecord],
      selfCareItems: [],
    });
    expect(result.ok).toBe(true);
  });

  it("version不一致を拒否する", () => {
    const result = parseExportPayload({
      version: 999,
      exportedAt: "2026-01-05T00:00:00.000Z",
      records: [],
      selfCareItems: [],
    });
    expect(result.ok).toBe(false);
  });

  it("壊れた入力を拒否する", () => {
    expect(parseExportPayload(null).ok).toBe(false);
    expect(parseExportPayload({}).ok).toBe(false);
  });
});

describe("復職日の後方互換", () => {
  it("復職日を持たない書き出しを読める", () => {
    const result = parseExportPayload({
      version: EXPORT_VERSION,
      exportedAt: "2026-01-05T00:00:00.000Z",
      records: [validRecord],
      selfCareItems: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.returnDate).toBeNull();
    }
  });

  it("復職日を持つ書き出しを読める", () => {
    const result = parseExportPayload({
      version: EXPORT_VERSION,
      exportedAt: "2026-01-05T00:00:00.000Z",
      returnDate: "2026-04-01",
      records: [],
      selfCareItems: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.returnDate).toBe("2026-04-01");
    }
  });

  it("形式が違う復職日を持つ書き出しは拒否する", () => {
    const result = parseExportPayload({
      version: EXPORT_VERSION,
      exportedAt: "2026-01-05T00:00:00.000Z",
      returnDate: "2026/04/01",
      records: [],
      selfCareItems: [],
    });

    expect(result.ok).toBe(false);
  });
});

describe("parseReturnDate", () => {
  it("YYYY-MM-DD だけを受け付ける", () => {
    expect(parseReturnDate("2026-04-01")).toBe("2026-04-01");
    expect(parseReturnDate("2026/04/01")).toBeNull();
    expect(parseReturnDate(null)).toBeNull();
    expect(parseReturnDate(42)).toBeNull();
  });
});

describe("暦に実在しない日付の扱い", () => {
  it("parseReturnDate は実在しない日を受け付けない", () => {
    expect(parseReturnDate("2026-02-31")).toBeNull();
    expect(parseReturnDate("2026-13-01")).toBeNull();
    expect(parseReturnDate("2026-04-31")).toBeNull();
    expect(parseReturnDate("2025-02-29")).toBeNull();
  });

  it("parseReturnDate はうるう年の2月29日を受け付ける", () => {
    expect(parseReturnDate("2024-02-29")).toBe("2024-02-29");
  });

  it("書き出しの復職日が実在しない日なら取り込みを拒否する", () => {
    const result = parseExportPayload({
      version: EXPORT_VERSION,
      exportedAt: "2026-01-05T00:00:00.000Z",
      returnDate: "2026-02-31",
      records: [],
      selfCareItems: [],
    });

    expect(result.ok).toBe(false);
  });
});

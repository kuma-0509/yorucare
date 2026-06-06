import { describe, expect, it } from "vitest";
import {
  EXPORT_VERSION,
  parseExportPayload,
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

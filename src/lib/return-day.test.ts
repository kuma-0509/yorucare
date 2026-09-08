import { describe, expect, it } from "vitest";
import {
  daysSinceReturn,
  formatReturnAfterWorkLabel,
  returnAfterWorkLabel,
} from "./return-day";

describe("daysSinceReturn", () => {
  it("復職当日を1日目として数える", () => {
    expect(daysSinceReturn("2026-09-01", "2026-09-01")).toBe(1);
    expect(daysSinceReturn("2026-09-01", "2026-09-08")).toBe(8);
  });

  it("月をまたいでも暦日で数える", () => {
    expect(daysSinceReturn("2026-08-31", "2026-09-02")).toBe(3);
  });

  it("閏日を飛ばさない", () => {
    expect(daysSinceReturn("2028-02-28", "2028-03-01")).toBe(3);
  });

  it("復職日が未設定、対象日が復職日前、日付が不正なら出さない", () => {
    expect(daysSinceReturn(null, "2026-09-08")).toBeNull();
    expect(daysSinceReturn("2026-09-09", "2026-09-08")).toBeNull();
    expect(daysSinceReturn("不正な日付", "2026-09-08")).toBeNull();
  });
});

describe("returnAfterWorkLabel", () => {
  it("序数を「復職後○日目」にする", () => {
    expect(formatReturnAfterWorkLabel(1)).toBe("復職後1日目");
    expect(returnAfterWorkLabel("2026-09-01", "2026-09-08")).toBe(
      "復職後8日目"
    );
  });

  it("数えられない日はラベル自体を出さない", () => {
    expect(returnAfterWorkLabel(null, "2026-09-08")).toBeNull();
    expect(returnAfterWorkLabel("2026-09-09", "2026-09-08")).toBeNull();
  });
});

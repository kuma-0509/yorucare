import { describe, expect, it } from "vitest";
import {
  findTokyoSupportFacilities,
  getTelephoneNumber,
  TOKYO_MUNICIPALITIES,
  TOKYO_OPEN_DATASETS,
  TOKYO_SUPPORT_FACILITIES,
  TOKYO_WELFARE_SURVEY_CONTEXT,
  toTelephoneHref,
} from "./tokyo-open-data";

describe("東京都オープンデータ", () => {
  it("4つの公式データセットをHTTPSで参照する", () => {
    expect(Object.keys(TOKYO_OPEN_DATASETS)).toHaveLength(4);

    for (const dataset of Object.values(TOKYO_OPEN_DATASETS)) {
      const url = new URL(dataset.href);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("catalog.data.metro.tokyo.lg.jp");
    }
  });

  it("3つの施設一覧を統合し、地域で完全一致検索する", () => {
    expect(TOKYO_SUPPORT_FACILITIES).toHaveLength(163);
    expect(TOKYO_MUNICIPALITIES).toHaveLength(58);

    const facilities = findTokyoSupportFacilities("新宿区");
    expect(facilities.length).toBeGreaterThan(1);
    expect(facilities.every((facility) => facility.municipality === "新宿区")).toBe(
      true
    );
    expect(facilities.some((facility) => facility.name === "新宿区保健所")).toBe(
      true
    );
    expect(findTokyoSupportFacilities("")).toEqual([]);
    expect(findTokyoSupportFacilities("東京都外")).toEqual([]);
  });

  it("画面に出す電話リンクから記号を除く", () => {
    expect(toTelephoneHref("03-5211-8161")).toBe("tel:0352118161");
    expect(
      getTelephoneNumber("04992-2-1482（福祉けんこう課けんこう係）")
    ).toBe("04992-2-1482");
    expect(
      toTelephoneHref("04992-2-1482（福祉けんこう課けんこう係）")
    ).toBe("tel:0499221482");
    expect(
      TOKYO_SUPPORT_FACILITIES.every((facility) =>
        /^tel:\d+$/.test(toTelephoneHref(facility.phone))
      )
    ).toBe(true);
  });

  it("福祉保健基礎調査の母数と割合を明記する", () => {
    expect(TOKYO_WELFARE_SURVEY_CONTEXT.respondents).toBe(2658);
    expect(TOKYO_WELFARE_SURVEY_CONTEXT.frequentOrOccasionalStressPercent).toBe(
      70.7
    );
    expect(TOKYO_WELFARE_SURVEY_CONTEXT.description).toContain("70.7%");
  });
});

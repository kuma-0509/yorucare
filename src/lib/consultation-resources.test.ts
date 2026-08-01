import { describe, expect, it } from "vitest";
import {
  EMERGENCY_RESOURCES,
  IMMEDIATE_SUPPORT_RESOURCE,
  OFFICIAL_SUPPORT_LINKS,
} from "./consultation-resources";

describe("consultation resources", () => {
  it("電話リンクは数字だけのtel URLにする", () => {
    const resources = [
      ...Object.values(EMERGENCY_RESOURCES),
      IMMEDIATE_SUPPORT_RESOURCE,
    ];

    for (const resource of resources) {
      expect(resource.href).toMatch(/^tel:\d+$/);
    }
  });

  it("外部リンクは厚生労働省のHTTPSページに限定する", () => {
    for (const resource of Object.values(OFFICIAL_SUPPORT_LINKS)) {
      const url = new URL(resource.href);
      expect(url.protocol).toBe("https:");
      expect(
        url.hostname === "mhlw.go.jp" || url.hostname.endsWith(".mhlw.go.jp")
      ).toBe(true);
    }
  });

  it("緊急通報の番号を取り違えない", () => {
    expect(EMERGENCY_RESOURCES.ambulance.phoneNumber).toBe("119");
    expect(EMERGENCY_RESOURCES.police.phoneNumber).toBe("110");
  });
});

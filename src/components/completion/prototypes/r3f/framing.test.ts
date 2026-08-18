import { describe, expect, it } from "vitest";
import {
  MAX_SPINE_DISTANCE,
  PAGE_TEXT_BASE_FACTOR,
  WRITING_TEXT_DISTANCE,
  pageTextDistanceFactor,
  pageTextWorldWidth,
  spineCameraDistance,
  visibleWidthAt,
} from "./framing";

/** iPhone 13 相当（390×844）と、横長のPC表示 */
const PHONE_ASPECT = 390 / 844;
const DESKTOP_ASPECT = 1440 / 900;

describe("書いた行の大きさ", () => {
  it("縦長の画面でも、行が横に見えている幅の中へ収まる", () => {
    const width = pageTextWorldWidth(pageTextDistanceFactor(PHONE_ASPECT));

    expect(width).toBeLessThan(visibleWidthAt(PHONE_ASPECT, WRITING_TEXT_DISTANCE));
    expect(pageTextDistanceFactor(PHONE_ASPECT)).toBeLessThan(1);
  });

  it("そのままの大きさだと、縦長の画面では行がはみ出す", () => {
    // 直す前の値。これがはみ出していたので行の頭が切れていた
    expect(pageTextWorldWidth(PAGE_TEXT_BASE_FACTOR)).toBeGreaterThan(
      visibleWidthAt(PHONE_ASPECT, WRITING_TEXT_DISTANCE)
    );
  });

  it("横長の画面では大きさを変えない", () => {
    expect(pageTextDistanceFactor(DESKTOP_ASPECT)).toBe(PAGE_TEXT_BASE_FACTOR);
  });

  it("画面が縦長になるほど小さくする", () => {
    expect(pageTextDistanceFactor(0.4)).toBeLessThan(
      pageTextDistanceFactor(0.6)
    );
  });
});

describe("背表紙を見せる段のカメラ距離", () => {
  it("縦長の画面では、背表紙が入るところまで下がる", () => {
    const distance = spineCameraDistance(PHONE_ASPECT, 2.43);

    expect(distance).toBeGreaterThan(2.43);
    expect(visibleWidthAt(PHONE_ASPECT, distance)).toBeGreaterThan(1.4);
  });

  it("横長の画面では元の寄りを変えない", () => {
    expect(spineCameraDistance(DESKTOP_ASPECT, 2.43)).toBe(2.43);
  });

  it("霧に沈む距離までは下がらない", () => {
    expect(spineCameraDistance(0.2, 2.43)).toBeLessThanOrEqual(
      MAX_SPINE_DISTANCE
    );
  });
});

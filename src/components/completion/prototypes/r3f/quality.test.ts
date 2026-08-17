import { describe, expect, it } from "vitest";
import { detectQualityTier, qualityFor } from "./quality";

describe("3D演出の描画コストの段階", () => {
  it("指で触る端末は、性能値が高く見えても low にする", () => {
    expect(
      detectQualityTier({ coarsePointer: true, cores: 8, memoryGb: 8 })
    ).toBe("low");
  });

  it("マウス操作でコア数もメモリも十分なら high にする", () => {
    expect(
      detectQualityTier({ coarsePointer: false, cores: 8, memoryGb: 8 })
    ).toBe("high");
  });

  it("マウス操作でもコア数が少なければ low に落とす", () => {
    expect(
      detectQualityTier({ coarsePointer: false, cores: 4, memoryGb: 8 })
    ).toBe("low");
  });

  it("マウス操作でもメモリが少なければ low に落とす", () => {
    expect(
      detectQualityTier({ coarsePointer: false, cores: 8, memoryGb: 4 })
    ).toBe("low");
  });

  it("判定材料が何も取れないときは low に倒す", () => {
    expect(detectQualityTier({ coarsePointer: false })).toBe("low");
  });

  it("low は解像度・影・粒を下げる", () => {
    const high = qualityFor("high", 3);
    const low = qualityFor("low", 3);

    expect(low.dpr[1]).toBeLessThan(high.dpr[1]);
    expect(low.shadowMapSize).toBeLessThan(high.shadowMapSize);
    expect(low.contactShadowResolution).toBeLessThan(
      high.contactShadowResolution
    );
    expect(low.softShadows).toBe(false);
    expect(low.particleScale).toBeLessThan(high.particleScale);
  });

  it("端末の画素密度が低ければ、その値までしか上げない", () => {
    expect(qualityFor("high", 1).dpr).toEqual([1, 1]);
    expect(qualityFor("low", 1).dpr).toEqual([1, 1]);
  });

  it("画素密度が取れなくても 1 未満にはしない", () => {
    expect(qualityFor("high", 0).dpr).toEqual([1, 1]);
  });

  it("low でも発光板は残す（削っても発熱は下がらず、演出だけ失われる）", () => {
    expect(qualityFor("low", 2).glow).toBe(true);
  });
});

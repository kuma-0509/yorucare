import { describe, expect, it } from "vitest";
import {
  SOUND_CUES,
  TIMELINE,
  isShelvedPhase,
  phaseProgressAt,
  phaseTimeMs,
  shelfGlowAt,
  shelfTAt,
  spineGlowAt,
  type CinematicPhase,
} from "./use-cinematic-timeline";

const PHASES: CinematicPhase[] = [
  "writing",
  "pageFlip",
  "closing",
  "spine",
  "shelving",
  "afterglow",
  "done",
];

describe("段の中の進み具合", () => {
  it("段の始まりで0、終わりで1になる", () => {
    expect(phaseProgressAt("writing", 0)).toBe(0);
    expect(phaseProgressAt("writing", TIMELINE.pageFlip)).toBe(1);
    expect(phaseProgressAt("shelving", TIMELINE.shelving)).toBe(0);
    expect(phaseProgressAt("shelving", TIMELINE.afterglow)).toBe(1);
  });

  it("段のまん中で0.5になる", () => {
    const middle = (TIMELINE.shelving + TIMELINE.afterglow) / 2;

    expect(phaseProgressAt("shelving", middle)).toBeCloseTo(0.5, 6);
  });

  it("段の外の経過時間でも0–1に収まる", () => {
    for (const phase of PHASES) {
      for (const elapsed of [-5000, 0, 3000, TIMELINE.done + 5000]) {
        const value = phaseProgressAt(phase, elapsed);

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("最後の段は常に1", () => {
    expect(phaseProgressAt("done", 0)).toBe(1);
    expect(phaseProgressAt("done", TIMELINE.done)).toBe(1);
  });

  it("経過時間と進み具合は行き来できる", () => {
    for (const phase of PHASES) {
      for (const at of [0, 0.25, 0.9, 1]) {
        expect(phaseProgressAt(phase, phaseTimeMs(phase, at))).toBeCloseTo(
          phase === "done" ? 1 : at,
          6
        );
      }
    }
  });
});

describe("段から決まる値", () => {
  it("棚へ移る進み具合は、収納の段だけ途中の値を取る", () => {
    expect(shelfTAt("writing", 0.5)).toBe(0);
    expect(shelfTAt("spine", 1)).toBe(0);
    expect(shelfTAt("shelving", 0.4)).toBe(0.4);
    expect(shelfTAt("afterglow", 0)).toBe(1);
    expect(shelfTAt("done", 0)).toBe(1);
  });

  it("棚の灯りは、収納の終わり際から点いて余韻で弱まる", () => {
    expect(shelfGlowAt("shelving", 0.8)).toBe(0);
    expect(shelfGlowAt("shelving", 1)).toBeCloseTo(1, 6);
    expect(shelfGlowAt("afterglow", 0)).toBe(1);
    expect(shelfGlowAt("afterglow", 1)).toBeCloseTo(0.6, 6);
    expect(shelfGlowAt("done", 0)).toBe(0.55);
  });

  it("背表紙のにじみは、余韻の間ずっと粒が出る強さを保つ", () => {
    // 粒を出すかどうかの境目は 0.15。余韻の段はここを下回らない
    expect(spineGlowAt("afterglow", 0)).toBe(1);
    expect(spineGlowAt("afterglow", 0.999)).toBeGreaterThan(0.15);
    expect(spineGlowAt("done", 0)).toBeGreaterThan(0.15);
    expect(spineGlowAt("spine", 1)).toBe(0);
  });

  it("棚へ向かい始めてからの段を見分ける", () => {
    expect(PHASES.filter(isShelvedPhase)).toEqual([
      "shelving",
      "afterglow",
      "done",
    ]);
  });
});

describe("効果音の合図", () => {
  it("鳴らす時刻はタイムラインの中に順番どおり並ぶ", () => {
    const times = SOUND_CUES.map((cue) => phaseTimeMs(cue.phase, cue.at));

    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(Math.min(...times)).toBeGreaterThan(0);
    expect(Math.max(...times)).toBeLessThan(TIMELINE.done);
  });

  it("合図の名前が重複しない", () => {
    const keys = SOUND_CUES.map((cue) => cue.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("それぞれの合図が、置かれた段の中に収まる", () => {
    for (const cue of SOUND_CUES) {
      const elapsed = phaseTimeMs(cue.phase, cue.at);

      expect(phaseProgressAt(cue.phase, elapsed)).toBeCloseTo(cue.at, 6);
    }
  });
});

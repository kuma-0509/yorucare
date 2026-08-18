import { describe, expect, it } from "vitest";
import { BOOK } from "./materials";
import {
  SHELF_LAYOUT,
  SHELF_POSE,
  SPINE_POSE,
  SPINE_BULGE,
  computeShelfScale,
  shelvedBookFit,
  shelvedDepthOffset,
  shelvedSpineDirection,
} from "./shelf-layout";

/**
 * 棚に収める本の向きとスケールは、回転で入れ替わる軸の対応を間違えやすい。
 * 見た目でしか分からない状態にすると、背表紙が紙のように薄いまま
 * 棚から飛び出していても気づけないので、寸法と向きをここで固定する。
 */
describe("棚に収まった本の収まり", () => {
  it("背表紙の張り出しは、実際の箱のローカルX幅を使う", () => {
    // antique-book.tsx の箱は boxGeometry args={[BOOK.t, ...]}。
    // ローカルZ幅の 0.92 を取り違えると、テスト内の境界だけが実装より小さくなる。
    expect(SPINE_BULGE).toBe(BOOK.t);
  });

  it("背表紙の幅・高さ・奥行きが空きスロットの寸法になる", () => {
    const fit = shelvedBookFit();

    expect(fit.x).toBeCloseTo(SHELF_LAYOUT.slotSpineWidth, 3);
    expect(fit.y).toBeCloseTo(SHELF_LAYOUT.slotHeight, 3);
    expect(fit.z).toBeCloseTo(SHELF_LAYOUT.slotDepth, 3);
  });

  it("本の幅は棚の奥行きへ、厚みは背表紙の幅へ回る", () => {
    const scale = computeShelfScale();

    // 幅（BOOK.w）を背表紙の幅で割ると、奥行きが3倍以上ずれる
    expect(BOOK.w * scale.x).toBeLessThan(SHELF_LAYOUT.slotDepth);
    expect(BOOK.t * scale.z).toBeCloseTo(SHELF_LAYOUT.slotSpineWidth, 3);
  });

  it("背表紙は棚の手前（カメラ側）を向く", () => {
    expect(shelvedSpineDirection().z).toBeGreaterThan(0.99);
  });

  it("背表紙のふくらみのぶんだけ、本の中心を奥へ寄せる", () => {
    expect(shelvedDepthOffset()).toBeLessThan(0);
    expect(Math.abs(shelvedDepthOffset())).toBeLessThan(
      SHELF_LAYOUT.slotDepth / 2
    );
  });

  it("背表紙を見せる角度から棚姿勢へは、戻す向きに回る", () => {
    // 行き過ぎてから戻す。棚姿勢を通り越したまま終わらない
    expect(SPINE_POSE.rotationY).toBeGreaterThan(SHELF_POSE.rotationY);
    expect(SPINE_POSE.rotationY).toBeLessThan(Math.PI);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AvoidListCard } from "./avoid-list-card";
import type { SelfCareItem, SelfCareItemKind, StateLevel } from "@/lib/types";

function item(
  id: string,
  title: string,
  kind: SelfCareItemKind,
  stateLevels: StateLevel[]
): SelfCareItem {
  return {
    id,
    title,
    kind,
    stateLevels,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

afterEach(cleanup);

const ITEMS: SelfCareItem[] = [
  item("1", "大きな買いものを決める", "avoid", ["good"]),
  item("2", "夜更かしする", "avoid", ["hard"]),
  item("3", "早めに布団に入る", "care", []),
];

describe("AvoidListCard", () => {
  it("状態を選んでいない日は出さない", () => {
    const { container } = render(
      <AvoidListCard items={ITEMS} stateLevel={null} />
    );
    expect(container.textContent).toBe("");
  });

  it("合致する項目がない状態では出さない", () => {
    const { container } = render(
      <AvoidListCard items={ITEMS} stateLevel="normal" />
    );
    expect(container.textContent).toBe("");
  });

  it("その日の状態に指定された項目だけを並べる", () => {
    render(<AvoidListCard items={ITEMS} stateLevel="good" />);

    expect(screen.getByText("大きな買いものを決める")).toBeDefined();
    expect(screen.queryByText("夜更かしする")).toBeNull();
  });

  it("できることを混ぜない", () => {
    render(
      <AvoidListCard
        items={[...ITEMS, item("4", "散歩する", "care", ["good"])]}
        stateLevel="good"
      />
    );

    expect(screen.queryByText("早めに布団に入る")).toBeNull();
    expect(screen.queryByText("散歩する")).toBeNull();
  });

  it("守れたかどうかを選ぶ操作を置かない", () => {
    render(<AvoidListCard items={ITEMS} stateLevel="good" />);

    // 実施の可否を記録させないため、押せる要素を持たない
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("診断・治療・禁止に読める表現や、評価する表現を含めない", () => {
    const { container } = render(
      <AvoidListCard items={ITEMS} stateLevel="good" />
    );

    const text = container.textContent ?? "";
    for (const word of [
      "症状",
      "診断",
      "治療",
      "悪化",
      "危険",
      "禁止",
      "ダメ",
      "してください",
      "べき",
      "失敗",
      "守れ",
    ]) {
      expect(text).not.toContain(word);
    }
  });

  it("自分で決めた覚え書きであることを添える", () => {
    render(<AvoidListCard items={ITEMS} stateLevel="hard" />);

    expect(screen.getByText(/自分で決めた覚え書きです/)).toBeDefined();
  });
});

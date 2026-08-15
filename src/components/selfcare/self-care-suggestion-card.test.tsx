// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SelfCareSuggestionCard } from "./self-care-suggestion-card";
import { buildSelfCareSuggestions } from "@/lib/self-care";

afterEach(cleanup);

function renderCard(
  overrides: Partial<React.ComponentProps<typeof SelfCareSuggestionCard>> = {}
) {
  const onToggle = vi.fn();
  const result = render(
    <SelfCareSuggestionCard
      stateLevel="hard"
      warningTags={[]}
      selectedTitles={[]}
      onToggle={onToggle}
      {...overrides}
    />
  );
  return { onToggle, ...result };
}

describe("SelfCareSuggestionCard", () => {
  it("状態を選んでいない日は何も表示しない", () => {
    const { container } = renderCard({ stateLevel: null });
    expect(container.textContent).toBe("");
  });

  it("状態を選んだ日は案をボタンとして並べる", () => {
    renderCard();
    for (const title of buildSelfCareSuggestions("hard", [])) {
      expect(screen.getByRole("button", { name: title })).toBeDefined();
    }
  });

  it("案を押すとその文言を通知する", () => {
    const { onToggle } = renderCard();
    const [first] = buildSelfCareSuggestions("hard", []);
    fireEvent.click(screen.getByRole("button", { name: first }));
    expect(onToggle).toHaveBeenCalledWith(first);
  });

  it("すでに選んでいる案は選択済みとして表示する", () => {
    const [first] = buildSelfCareSuggestions("hard", []);
    renderCard({ selectedTitles: [first] });
    expect(
      screen.getByRole("button", { name: first }).getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("しんどさのサインを選ぶと案が入れ替わる", () => {
    renderCard({ warningTags: ["眠れない"] });
    expect(
      screen.getByRole("button", { name: "布団に入る時間を15分早める" })
    ).toBeDefined();
  });

  it("診断・治療ではないことを画面に書く", () => {
    const { container } = renderCard();
    const text = container.textContent ?? "";
    expect(text).toContain("体調を判断したり、治し方を示すものではありません");
    expect(text).toContain("合わないものは選ばなくて構いません");
  });

  it("実行を促す表現や評価する表現を含めない", () => {
    const { container } = renderCard({ warningTags: ["強い不安", "出勤がつらい"] });
    const text = container.textContent ?? "";
    for (const word of [
      "しましょう",
      "してください",
      "おすすめ",
      "効果",
      "改善",
      "頑張",
      "失敗",
      "サボ",
      "べき",
    ]) {
      expect(text).not.toContain(word);
    }
  });
});

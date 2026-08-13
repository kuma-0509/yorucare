// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GoalReviewCard } from "./goal-review-card";
import type { GoalReviewStatus } from "@/lib/types";

afterEach(cleanup);

function renderCard(
  overrides: Partial<React.ComponentProps<typeof GoalReviewCard>> = {}
) {
  const onStatusChange = vi.fn();
  const onSelectSuggestion = vi.fn();
  render(
    <GoalReviewCard
      goal="散歩する"
      status={null}
      isToday
      currentGoalDraft=""
      onStatusChange={onStatusChange}
      onSelectSuggestion={onSelectSuggestion}
      {...overrides}
    />
  );
  return { onStatusChange, onSelectSuggestion };
}

describe("GoalReviewCard", () => {
  it("前日に決めた目標と3つの選択肢を表示する", () => {
    renderCard();
    expect(screen.getByText("散歩する")).toBeDefined();
    expect(screen.getByRole("radio", { name: "できた" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "一部できた" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "できなかった" })).toBeDefined();
  });

  it("対象日が今日でなければ「昨日」と書かない", () => {
    renderCard({ isToday: false });
    expect(screen.getByText("前日の目標をふりかえる")).toBeDefined();
    expect(screen.queryByText("昨日の目標をふりかえる")).toBeNull();
  });

  it("選択前は補助質問も提案も出さない", () => {
    renderCard();
    expect(screen.queryByText("次は、もう少し小さくできそうですか？")).toBeNull();
    expect(screen.queryByText("散歩を5分だけやる")).toBeNull();
  });

  it("できた日には小さくする提案を出さない", () => {
    renderCard({ status: "done" });
    expect(screen.queryByText("次は、もう少し小さくできそうですか？")).toBeNull();
    expect(screen.queryByText("散歩を5分だけやる")).toBeNull();
  });

  it.each<GoalReviewStatus>(["partial", "notDone"])(
    "%s のときは補助質問と小さくした提案を出す",
    (status) => {
      renderCard({ status });
      expect(screen.getByText("次は、もう少し小さくできそうですか？")).toBeDefined();
      expect(screen.getByText("散歩を5分だけやる")).toBeDefined();
      expect(screen.getByText("散歩の準備だけする")).toBeDefined();
    }
  );

  it("選択済みの状態をもう一度押すと選択を外せる", () => {
    const { onStatusChange } = renderCard({ status: "done" });
    fireEvent.click(screen.getByRole("radio", { name: "できた" }));
    expect(onStatusChange).toHaveBeenCalledWith(null);
  });

  it("未選択の状態を押すとその結果を通知する", () => {
    const { onStatusChange } = renderCard();
    fireEvent.click(screen.getByRole("radio", { name: "できなかった" }));
    expect(onStatusChange).toHaveBeenCalledWith("notDone");
  });

  it("提案を押すとその文言を通知する", () => {
    const { onSelectSuggestion } = renderCard({ status: "notDone" });
    fireEvent.click(screen.getByText("散歩を5分だけやる"));
    expect(onSelectSuggestion).toHaveBeenCalledWith("散歩を5分だけやる");
  });

  it("未達を責める表現や助言の断定を含めない", () => {
    const { container } = render(
      <GoalReviewCard
        goal="散歩する"
        status="notDone"
        isToday
        currentGoalDraft=""
        onStatusChange={vi.fn()}
        onSelectSuggestion={vi.fn()}
      />
    );
    const text = container.textContent ?? "";
    for (const word of [
      "失敗",
      "守れ",
      "サボ",
      "なぜ",
      "どうして",
      "すべきです",
      "頑張りましょう",
    ]) {
      expect(text).not.toContain(word);
    }
  });
});

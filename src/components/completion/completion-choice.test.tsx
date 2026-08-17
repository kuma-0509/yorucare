// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CompletionChoice } from "./completion-choice";
import { COPY } from "@/lib/copy";

/** 評価語・助言・診断に読める表現。画面に出てはいけない */
const FORBIDDEN_WORDS = [
  "すごい",
  "えらい",
  "順調",
  "改善",
  "悪化",
  "達成率",
  "サボ",
  "失敗",
  "できていません",
  "しましょう",
  "がんばり",
  "症状",
  "診断",
  "治療",
  "受診",
  "医師",
  "危険",
  "必ず",
  "べき",
];

/** 動きを控える設定の有無を固定する */
function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const LINES = ["気分：ふつう", "睡眠：6時間30分"];

function renderChoice() {
  return render(
    <CompletionChoice
      date="2026-08-17"
      lines={LINES}
      footer={<button type="button">これまでの記録を見る</button>}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  setReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("記録完了の締めくくり", () => {
  it("選択肢の画面に、評価語・助言・診断に読める表現を出さない", () => {
    const { container } = renderChoice();

    const text = container.textContent ?? "";
    expect(text).toContain(COPY.completion.prompt);
    for (const word of FORBIDDEN_WORDS) {
      expect(text).not.toContain(word);
    }
  });

  it("「書庫にしまう」を選ぶと全画面の演出に入り、選択を記録する", () => {
    renderChoice();

    fireEvent.click(screen.getByText(COPY.completion.shelf));

    // 演出は記録フォームに重ねて出す
    expect(screen.getByRole("dialog")).toBeTruthy();
    // 演出の途中でも、押せば終われる
    expect(screen.getByText(COPY.completion.skipAction)).toBeTruthy();
    expect(localStorage.getItem("yorucare_completion_log")).toContain("shelf");
  });

  it("演出の途中で終えても、完了の案内へ進める", async () => {
    renderChoice();

    fireEvent.click(screen.getByText(COPY.completion.shelf));
    fireEvent.click(screen.getByText(COPY.completion.skipAction));

    await waitFor(() => {
      expect(screen.getByText(COPY.completion.shelfDone)).toBeTruthy();
    });
    expect(screen.queryByRole("dialog")).toBe(null);
    expect(screen.getByText(COPY.completion.doneGuide)).toBeTruthy();
    expect(screen.getByText("これまでの記録を見る")).toBeTruthy();
  });

  it("動きを控える設定のときは全画面の演出を出さず、完了の一文を出す", () => {
    setReducedMotion(true);
    renderChoice();

    fireEvent.click(screen.getByText(COPY.completion.shelf));

    expect(screen.queryByRole("dialog")).toBe(null);
    expect(screen.getByText(COPY.completion.shelfDone)).toBeTruthy();
    expect(screen.getByText(COPY.completion.shelfDoneSub)).toBeTruthy();
    // 演出を出さなくても、選んだことは同じように記録する
    expect(localStorage.getItem("yorucare_completion_log")).toContain("shelf");
  });

  it("「今日はそのまま」でも完了の案内を出す", () => {
    renderChoice();

    fireEvent.click(screen.getByText(COPY.completion.skip));

    expect(screen.getByText(COPY.completion.skipDone)).toBeTruthy();
    expect(screen.getByText(COPY.completion.doneGuide)).toBeTruthy();
    // 演出を選ばなかった日は、演出の記録も残さない
    expect(localStorage.getItem("yorucare_completion_log")).toBe(null);
  });

  it("完了後の案内に、評価語・助言・診断に読める表現を出さない", () => {
    setReducedMotion(true);
    const { container } = renderChoice();

    fireEvent.click(screen.getByText(COPY.completion.shelf));

    const text = container.textContent ?? "";
    expect(text).toContain(COPY.completion.doneGuide);
    for (const word of FORBIDDEN_WORDS) {
      expect(text).not.toContain(word);
    }
  });
});

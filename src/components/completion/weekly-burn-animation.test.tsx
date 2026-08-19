// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COPY } from "@/lib/copy";
import { WeeklyBurnAnimation } from "./weekly-burn-animation";

const PAPER_DATES = Array.from(
  { length: 7 },
  (_, index) => `2026-08-${String(index + 1).padStart(2, "0")}`
);

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("まとめて手放す演出", () => {
  it("途中でスキップしたら予約済みの完了処理をもう一度実行しない", async () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<WeeklyBurnAnimation paperDates={PAPER_DATES} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: COPY.completion.burnReadyAction }));
    fireEvent.click(screen.getByRole("button", { name: COPY.completion.skipDuringEffect }));

    expect(onDone).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("演出中のスキップ操作を支援技術から隠さない", () => {
    render(<WeeklyBurnAnimation paperDates={PAPER_DATES} onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: COPY.completion.burnReadyAction }));

    const skip = screen.getByRole("button", { name: COPY.completion.skipDuringEffect });
    expect(skip.closest("[aria-hidden='true']")).toBeNull();
  });
});

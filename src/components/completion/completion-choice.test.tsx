// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CompletionChoice } from "./completion-choice";
import { COPY } from "@/lib/copy";

// 3D Canvas 自体はこのコンポーネントの契約テストに不要。WebGL の可否だけを
// canvas.getContext の戻り値で切り替え、重い描画は読み込まない。
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="archive-canvas" />,
}));

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
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
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

  it("演出中は「このまま終える」に焦点を当て、背面のボタンへ移らせない", async () => {
    render(
      <>
        <button type="button">背面のボタン</button>
        <CompletionChoice
          date="2026-08-17"
          lines={LINES}
          footer={<button type="button">これまでの記録を見る</button>}
        />
      </>
    );

    fireEvent.click(screen.getByText(COPY.completion.shelf));

    // 選んだボタンは消えるので、演出の中のボタンへ焦点を移す
    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe(
        COPY.completion.skipAction
      );
    });
    // 背面は読み上げからも外す
    expect(
      screen.getByText("背面のボタン").closest("[aria-hidden='true']")
    ).not.toBe(null);
  });

  it("演出が終わったら「このまま終える」を消し、完了の一文に重ねない", async () => {
    vi.useFakeTimers();
    try {
      render(
        <CompletionChoice
          date="2026-08-17"
          lines={LINES}
          footer={<button type="button">これまでの記録を見る</button>}
        />
      );
      fireEvent.click(screen.getByText(COPY.completion.shelf));

      // 演出（CSS版）が終わるまで進める
      await vi.advanceTimersByTimeAsync(8000);
      expect(screen.queryByText(COPY.completion.skipAction)).toBe(null);
      // 余韻の間はまだ演出の画面のまま
      expect(screen.getByRole("dialog")).toBeTruthy();

      // 余韻ぶん進めたあと、状態の反映を1手進める
      await vi.advanceTimersByTimeAsync(2500);
      await vi.advanceTimersByTimeAsync(1);
      expect(screen.queryByRole("dialog")).toBe(null);
      expect(screen.getByText(COPY.completion.doneGuide)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("平面版では、押しても鳴らない音の切り替えを出さない", () => {
    renderChoice();

    fireEvent.click(screen.getByText(COPY.completion.shelf));

    expect(screen.queryByText(COPY.completion.soundEnable)).toBe(null);
    expect(screen.queryByText(COPY.completion.soundDisable)).toBe(null);
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

  it("3D版の音は既定で鳴らさず、演出中に出すか選べる", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as WebGLRenderingContext
    );
    renderChoice();

    fireEvent.click(screen.getByText(COPY.completion.shelf));

    // 何もしていない端末では「音を出す」側から始める
    const toggle = await screen.findByRole("button", {
      name: COPY.completion.soundEnable,
    });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(localStorage.getItem("yorucare_completion_sound")).toBe(null);
  });

  it("音を出すにすると端末内に残り、次に選んだときは最初から音ありで始まる", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as WebGLRenderingContext
    );
    const first = renderChoice();

    fireEvent.click(screen.getByText(COPY.completion.shelf));
    fireEvent.click(
      await screen.findByRole("button", { name: COPY.completion.soundEnable })
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: COPY.completion.soundDisable })
          .getAttribute("aria-pressed")
      ).toBe("true");
    });
    expect(localStorage.getItem("yorucare_completion_sound")).toBe("on");

    // 別の日の記録として開き直しても、選び直しを求めない
    first.unmount();
    renderChoice();
    fireEvent.click(screen.getByText(COPY.completion.shelf));

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: COPY.completion.soundDisable })
          .getAttribute("aria-pressed")
      ).toBe("true");
    });
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

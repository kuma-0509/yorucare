// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppMenu } from "./app-menu";
import { COPY } from "@/lib/copy";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

function openMenu() {
  render(<AppMenu />);
  fireEvent.click(screen.getByRole("button", { name: COPY.menu.open }));
}

describe("ヘッダーのメニュー", () => {
  it("閉じているあいだは下位の項目を出さない", () => {
    render(<AppMenu />);

    expect(screen.getByRole("button", { name: COPY.menu.open })).toBeTruthy();
    expect(screen.queryByText(COPY.menu.consultation)).toBeNull();
    expect(screen.queryByText(COPY.menu.customInput)).toBeNull();
  });

  it("開くと「相談先」と「カスタム入力」を出す", async () => {
    openMenu();

    expect(await screen.findByText(COPY.menu.consultation)).toBeTruthy();
    expect(screen.getByText(COPY.menu.customInput)).toBeTruthy();
  });

  it("「相談先」を選ぶと、これまでどおりの相談先を開く", async () => {
    openMenu();

    fireEvent.click(await screen.findByText(COPY.menu.consultation));

    expect(await screen.findByText("困ったときの相談先")).toBeTruthy();
    expect(screen.getByText("いま、命や身体に差し迫った危険がある")).toBeTruthy();
    // メニュー自体は閉じ、相談先だけが残る
    await waitFor(() => {
      expect(screen.queryByText(COPY.menu.customInput)).toBeNull();
    });
  });

  it("「カスタム入力」を選ぶと、記録画面に出す項目の設定を開く", async () => {
    openMenu();

    fireEvent.click(await screen.findByText(COPY.menu.customInput));

    expect(await screen.findByText(COPY.customInput.description)).toBeTruthy();
    expect(
      screen.getAllByRole("group", { name: COPY.customInput.legend }).length
    ).toBeGreaterThan(0);
  });
});

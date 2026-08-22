// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConsultationLinksDialog } from "./consultation-links-dialog";
import { TOKYO_OPEN_DATASETS } from "@/lib/tokyo-open-data";

afterEach(() => {
  cleanup();
});

describe("相談先", () => {
  it(
    "区市町村を選ぶと地域の窓口を住所と電話番号つきで表示する",
    () => {
      render(<ConsultationLinksDialog open onOpenChange={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("区市町村"), {
        target: { value: "新宿区" },
      });

      expect(screen.getByText(/新宿区の窓口（\d+件）/)).toBeTruthy();
      expect(screen.getByText("新宿区保健所")).toBeTruthy();
      expect(screen.getByText(/〒160-0022 新宿区新宿５－１８－２１/)).toBeTruthy();
      const phoneLink = screen.getByRole("link", {
        name: "新宿区保健所 03-3209-1111に電話",
      });
      expect(phoneLink.getAttribute("href")).toBe("tel:0332091111");
    },
    15_000
  );

  it("地域を保存・送信せず、現在地も取得しないと説明する", () => {
    render(<ConsultationLinksDialog open onOpenChange={vi.fn()} />);

    expect(
      screen.getByText("選んだ地域は保存・送信しません。現在地も取得しません。")
    ).toBeTruthy();
  });

  it("4つの東京都オープンデータと調査の母数・割合を表示する", () => {
    render(<ConsultationLinksDialog open onOpenChange={vi.fn()} />);

    expect(
      screen.getByText("利用している東京都オープンデータ（4件）")
    ).toBeTruthy();
    for (const dataset of Object.values(TOKYO_OPEN_DATASETS)) {
      const link = screen.getByRole("link", { name: dataset.title });
      expect(link.getAttribute("href")).toBe(dataset.href);
    }
    expect(screen.getByRole("link", { name: "CC BY 4.0" }).getAttribute("href")).toBe(
      "https://creativecommons.org/licenses/by/4.0/deed.ja"
    );
    expect(screen.getByText(/回答者2,658人/)).toBeTruthy();
    expect(screen.getByText(/70.7%/)).toBeTruthy();
  });
});

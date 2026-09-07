// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COPY } from "@/lib/copy";
import { getAllNotToDoItems, getAllSelfCareItems } from "@/lib/storage";
import { SelfCareTab } from "./selfcare-tab";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("セルフケア画面", () => {
  it("できることとやらないことを同じ画面に表示する", async () => {
    render(<SelfCareTab />);

    expect(await screen.findByText(COPY.selfCareAction)).toBeTruthy();
    expect(screen.getByText(COPY.notToDoAction)).toBeTruthy();
  });

  it.each([
    {
      label: COPY.selfCareAction,
      title: "昼に短く休む",
      editedTitle: "昼に5分休む",
      load: getAllSelfCareItems,
    },
    {
      label: COPY.notToDoAction,
      title: "夜は仕事を開かない",
      editedTitle: "夜はメールを開かない",
      load: getAllNotToDoItems,
    },
  ])("$labelを追加・編集・削除できる", async ({ label, title, editedTitle, load }) => {
    render(<SelfCareTab />);

    fireEvent.change(await screen.findByLabelText(`新しい${label}`), {
      target: { value: title },
    });
    fireEvent.click(screen.getByRole("button", { name: `${label}を追加する` }));

    expect(await screen.findByText(title)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: `${title}を編集` }));
    fireEvent.change(screen.getByLabelText("編集後の名前"), {
      target: { value: editedTitle },
    });
    fireEvent.click(screen.getByRole("button", { name: COPY.save }));

    expect(await screen.findByText(editedTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: `${editedTitle}を削除` }));
    fireEvent.click(screen.getByRole("button", { name: COPY.delete }));

    await waitFor(async () => {
      const result = await load();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some((item) => item.title === editedTitle)).toBe(false);
      }
    });
  });
});

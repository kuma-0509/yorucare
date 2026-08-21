// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { CustomInputSettingsDialog } from "./custom-input-settings-dialog";
import { COPY } from "@/lib/copy";
import {
  getRecordFormSections,
  toggleRecordFormSection,
} from "@/lib/record-form-sections";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

function renderDialog() {
  return render(
    <CustomInputSettingsDialog open onOpenChange={() => {}} />
  );
}

const SECTION_LABELS = [
  COPY.selfCareSuggestion.title,
  COPY.detailSection,
  COPY.warningSign,
  COPY.doneToday,
  "小さな目標",
];

describe("カスタム入力の設定", () => {
  it("切り替えられる5項目を並べ、はじめはすべて選ばれていない", async () => {
    renderDialog();

    // fieldset と、その中の選択肢のまとまりが同じ名前を持つので、外側で絞る
    const [group] = await screen.findAllByRole("group", {
      name: COPY.customInput.legend,
    });
    for (const label of SECTION_LABELS) {
      const option = within(group).getByText(label).closest("button");
      expect(option?.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("選ぶと端末内へ残る", async () => {
    renderDialog();

    fireEvent.click(await screen.findByText(COPY.warningSign));

    expect(getRecordFormSections().warningSign).toBe(true);
    expect(
      screen.getByText(COPY.warningSign).closest("button")?.getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("すでに選んだ項目は、開いたときに選ばれた状態で出る", async () => {
    toggleRecordFormSection("doneToday", true);

    renderDialog();

    const option = (await screen.findByText(COPY.doneToday)).closest("button");
    expect(option?.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(option!);
    expect(getRecordFormSections().doneToday).toBe(false);
  });

  it("記録が消えないことを添える", async () => {
    renderDialog();

    expect(await screen.findByText(COPY.customInput.notice)).toBeTruthy();
  });
});

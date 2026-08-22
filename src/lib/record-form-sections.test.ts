// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RECORD_FORM_SECTIONS,
  RECORD_FORM_SECTION_OPTIONS,
  getRecordFormSections,
  saveRecordFormSections,
  subscribeRecordFormSections,
  toggleRecordFormSection,
} from "./record-form-sections";
import { STORAGE_KEYS } from "./constants";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("記録画面に出す項目の設定", () => {
  it("未設定ならすべて出さない", () => {
    expect(getRecordFormSections()).toEqual({
      selfCareSuggestion: false,
      details: false,
      warningSign: false,
      doneToday: false,
      goal: false,
    });
  });

  it("カスタム入力で切り替えられる項目は5つ", () => {
    expect(RECORD_FORM_SECTION_OPTIONS.map((option) => option.key)).toEqual([
      "selfCareSuggestion",
      "details",
      "warningSign",
      "doneToday",
      "goal",
    ]);
  });

  it("ONにすると端末内へ残り、次に開いたときも残っている", () => {
    toggleRecordFormSection("goal", true);

    expect(localStorage.getItem(STORAGE_KEYS.recordFormSections)).toContain(
      '"goal":true'
    );
    expect(getRecordFormSections().goal).toBe(true);
  });

  it("OFFへ戻せる。ほかの項目は変わらない", () => {
    toggleRecordFormSection("goal", true);
    toggleRecordFormSection("warningSign", true);
    toggleRecordFormSection("goal", false);

    const sections = getRecordFormSections();
    expect(sections.goal).toBe(false);
    expect(sections.warningSign).toBe(true);
  });

  it("壊れた値や知らない項目が入っていても、出さない側に倒す", () => {
    localStorage.setItem(STORAGE_KEYS.recordFormSections, "{壊れた");
    expect(getRecordFormSections()).toEqual(DEFAULT_RECORD_FORM_SECTIONS);

    localStorage.setItem(
      STORAGE_KEYS.recordFormSections,
      JSON.stringify({ goal: "yes", unknownSection: true })
    );
    expect(getRecordFormSections()).toEqual(DEFAULT_RECORD_FORM_SECTIONS);
  });

  it("読み書きできない環境でも例外を投げず、出さない側に倒す", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    // 保存できていないのに画面だけ表示になることがないよう、書いたあとの状態を返す
    expect(toggleRecordFormSection("goal", true)).toEqual(
      DEFAULT_RECORD_FORM_SECTIONS
    );
    expect(getRecordFormSections()).toEqual(DEFAULT_RECORD_FORM_SECTIONS);
  });

  it("ほかの書き込みでは知らせない", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRecordFormSections(listener);

    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEYS.records })
    );
    expect(listener).not.toHaveBeenCalled();

    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEYS.recordFormSections })
    );
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("設定を変えると、開いたままの画面へ知らせる", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRecordFormSections(listener);

    toggleRecordFormSection("details", true);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].details).toBe(true);

    unsubscribe();
    saveRecordFormSections(DEFAULT_RECORD_FORM_SECTIONS);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

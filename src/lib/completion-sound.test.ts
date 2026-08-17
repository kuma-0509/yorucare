// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isCompletionSoundEnabled,
  setCompletionSoundEnabled,
} from "./completion-sound";
import { STORAGE_KEYS } from "./constants";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("記録完了演出の音の設定", () => {
  it("未設定なら鳴らさない", () => {
    expect(isCompletionSoundEnabled()).toBe(false);
  });

  it("ONにすると端末内へ残り、次に開いたときも残っている", () => {
    setCompletionSoundEnabled(true);

    expect(localStorage.getItem(STORAGE_KEYS.completionSound)).toBe("on");
    expect(isCompletionSoundEnabled()).toBe(true);
  });

  it("OFFへ戻せる", () => {
    setCompletionSoundEnabled(true);
    setCompletionSoundEnabled(false);

    expect(isCompletionSoundEnabled()).toBe(false);
  });

  it("知らない値が入っていても鳴らさない側に倒す", () => {
    localStorage.setItem(STORAGE_KEYS.completionSound, "1");

    expect(isCompletionSoundEnabled()).toBe(false);
  });

  it("読み書きできない環境でも例外を投げず、鳴らさない側に倒す", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => setCompletionSoundEnabled(true)).not.toThrow();
    expect(isCompletionSoundEnabled()).toBe(false);
  });
});

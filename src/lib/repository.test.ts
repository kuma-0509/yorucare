import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./constants";
import {
  createEmptyRecordForm,
  repository,
  type Repository,
} from "./repository";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const typedRepository: Repository = repository;

beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", new MemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Repository の非同期境界", () => {
  it("読み取りを Promise<Result<T>> で返す", async () => {
    const pending = typedRepository.getAllRecords();

    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).resolves.toEqual({ ok: true, value: [] });
  });

  it("保存した記録を非同期で読み書きできる", async () => {
    const date = "2026-07-26";
    const { date: _date, ...emptyForm } = createEmptyRecordForm(date);
    expect(_date).toBe(date);

    const saved = await typedRepository.saveRecord(date, {
      ...emptyForm,
      moodScore: 4,
    });

    expect(saved.ok).toBe(true);
    const loaded = await typedRepository.getRecordByDate(date);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value?.moodScore).toBe(4);
      expect(loaded.value?.date).toBe(date);
    }
  });

  it("壊れた保存データを Result のエラーとして返す", async () => {
    localStorage.setItem(STORAGE_KEYS.records, "{invalid");

    const result = await typedRepository.getAllRecords();

    expect(result).toEqual({
      ok: false,
      error: { code: "CORRUPTED", key: STORAGE_KEYS.records },
    });
  });
});

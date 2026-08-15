import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./constants";
import {
  createEmptyRecordForm,
  repository,
  type Repository,
} from "./repository";
import { STORAGE_SCHEMA_VERSION } from "./schemas";

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

/** 目標フィールドを持たない、版1時点の保存データ */
const RECORD_BEFORE_GOAL_FIELDS = {
  id: "r1",
  date: "2026-08-01",
  moodScore: 4,
  moodLabels: [],
  sleepStart: null,
  sleepEnd: null,
  sleepMinutes: null,
  medication: null,
  warningLevel: null,
  warningTags: [],
  warningNote: "",
  selfCareIds: [],
  selfCareMemo: "",
  note: "前の版で書いたメモ",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("目標フィールド追加後の保存データ移行", () => {
  beforeEach(() => {
    localStorage.setItem(
      STORAGE_KEYS.records,
      JSON.stringify([RECORD_BEFORE_GOAL_FIELDS])
    );
    localStorage.setItem(STORAGE_KEYS.schemaVersion, "1");
  });

  it("版1の記録を移行なしでも読める", async () => {
    const result = await typedRepository.getAllRecords();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].tomorrowGoal).toBe("");
      expect(result.value[0].goalReviewStatus).toBeNull();
    }
  });

  it("移行後も既存の入力内容を失わない", async () => {
    const migrated = await typedRepository.runStorageMigrations();
    expect(migrated.ok).toBe(true);

    const result = await typedRepository.getAllRecords();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].note).toBe("前の版で書いたメモ");
      expect(result.value[0].moodScore).toBe(4);
      expect(result.value[0].createdAt).toBe("2026-08-01T00:00:00.000Z");
    }
  });

  it("移行後は保存データの版が最新になる", async () => {
    await typedRepository.runStorageMigrations();

    expect(localStorage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(STORAGE_SCHEMA_VERSION)
    );
  });

  it("移行で目標フィールドが保存形にも書き込まれる", async () => {
    await typedRepository.runStorageMigrations();

    const raw = localStorage.getItem(STORAGE_KEYS.records) ?? "[]";
    const stored = JSON.parse(raw) as Record<string, unknown>[];
    expect(stored[0]).toMatchObject({
      tomorrowGoal: "",
      goalReviewStatus: null,
    });
  });
});

/** セルフケアの感想を持たない、版2時点の保存データ */
const RECORD_BEFORE_SELF_CARE_FEELING = {
  ...RECORD_BEFORE_GOAL_FIELDS,
  selfCareIds: ["s1"],
  selfCareMemo: "前の版で書いたセルフケアのメモ",
  tomorrowGoal: "昼休みに5分だけ外に出る",
  goalReviewStatus: "done",
};

describe("セルフケアの感想フィールド追加後の保存データ移行", () => {
  beforeEach(() => {
    localStorage.setItem(
      STORAGE_KEYS.records,
      JSON.stringify([RECORD_BEFORE_SELF_CARE_FEELING])
    );
    localStorage.setItem(STORAGE_KEYS.schemaVersion, "2");
  });

  it("版2の記録を移行なしでも読める", async () => {
    const result = await typedRepository.getAllRecords();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].selfCareFeeling).toBeNull();
    }
  });

  it("移行後も版2までの入力内容を失わない", async () => {
    const migrated = await typedRepository.runStorageMigrations();
    expect(migrated.ok).toBe(true);

    const result = await typedRepository.getAllRecords();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].note).toBe("前の版で書いたメモ");
      expect(result.value[0].selfCareMemo).toBe(
        "前の版で書いたセルフケアのメモ"
      );
      expect(result.value[0].selfCareIds).toEqual(["s1"]);
      expect(result.value[0].tomorrowGoal).toBe("昼休みに5分だけ外に出る");
      expect(result.value[0].goalReviewStatus).toBe("done");
      expect(result.value[0].createdAt).toBe("2026-08-01T00:00:00.000Z");
    }
  });

  it("移行後は保存データの版が最新になる", async () => {
    await typedRepository.runStorageMigrations();

    expect(localStorage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(STORAGE_SCHEMA_VERSION)
    );
  });

  it("移行で感想フィールドが保存形にも書き込まれる", async () => {
    await typedRepository.runStorageMigrations();

    const raw = localStorage.getItem(STORAGE_KEYS.records) ?? "[]";
    const stored = JSON.parse(raw) as Record<string, unknown>[];
    expect(stored[0]).toMatchObject({ selfCareFeeling: null });
  });

  it("保存済みの感想は移行で書き換えない", async () => {
    localStorage.setItem(
      STORAGE_KEYS.records,
      JSON.stringify([
        { ...RECORD_BEFORE_SELF_CARE_FEELING, selfCareFeeling: "good" },
      ])
    );

    await typedRepository.runStorageMigrations();

    const result = await typedRepository.getAllRecords();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].selfCareFeeling).toBe("good");
    }
  });
});

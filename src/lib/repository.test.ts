import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./constants";
import {
  createEmptyRecordForm,
  repository,
  type Repository,
} from "./repository";
import {
  MAX_MEDICATION_NOTE_LENGTH,
  STORAGE_SCHEMA_VERSION,
} from "./schemas";

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

const SELF_CARE_ITEM_BEFORE_KIND = {
  id: "s1",
  title: "早めに布団に入る",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("控えたいこと追加後の登録簿の移行", () => {
  beforeEach(() => {
    localStorage.setItem(
      STORAGE_KEYS.selfCare,
      JSON.stringify([SELF_CARE_ITEM_BEFORE_KIND])
    );
    localStorage.setItem(STORAGE_KEYS.schemaVersion, "3");
  });

  it("版3の登録簿を移行なしでも読める", async () => {
    const result = await typedRepository.getAllSelfCareItems();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].title).toBe("早めに布団に入る");
    }
  });

  it("種別を持たない既存の登録は「できること」として読む", async () => {
    const result = await typedRepository.getAllSelfCareItems();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].kind).toBe("care");
      // 状態の指定なし＝いつでも出す。既存の登録の見え方を変えない
      expect(result.value[0].stateLevels).toEqual([]);
    }
  });

  it("移行で種別と状態が保存形にも書き込まれる", async () => {
    await typedRepository.runStorageMigrations();

    const raw = localStorage.getItem(STORAGE_KEYS.selfCare) ?? "[]";
    const stored = JSON.parse(raw) as Record<string, unknown>[];
    expect(stored[0]).toMatchObject({ kind: "care", stateLevels: [] });
    expect(localStorage.getItem(STORAGE_KEYS.schemaVersion)).toBe(
      String(STORAGE_SCHEMA_VERSION)
    );
  });

  it("種別と状態を指定して登録できる", async () => {
    const result = await typedRepository.addSelfCareItem({
      title: "大きな買いものを決める",
      kind: "avoid",
      stateLevels: ["good", "hard"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("avoid");
      expect(result.value.stateLevels).toEqual(["good", "hard"]);
    }
  });

  it("名前だけの更新では、種別と状態を変えない", async () => {
    const added = await typedRepository.addSelfCareItem({
      title: "衝動買い",
      kind: "avoid",
      stateLevels: ["good"],
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const updated = await typedRepository.updateSelfCareItem(
      added.value.id,
      "大きな買いもの"
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.title).toBe("大きな買いもの");
      expect(updated.value.kind).toBe("avoid");
      expect(updated.value.stateLevels).toEqual(["good"]);
    }
  });

  it("同じ状態を重ねて渡しても1つにまとめる", async () => {
    const result = await typedRepository.addSelfCareItem({
      title: "夜更かし",
      kind: "avoid",
      stateLevels: ["hard", "hard"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stateLevels).toEqual(["hard"]);
    }
  });
});

describe("お薬メモ", () => {
  it("未入力なら空文字を返す", async () => {
    await expect(typedRepository.getMedicationNote()).resolves.toEqual({
      ok: true,
      value: "",
    });
  });

  it("入力した内容を読み書きできる", async () => {
    const saved = await typedRepository.saveMedicationNote("朝1錠");
    expect(saved.ok).toBe(true);

    await expect(typedRepository.getMedicationNote()).resolves.toEqual({
      ok: true,
      value: "朝1錠",
    });
  });

  it("空文字を渡すと保存内容を消す", async () => {
    await typedRepository.saveMedicationNote("朝1錠");
    const cleared = await typedRepository.saveMedicationNote("");

    expect(cleared.ok).toBe(true);
    await expect(typedRepository.getMedicationNote()).resolves.toEqual({
      ok: true,
      value: "",
    });
  });

  it("上限を超える入力は保存しない", async () => {
    const result = await typedRepository.saveMedicationNote(
      "あ".repeat(MAX_MEDICATION_NOTE_LENGTH + 1)
    );

    expect(result.ok).toBe(false);
    await expect(typedRepository.getMedicationNote()).resolves.toEqual({
      ok: true,
      value: "",
    });
  });

  it("保存済みの値が壊れていても未入力として読む", async () => {
    localStorage.setItem(
      STORAGE_KEYS.medicationNote,
      "あ".repeat(MAX_MEDICATION_NOTE_LENGTH + 1)
    );

    await expect(typedRepository.getMedicationNote()).resolves.toEqual({
      ok: true,
      value: "",
    });
  });

  it("書き出しにお薬メモを含める", async () => {
    await typedRepository.saveMedicationNote("朝1錠");

    const payload = await typedRepository.buildExportPayload();
    expect(payload.ok).toBe(true);
    if (payload.ok) {
      expect(payload.value.medicationNote).toBe("朝1錠");
    }
  });

  it("取り込みでお薬メモを復元する", async () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: "2026-08-16T00:00:00.000Z",
      returnDate: null,
      medicationNote: "就寝前1錠",
      records: [],
      selfCareItems: [],
    });

    const imported = await typedRepository.importBackup(json);
    expect(imported.ok).toBe(true);

    await expect(typedRepository.getMedicationNote()).resolves.toEqual({
      ok: true,
      value: "就寝前1錠",
    });
  });

  it("お薬メモを持たない書き出しを取り込むと未入力へ戻す", async () => {
    await typedRepository.saveMedicationNote("端末に残っていた内容");

    const json = JSON.stringify({
      version: 1,
      exportedAt: "2026-08-16T00:00:00.000Z",
      records: [],
      selfCareItems: [],
    });
    const imported = await typedRepository.importBackup(json);
    expect(imported.ok).toBe(true);

    await expect(typedRepository.getMedicationNote()).resolves.toEqual({
      ok: true,
      value: "",
    });
  });
});

describe("積み重ねの起点となる復職日", () => {
  it("未設定なら null を返す", async () => {
    await expect(typedRepository.getReturnDate()).resolves.toEqual({
      ok: true,
      value: null,
    });
  });

  it("設定した日付を読み書きできる", async () => {
    const saved = await typedRepository.saveReturnDate("2026-04-01");

    expect(saved.ok).toBe(true);
    await expect(typedRepository.getReturnDate()).resolves.toEqual({
      ok: true,
      value: "2026-04-01",
    });
  });

  it("null を渡すと未設定へ戻す", async () => {
    await typedRepository.saveReturnDate("2026-04-01");
    const cleared = await typedRepository.saveReturnDate(null);

    expect(cleared.ok).toBe(true);
    await expect(typedRepository.getReturnDate()).resolves.toEqual({
      ok: true,
      value: null,
    });
  });

  it("形式が違う日付は保存しない", async () => {
    const result = await typedRepository.saveReturnDate("2026/04/01");

    expect(result.ok).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.returnDate)).toBeNull();
  });

  it("保存済みの値が壊れていても未設定として読む", async () => {
    localStorage.setItem(STORAGE_KEYS.returnDate, "こわれた値");

    await expect(typedRepository.getReturnDate()).resolves.toEqual({
      ok: true,
      value: null,
    });
  });

  it("書き出しに復職日を含める", async () => {
    await typedRepository.saveReturnDate("2026-04-01");

    const payload = await typedRepository.buildExportPayload();

    expect(payload.ok).toBe(true);
    if (payload.ok) {
      expect(payload.value.returnDate).toBe("2026-04-01");
    }
  });

  it("取り込みで復職日を復元する", async () => {
    const result = await typedRepository.importBackup(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-08-15T00:00:00.000Z",
        returnDate: "2026-04-01",
        records: [],
        selfCareItems: [],
      })
    );

    expect(result.ok).toBe(true);
    await expect(typedRepository.getReturnDate()).resolves.toEqual({
      ok: true,
      value: "2026-04-01",
    });
  });

  it("復職日を持たない書き出しを取り込むと未設定へ戻す", async () => {
    await typedRepository.saveReturnDate("2026-04-01");

    const result = await typedRepository.importBackup(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-08-15T00:00:00.000Z",
        records: [],
        selfCareItems: [],
      })
    );

    expect(result.ok).toBe(true);
    await expect(typedRepository.getReturnDate()).resolves.toEqual({
      ok: true,
      value: null,
    });
  });
});

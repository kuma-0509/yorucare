import { describe, expect, it } from "vitest";
import { summarizePeriod } from "./period-summary";
import type { DailyRecord } from "../types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-07-21",
    moodScore: 4,
    moodLabels: [],
    sleepStart: "23:00",
    sleepEnd: "07:00",
    sleepMinutes: 480,
    medication: "done",
    warningLevel: "none",
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    note: "",
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("summarizePeriod", () => {
  it("期間の暦日数と記録があった日数を別々に返す", () => {
    const summary = summarizePeriod(
      [
        makeRecord({ id: "a", date: "2026-07-21" }),
        makeRecord({ id: "b", date: "2026-07-23" }),
      ],
      "2026-07-21",
      "2026-07-27"
    );

    expect(summary.daysInRange).toBe(7);
    expect(summary.recordedDays).toBe(2);
  });

  it("期間外の記録を集計に含めない", () => {
    const summary = summarizePeriod(
      [
        makeRecord({ id: "a", date: "2026-07-20" }),
        makeRecord({ id: "b", date: "2026-07-21" }),
        makeRecord({ id: "c", date: "2026-07-28" }),
      ],
      "2026-07-21",
      "2026-07-27"
    );

    expect(summary.recordedDays).toBe(1);
  });

  it("同じ日付の記録は1日として数える", () => {
    const summary = summarizePeriod(
      [
        makeRecord({ id: "a", date: "2026-07-21", moodScore: 2 }),
        makeRecord({ id: "b", date: "2026-07-21", moodScore: 5 }),
      ],
      "2026-07-21",
      "2026-07-21"
    );

    expect(summary.recordedDays).toBe(1);
    expect(summary.mood.scoredDays).toBe(1);
  });

  it("moodScore の平均と分布を返す", () => {
    const summary = summarizePeriod(
      [
        makeRecord({ id: "a", date: "2026-07-21", moodScore: 2 }),
        makeRecord({ id: "b", date: "2026-07-22", moodScore: 3 }),
        makeRecord({ id: "c", date: "2026-07-23", moodScore: 3 }),
      ],
      "2026-07-21",
      "2026-07-23"
    );

    expect(summary.mood.averageScore).toBe(2.7);
    expect(summary.mood.scoredDays).toBe(3);
    expect(summary.mood.distribution).toEqual({ 1: 0, 2: 1, 3: 2, 4: 0, 5: 0 });
  });

  it("記録はあるが moodScore が未入力なら平均を null にする", () => {
    const summary = summarizePeriod(
      [makeRecord({ date: "2026-07-21", moodScore: null })],
      "2026-07-21",
      "2026-07-21"
    );

    // 0 を返すと「気分が最低だった」と読まれるため null で区別する
    expect(summary.mood.averageScore).toBeNull();
    expect(summary.mood.scoredDays).toBe(0);
    expect(summary.recordedDays).toBe(1);
  });

  it("睡眠時間の平均と母標準偏差を分で返す", () => {
    const summary = summarizePeriod(
      [
        makeRecord({ id: "a", date: "2026-07-21", sleepMinutes: 400 }),
        makeRecord({ id: "b", date: "2026-07-22", sleepMinutes: 500 }),
      ],
      "2026-07-21",
      "2026-07-22"
    );

    expect(summary.sleep.averageMinutes).toBe(450);
    expect(summary.sleep.deviationMinutes).toBe(50);
    expect(summary.sleep.measuredDays).toBe(2);
  });

  it("睡眠時間が1日分しかなければ標準偏差を null にする", () => {
    const summary = summarizePeriod(
      [makeRecord({ date: "2026-07-21", sleepMinutes: 400 })],
      "2026-07-21",
      "2026-07-21"
    );

    expect(summary.sleep.averageMinutes).toBe(400);
    expect(summary.sleep.deviationMinutes).toBeNull();
  });

  it("日付をまたぐ就寝時刻の中央値を正しく返す", () => {
    const summary = summarizePeriod(
      [
        makeRecord({ id: "a", date: "2026-07-21", sleepStart: "23:00" }),
        makeRecord({ id: "b", date: "2026-07-22", sleepStart: "01:00" }),
        makeRecord({ id: "c", date: "2026-07-23", sleepStart: "00:00" }),
      ],
      "2026-07-21",
      "2026-07-23"
    );

    // 単純平均では 08:00 になってしまう。正午基準の窓に写して中央値を取る
    expect(summary.sleep.medianBedtime).toBe("00:00");
    expect(summary.sleep.bedtimeDays).toBe(3);
  });

  it("就寝時刻が偶数件でも日付をまたいで中央値を返す", () => {
    const summary = summarizePeriod(
      [
        makeRecord({ id: "a", date: "2026-07-21", sleepStart: "23:00" }),
        makeRecord({ id: "b", date: "2026-07-22", sleepStart: "01:00" }),
      ],
      "2026-07-21",
      "2026-07-22"
    );

    expect(summary.sleep.medianBedtime).toBe("00:00");
  });

  it("服薬の done 率を回答があった日数を母数として返す", () => {
    const summary = summarizePeriod(
      [
        makeRecord({ id: "a", date: "2026-07-21", medication: "done" }),
        makeRecord({ id: "b", date: "2026-07-22", medication: "forgot" }),
        makeRecord({ id: "c", date: "2026-07-23", medication: null }),
      ],
      "2026-07-21",
      "2026-07-23"
    );

    // 母数は記録があった3日ではなく、服薬を回答した2日
    expect(summary.medication.answeredDays).toBe(2);
    expect(summary.medication.donePercent).toBe(50);
    expect(summary.medication.countByStatus).toEqual({
      done: 1,
      partial: 0,
      forgot: 1,
      none: 0,
    });
  });

  it("服薬の回答が1件もなければ done 率を null にする", () => {
    const summary = summarizePeriod(
      [makeRecord({ date: "2026-07-21", medication: null })],
      "2026-07-21",
      "2026-07-21"
    );

    expect(summary.medication.donePercent).toBeNull();
  });

  it("警告サインを段階ごとの日数で返す", () => {
    const summary = summarizePeriod(
      [
        makeRecord({ id: "a", date: "2026-07-21", warningLevel: "yes" }),
        makeRecord({ id: "b", date: "2026-07-22", warningLevel: "small" }),
        makeRecord({ id: "c", date: "2026-07-23", warningLevel: "small" }),
        makeRecord({ id: "d", date: "2026-07-24", warningLevel: null }),
      ],
      "2026-07-21",
      "2026-07-24"
    );

    expect(summary.warning.answeredDays).toBe(3);
    expect(summary.warning.countByLevel).toEqual({
      none: 0,
      small: 2,
      yes: 1,
    });
  });

  it("記録が1件もなくても暦日数を返し、集計値はすべて null になる", () => {
    const summary = summarizePeriod([], "2026-07-21", "2026-07-27");

    expect(summary.daysInRange).toBe(7);
    expect(summary.recordedDays).toBe(0);
    expect(summary.mood.averageScore).toBeNull();
    expect(summary.sleep.averageMinutes).toBeNull();
    expect(summary.sleep.medianBedtime).toBeNull();
    expect(summary.medication.donePercent).toBeNull();
  });

  it("メモ本文を戻り値に含めない", () => {
    const summary = summarizePeriod(
      [
        makeRecord({
          date: "2026-07-21",
          note: "自由記述の内容",
          warningNote: "警告のメモ",
          selfCareMemo: "セルフケアのメモ",
        }),
      ],
      "2026-07-21",
      "2026-07-21"
    );

    // 本人が書いた本文は端末外へ出さない方針を、値としても確認する
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("自由記述の内容");
    expect(serialized).not.toContain("警告のメモ");
    expect(serialized).not.toContain("セルフケアのメモ");
  });
});

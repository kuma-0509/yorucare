// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { TodayRecordTab } from "./today-record-tab";
import { ok } from "@/lib/result";
import { COPY } from "@/lib/copy";
import { getTodayString } from "@/lib/dates";
import {
  toggleRecordFormSection,
  type RecordFormSectionKey,
} from "@/lib/record-form-sections";
import type { DailyRecord, SelfCareItem } from "@/lib/types";

const getRecordByDate = vi.fn();
const initSelfCareIfEmpty = vi.fn();
const addSelfCareItem = vi.fn();
const getAllRecords = vi.fn();
const saveRecord = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>(
    "@/lib/storage"
  );
  return {
    ...actual,
    getRecordByDate: (date: string) => getRecordByDate(date),
    initSelfCareIfEmpty: () => initSelfCareIfEmpty(),
    addSelfCareItem: (title: string) => addSelfCareItem(title),
    getAllRecords: () => getAllRecords(),
    saveRecord: (date: string, form: unknown) => saveRecord(date, form),
  };
});

function makeRecord(
  date: string,
  overrides: Partial<DailyRecord> = {}
): DailyRecord {
  return {
    id: date,
    date,
    moodScore: 2,
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
    selfCareFeeling: null,
    note: "",
    tomorrowGoal: "",
    goalReviewStatus: null,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

function makeItem(id: string, title: string): SelfCareItem {
  return {
    id,
    title,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

/** 「眠れない」を選んだ「しんどい」日にだけ出る案 */
const SLEEP_TAG_SUGGESTION = "布団に入る時間を15分早める";

function renderTab() {
  return render(<TodayRecordTab onNavigateTab={() => {}} />);
}

/** カスタム入力の既定はすべてOFF。検証したい項目だけを出す設定にする */
function showSections(...keys: RecordFormSectionKey[]) {
  for (const key of keys) toggleRecordFormSection(key, true);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("カスタム入力による表示の切り替え", () => {
  it("既定では、日付・気分・睡眠・メモだけを出す", async () => {
    const today = getTodayString();
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(ok(date === today ? makeRecord(today) : null))
    );

    renderTab();

    // いつも出る項目
    expect(await screen.findByLabelText(COPY.sleep.startLabel)).toBeTruthy();
    expect(screen.getByLabelText(COPY.sleep.endLabel)).toBeTruthy();
    expect(screen.getByRole("radio", { name: /よい/ })).toBeTruthy();
    expect(screen.getByLabelText(COPY.memoOptional)).toBeTruthy();

    // カスタム入力でONにするまで出さない項目
    expect(screen.queryByText(COPY.selfCareSuggestion.title)).toBeNull();
    expect(screen.queryByText(COPY.detailSection)).toBeNull();
    expect(screen.queryByText(`${COPY.warningSign}（任意）`)).toBeNull();
    expect(screen.queryByText(COPY.doneTodayToday)).toBeNull();
    expect(screen.queryByLabelText(/小さな目標/)).toBeNull();
  });

  it("ONにした項目だけを出す", async () => {
    const today = getTodayString();
    showSections("warningSign", "goal");
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(ok(date === today ? makeRecord(today) : null))
    );

    renderTab();

    expect(
      await screen.findByText(`${COPY.warningSign}（任意）`)
    ).toBeTruthy();
    expect(screen.getByLabelText(/小さな目標/)).toBeTruthy();
    expect(screen.queryByText(COPY.selfCareSuggestion.title)).toBeNull();
    expect(screen.queryByText(COPY.doneTodayToday)).toBeNull();
  });

  it("項目を出さなくても、保存済みの内容は消さない。出し直せばまた見える", async () => {
    const today = getTodayString();
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(
        ok(
          date === today
            ? makeRecord(today, {
                warningLevel: "yes",
                warningTags: ["眠れない"],
                tomorrowGoal: "5分だけ外に出る",
              })
            : null
        )
      )
    );

    renderTab();

    await waitFor(() => {
      expect(screen.queryByText(`${COPY.warningSign}（任意）`)).toBeNull();
    });

    // 開いたままの画面でも、設定を変えた時点で表示が切り替わる
    showSections("warningSign", "goal");

    expect(
      await screen.findByRole("radio", { name: "あり", checked: true })
    ).toBeTruthy();
    expect(
      (screen.getByLabelText(/小さな目標/) as HTMLInputElement).value
    ).toBe("5分だけ外に出る");
  });

  it("睡眠の入力は、くわしく書くを出さなくても使える", async () => {
    const today = getTodayString();
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(
        ok(
          date === today
            ? makeRecord(today, { sleepStart: "23:30", sleepEnd: "07:00" })
            : null
        )
      )
    );

    renderTab();

    const start = (await screen.findByLabelText(
      COPY.sleep.startLabel
    )) as HTMLInputElement;
    expect(start.value).toBe("23:30");
    expect(screen.queryByText(COPY.detailSection)).toBeNull();
  });
});

describe("しんどさのサインと自分メンテの案", () => {
  it("サインを選び直して隠したら、その日のタグを残さない", async () => {
    const today = getTodayString();
    showSections("selfCareSuggestion", "warningSign");
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(
        ok(
          date === today
            ? makeRecord(today, {
                warningLevel: "small",
                warningTags: ["眠れない"],
              })
            : null
        )
      )
    );

    renderTab();

    await waitFor(() => {
      expect(screen.getByText(SLEEP_TAG_SUGGESTION)).toBeTruthy();
    });

    // 選択中の「少しあり」をもう一度押すと、サインの内容が画面から消える
    fireEvent.click(screen.getByRole("radio", { name: "少しあり" }));

    await waitFor(() => {
      expect(screen.queryByText(SLEEP_TAG_SUGGESTION)).toBeNull();
    });
  });

  it("「なし」を選んでもタグを残さない", async () => {
    const today = getTodayString();
    showSections("selfCareSuggestion", "warningSign");
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(
        ok(
          date === today
            ? makeRecord(today, {
                warningLevel: "yes",
                warningTags: ["眠れない"],
              })
            : null
        )
      )
    );

    renderTab();

    await waitFor(() => {
      expect(screen.getByText(SLEEP_TAG_SUGGESTION)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("radio", { name: "なし" }));

    await waitFor(() => {
      expect(screen.queryByText(SLEEP_TAG_SUGGESTION)).toBeNull();
    });
  });

  it("画面に出ていないタグを持つ既存の記録でも、案に効かせない", async () => {
    // この修正より前は、サインを選び直すとタグが残ったまま保存されていた
    const today = getTodayString();
    showSections("selfCareSuggestion", "warningSign");
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(
        ok(
          date === today
            ? makeRecord(today, {
                warningLevel: null,
                warningTags: ["眠れない"],
              })
            : null
        )
      )
    );

    renderTab();

    await waitFor(() => {
      expect(screen.getByText("自分メンテ")).toBeTruthy();
    });
    expect(screen.queryByText(SLEEP_TAG_SUGGESTION)).toBeNull();
  });
});

describe("同じ名前の「できること」があるとき", () => {
  it("選択中のものを外す。先頭を選び直して解除できなくならない", async () => {
    const today = getTodayString();
    showSections("selfCareSuggestion", "warningSign", "doneToday");
    // 案と同じ名前の「できること」が2つあり、選ばれているのは2つめだけ
    const [first, second] = [
      makeItem("s1", SLEEP_TAG_SUGGESTION),
      makeItem("s2", SLEEP_TAG_SUGGESTION),
    ];
    initSelfCareIfEmpty.mockResolvedValue(ok([first, second]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(
        ok(
          date === today
            ? makeRecord(today, {
                warningLevel: "small",
                warningTags: ["眠れない"],
                selfCareIds: ["s2"],
              })
            : null
        )
      )
    );

    renderTab();

    // 同名の「できること」が一覧にも並ぶので、自分メンテのカード内に絞る
    const notice = await screen.findByText(/体調を判断したり/);
    const suggestionCard = within(notice.parentElement!);
    const suggestion = suggestionCard.getByRole("button", {
      name: SLEEP_TAG_SUGGESTION,
    });

    expect(suggestion.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(suggestion);

    await waitFor(() => {
      expect(suggestion.getAttribute("aria-pressed")).toBe("false");
    });
    // 名前が同じでも、辞書へ登録し直さない
    expect(addSelfCareItem).not.toHaveBeenCalled();
  });
});

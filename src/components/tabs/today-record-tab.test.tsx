// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { getTodayString } from "@/lib/dates";
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("しんどさのサインと自分メンテの案", () => {
  it("サインを選び直して隠したら、その日のタグを残さない", async () => {
    const today = getTodayString();
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

describe("保存済みの目標の読み取り表示", () => {
  it("保存した目標を、入力欄とは別に読み取り表示する", async () => {
    const today = getTodayString();
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(
        ok(
          date === today
            ? makeRecord(today, { tomorrowGoal: "朝に窓を開ける" })
            : null
        )
      )
    );

    renderTab();

    await waitFor(() => {
      expect(screen.getByText("保存した目標：")).toBeTruthy();
    });
    // 入力欄の値とは別に、文字として読み返せる
    const input = screen.getByLabelText("明日の小さな目標") as HTMLInputElement;
    expect(input.value).toBe("朝に窓を開ける");
    expect(screen.getByText("朝に窓を開ける")).toBeTruthy();
    expect(screen.queryByText("入力中の内容は、保存すると更新されます。")).toBeNull();
  });

  it("目標を決めていない日は、決めていないと分かる文を出す", async () => {
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockResolvedValue(ok(null));

    renderTab();

    await waitFor(() => {
      expect(screen.getByText("保存した目標：")).toBeTruthy();
    });
    expect(screen.getByText("まだ決めていません")).toBeTruthy();
  });

  it("入力を変えている間は、保存済みの内容と違うことを伝える", async () => {
    const today = getTodayString();
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(
        ok(
          date === today
            ? makeRecord(today, { tomorrowGoal: "朝に窓を開ける" })
            : null
        )
      )
    );

    renderTab();

    const input = await screen.findByLabelText("明日の小さな目標");
    fireEvent.change(input, { target: { value: "夕方に5分だけ歩く" } });

    await waitFor(() => {
      expect(
        screen.getByText("入力中の内容は、保存すると更新されます。")
      ).toBeTruthy();
    });
    // 保存済みの内容は、書き換えても読み返せる
    expect(screen.getByText("朝に窓を開ける")).toBeTruthy();
  });
});

describe("同じ名前の「できること」があるとき", () => {
  it("選択中のものを外す。先頭を選び直して解除できなくならない", async () => {
    const today = getTodayString();
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

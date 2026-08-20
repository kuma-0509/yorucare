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

describe("睡眠時刻のクイック選択", () => {
  /** 睡眠の入力は「くわしく書く（任意）」の中にあるので、先に開く */
  async function openDetailSection() {
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockResolvedValue(ok(null));
    renderTab();
    const toggle = await screen.findByRole("button", {
      name: /くわしく書く/,
    });
    fireEvent.click(toggle);
  }

  it("候補を押すと時刻入力欄へ入り、睡眠時間が出る", async () => {
    await openDetailSection();

    fireEvent.click(await screen.findByRole("radio", { name: "23:00" }));
    fireEvent.click(screen.getByRole("radio", { name: "07:00" }));

    await waitFor(() => {
      expect(
        (screen.getByLabelText("寝た時間") as HTMLInputElement).value
      ).toBe("23:00");
    });
    expect((screen.getByLabelText("起きた時間") as HTMLInputElement).value).toBe(
      "07:00"
    );
    expect(screen.getByText("8時間")).toBeTruthy();
  });

  it("選んだ候補をもう一度押すと未入力へ戻る", async () => {
    await openDetailSection();

    const option = await screen.findByRole("radio", { name: "23:00" });
    fireEvent.click(option);
    await waitFor(() => {
      expect(option.getAttribute("aria-checked")).toBe("true");
    });

    fireEvent.click(option);

    await waitFor(() => {
      expect(option.getAttribute("aria-checked")).toBe("false");
    });
    expect((screen.getByLabelText("寝た時間") as HTMLInputElement).value).toBe(
      ""
    );
  });

  it("候補の間の時刻は5分ずつの調整で入れられる", async () => {
    await openDetailSection();

    fireEvent.click(await screen.findByRole("radio", { name: "23:00" }));
    fireEvent.click(screen.getByRole("button", { name: "寝た時間を5分早める" }));
    fireEvent.click(screen.getByRole("button", { name: "寝た時間を5分早める" }));

    await waitFor(() => {
      expect(
        (screen.getByLabelText("寝た時間") as HTMLInputElement).value
      ).toBe("22:50");
    });
    // 候補と一致しなくなったら、候補側の選択は外れる
    expect(
      screen.getByRole("radio", { name: "23:00" }).getAttribute("aria-checked")
    ).toBe("false");
  });

  it("未入力のときは5分ずつの調整を押せない", async () => {
    await openDetailSection();

    const earlier = await screen.findByRole("button", {
      name: "起きた時間を5分早める",
    });
    expect((earlier as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: "07:00" }));

    await waitFor(() => {
      expect((earlier as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("時刻を直接入力する欄は残しておく", async () => {
    await openDetailSection();

    const input = (await screen.findByLabelText("寝た時間")) as HTMLInputElement;
    expect(input.type).toBe("time");

    fireEvent.change(input, { target: { value: "22:37" } });

    await waitFor(() => {
      expect(input.value).toBe("22:37");
    });
    // 直接入力した時刻からでも5分刻みへ寄せられる
    fireEvent.click(screen.getByRole("button", { name: "寝た時間を5分遅くする" }));
    await waitFor(() => {
      expect(input.value).toBe("22:40");
    });
  });
});

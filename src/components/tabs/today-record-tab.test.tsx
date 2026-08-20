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
import { COPY } from "@/lib/copy";
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

describe("自分で追加した気持ちの区分", () => {
  /** 「くわしく書く（任意）」を開いて、気持ちの選択肢を画面に出す */
  async function openDetails() {
    const toggle = await screen.findByRole("button", {
      name: /くわしく書く/,
    });
    fireEvent.click(toggle);
  }

  function renderWithCustomMood() {
    const today = getTodayString();
    initSelfCareIfEmpty.mockResolvedValue(ok([]));
    getRecordByDate.mockImplementation((date: string) =>
      Promise.resolve(
        ok(
          date === today
            ? makeRecord(today, {
                moodLabels: [
                  { label: "そわそわ", category: "普通", isCustom: true },
                ],
              })
            : null
        )
      )
    );
    return renderTab();
  }

  it("色ドットだけでなく区分名も文字で出す", async () => {
    renderWithCustomMood();
    await openDetails();

    const chip = await screen.findByRole("button", {
      name: /^そわそわ/,
    });
    // 区分名が読み上げにも見た目にも出る
    expect(chip.textContent).toContain("そわそわ");
    expect(chip.textContent).toContain("普通");
    expect(chip.textContent).toContain(COPY.moodLabel.categoryName);
  });

  it("追加したあとでも区分を選び直せる", async () => {
    renderWithCustomMood();
    await openDetails();

    fireEvent.click(
      await screen.findByRole("button", {
        name: `「そわそわ」の${COPY.moodLabel.categoryName}を変える`,
      })
    );

    // いま付いている区分が選択済みとして出る
    const radios = await screen.findAllByRole("radio");
    const current = radios.find((radio) => radio.textContent === "普通");
    expect(current?.getAttribute("aria-checked")).toBe("true");

    const next = radios.find((radio) => radio.textContent === "ややネガティブ");
    fireEvent.click(next!);

    await waitFor(() => {
      const chip = screen.getByRole("button", { name: /^そわそわ/ });
      expect(chip.textContent).toContain("ややネガティブ");
    });
    // ラベルと選択状態は変えない
    const chip = screen.getByRole("button", { name: /^そわそわ/ });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
  });

  it("追加時は区分が未選択のまま選ばせ、選んだ区分つきで並べる", async () => {
    renderWithCustomMood();
    await openDetails();

    fireEvent.change(screen.getByLabelText("気持ちを追加"), {
      target: { value: "もやもや" },
    });
    fireEvent.click(screen.getByRole("button", { name: COPY.add }));

    // どの気持ちの区分を選んでいるのかが見出しで分かる
    expect(
      await screen.findByText(
        `「もやもや」の${COPY.moodLabel.categoryAddTitle}`
      )
    ).toBeTruthy();

    const radios = screen.getAllByRole("radio");
    const options = radios.filter((radio) =>
      radio.closest('[role="radiogroup"]')?.getAttribute("aria-label") ===
      COPY.moodLabel.categoryName
    );
    // 追加時はどれも選ばれていない
    expect(
      options.every((radio) => radio.getAttribute("aria-checked") === "false")
    ).toBe(true);

    fireEvent.click(
      options.find((radio) => radio.textContent === "ややポジティブ")!
    );

    await waitFor(() => {
      const chip = screen.getByRole("button", { name: /^もやもや/ });
      expect(chip.textContent).toContain("ややポジティブ");
    });
  });

  it("区分は色分け用で、状態の3段階とは別だと画面で伝える", async () => {
    renderWithCustomMood();
    await openDetails();

    const notice = await screen.findByText(COPY.moodLabel.categoryAxisNotice);
    expect(notice).toBeTruthy();
    // 区分を「段階」と呼ばない（3段階の状態と同じ軸に見せない）
    expect(COPY.moodLabel.categoryName).not.toContain("段階");
    expect(COPY.moodLabel.categoryChangeAction).not.toContain("段階");
  });
});

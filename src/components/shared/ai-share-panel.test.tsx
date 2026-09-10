// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiSharePanel } from "./ai-share-panel";
import {
  createAiShareCsvFileBlob,
  createAiShareTextFileBlob,
  formatAiSharePeriodLimitHint,
} from "@/lib/ai-share-text";
import { COPY } from "@/lib/copy";
import type { DailyRecord, SelfCareItem } from "@/lib/types";

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
    warningLevel: null,
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    selfCareFeeling: null,
    note: "画面上の全文",
    tomorrowGoal: "",
    goalReviewStatus: null,
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

const selfCareItems: SelfCareItem[] = [];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("生成AIなどへ共有", () => {
  it("画面案内の期間上限は30日である", () => {
    render(
      <AiSharePanel
        records={[makeRecord()]}
        selfCareItems={selfCareItems}
      />
    );

    expect(screen.getByText(formatAiSharePeriodLimitHint())).toBeTruthy();
    expect(screen.queryByText(/7日間まで/)).toBeNull();
  });

  it("保存ファイルだけBOMを付け、全文確認とコピーの内容は変えない", async () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(
      <AiSharePanel
        records={[makeRecord()]}
        selfCareItems={selfCareItems}
      />
    );

    fireEvent.change(screen.getByLabelText("開始日"), {
      target: { value: "2026-07-21" },
    });
    fireEvent.change(screen.getByLabelText("終了日"), {
      target: { value: "2026-07-21" },
    });
    fireEvent.click(screen.getByRole("button", { name: "共有する全文を確認する" }));

    const preview = await screen.findByText(/ヨルケア 振り返り用テキスト/);
    expect(preview.textContent?.startsWith("\uFEFF")).toBe(false);
    expect(preview.textContent).toContain("気分・状態");
    expect(preview.textContent).not.toContain("画面上の全文");

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /共有される全文と、共有後はヨルケアから削除・取り消しできないことを確認しました/,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "テキストをコピー" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied.startsWith("\uFEFF")).toBe(false);
    expect(copied).toContain("気分・状態");
    expect(copied).not.toContain("画面上の全文");
    expect(copied).toBe(preview.textContent);

    fireEvent.click(
      screen.getByRole("button", { name: "テキストファイルを保存" })
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const expected = createAiShareTextFileBlob(copied);
    expect(blob.type).toBe(expected.type);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(
      new Uint8Array(await expected.arrayBuffer())
    );
  });

  it("確認後だけCSVを保存でき、選んでいない項目はファイルに出ない", async () => {
    const createObjectURL = vi.fn(() => "blob:csv");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const downloadSetter = vi.spyOn(
      HTMLAnchorElement.prototype,
      "download",
      "set"
    );

    render(
      <AiSharePanel
        records={[makeRecord()]}
        selfCareItems={selfCareItems}
      />
    );

    fireEvent.change(screen.getByLabelText("開始日"), {
      target: { value: "2026-07-21" },
    });
    fireEvent.change(screen.getByLabelText("終了日"), {
      target: { value: "2026-07-21" },
    });
    fireEvent.click(screen.getByRole("button", { name: "共有する全文を確認する" }));

    const csvButton = await screen.findByRole("button", {
      name: COPY.aiShare.saveCsv,
    });
    expect(csvButton).toHaveProperty("disabled", true);

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /共有される全文と、共有後はヨルケアから削除・取り消しできないことを確認しました/,
      })
    );

    expect(csvButton).toHaveProperty("disabled", false);
    fireEvent.click(csvButton);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(downloadSetter).toHaveBeenCalledWith(
      "yorucare-ai-share-2026-07-21-2026-07-21.csv"
    );

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const csv = [
      "日付,気分・状態,睡眠",
      "2026-07-21,まあまあ良い,23:00〜07:00（8時間）",
    ].join("\r\n");
    const expected = createAiShareCsvFileBlob(csv);
    expect(blob.type).toBe(expected.type);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(
      new Uint8Array(await expected.arrayBuffer())
    );

    const decoded = new TextDecoder("utf-8").decode(
      (await blob.arrayBuffer()).slice(3)
    );
    expect(decoded).not.toContain("画面上の全文");
    expect(decoded).not.toContain("服薬");
    expect(screen.getAllByText(COPY.aiShare.savedCsv).length).toBeGreaterThan(0);
  });
});

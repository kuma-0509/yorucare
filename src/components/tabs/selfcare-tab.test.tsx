// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { SelfCareTab } from "./selfcare-tab";
import { COPY } from "@/lib/copy";
import { ok } from "@/lib/result";
import type { SelfCareItem } from "@/lib/types";

const initSelfCareIfEmpty = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>(
    "@/lib/storage"
  );
  return {
    ...actual,
    initSelfCareIfEmpty: () => initSelfCareIfEmpty(),
  };
});

function makeItem(id: string, title: string): SelfCareItem {
  return {
    id,
    title,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SelfCareTab の案内文", () => {
  it("登録簿が「できたこと」として記録へ残ることを案内する", async () => {
    initSelfCareIfEmpty.mockResolvedValue(ok([makeItem("s1", "10分歩く")]));

    render(<SelfCareTab />);

    await waitFor(() => {
      expect(screen.getByText("10分歩く")).toBeTruthy();
    });

    const relation = screen.getByText(COPY.selfCareRelation.registryToRecord);
    // 登録簿（この画面）と実施記録（記録画面）が同じ機能であることを、
    // 両方の語と行き先のタブ名を出して示す
    expect(relation.textContent).toContain(COPY.tab.today);
    expect(relation.textContent).toContain(COPY.doneToday);
    expect(screen.getByText(COPY.selfCareRelation.registryDescription))
      .toBeTruthy();
  });

  it("登録がまだなくても案内文を出す", async () => {
    initSelfCareIfEmpty.mockResolvedValue(ok([]));

    render(<SelfCareTab />);

    await waitFor(() => {
      expect(
        screen.getByText(COPY.selfCareRelation.registryToRecord)
      ).toBeTruthy();
    });
  });

  it("登録簿と実施記録の語は分けたままにする", () => {
    // 案内文でつながりを示すだけにし、語そのものは統一しない。
    // 同じ語にすると、登録しただけの項目と実施した記録を画面で区別できなくなる。
    expect(COPY.selfCareAction).not.toBe(COPY.doneToday);
    expect(COPY.selfCareAction).not.toBe(COPY.doneTodayToday);
  });
});

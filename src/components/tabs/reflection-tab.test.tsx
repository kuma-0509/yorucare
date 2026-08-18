// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COPY } from "@/lib/copy";
import { REFLECTION_USER_FEATURES } from "@/lib/constants";
import { ReflectionTab } from "./reflection-tab";

vi.mock("@/components/reflection/accumulation-card", () => ({
  AccumulationCard: () => <div>積み重ね</div>,
}));
vi.mock("@/components/reflection/weekly-summary-card", () => ({
  WeeklySummaryCard: () => <div>週のまとめ</div>,
}));
vi.mock("@/components/reflection/reflection-trends", () => ({
  ReflectionTrends: () => <div>体調の傾向</div>,
}));

afterEach(cleanup);

describe("ReflectionTab", () => {
  it("実装済みの機能を追加予定の説明に含めない", () => {
    render(<ReflectionTab />);

    const description = screen.getByText(COPY.reflection.futureDescription);
    for (const implementedFeature of ["週のまとめ", "積み重ね", "体調の傾向"]) {
      expect(description.textContent).not.toContain(implementedFeature);
    }
  });

  it("追加予定の項目を表示する", () => {
    render(<ReflectionTab />);

    expect(screen.getByText(COPY.reflection.futureTitle)).toBeTruthy();
    for (const feature of REFLECTION_USER_FEATURES) {
      expect(screen.getByText(feature)).toBeTruthy();
    }
  });
});

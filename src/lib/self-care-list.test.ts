import { describe, expect, it } from "vitest";
import {
  describeStateLevels,
  matchesStateLevel,
  selectCareItemsForRecord,
  selectItemsForState,
} from "./self-care-list";
import type { SelfCareItem, SelfCareItemKind, StateLevel } from "./types";

function item(
  id: string,
  kind: SelfCareItemKind,
  stateLevels: StateLevel[]
): SelfCareItem {
  return {
    id,
    title: `項目${id}`,
    kind,
    stateLevels,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

describe("matchesStateLevel", () => {
  it("状態を指定していない項目は、いつでも出す", () => {
    const anytime = item("1", "care", []);
    expect(matchesStateLevel(anytime, null)).toBe(true);
    expect(matchesStateLevel(anytime, "good")).toBe(true);
    expect(matchesStateLevel(anytime, "hard")).toBe(true);
  });

  it("状態を指定した項目は、その状態の日にだけ出す", () => {
    const onlyHard = item("1", "avoid", ["hard"]);
    expect(matchesStateLevel(onlyHard, "hard")).toBe(true);
    expect(matchesStateLevel(onlyHard, "normal")).toBe(false);
    expect(matchesStateLevel(onlyHard, "good")).toBe(false);
  });

  it("状態が未選択の日は、指定つきの項目を出さない", () => {
    expect(matchesStateLevel(item("1", "avoid", ["hard"]), null)).toBe(false);
  });
});

describe("selectItemsForState", () => {
  const items = [
    item("care-any", "care", []),
    item("care-hard", "care", ["hard"]),
    item("avoid-good", "avoid", ["good"]),
    item("avoid-any", "avoid", []),
  ];

  it("種別で分けて返す", () => {
    expect(selectItemsForState(items, "care", null).map((i) => i.id)).toEqual([
      "care-any",
    ]);
    expect(selectItemsForState(items, "avoid", null).map((i) => i.id)).toEqual([
      "avoid-any",
    ]);
  });

  it("状態に合う項目だけを足す", () => {
    expect(selectItemsForState(items, "care", "hard").map((i) => i.id)).toEqual([
      "care-any",
      "care-hard",
    ]);
    expect(selectItemsForState(items, "avoid", "good").map((i) => i.id)).toEqual(
      ["avoid-good", "avoid-any"]
    );
  });

  it("登録順を変えない", () => {
    expect(selectItemsForState(items, "avoid", "good").map((i) => i.id)).toEqual(
      ["avoid-good", "avoid-any"]
    );
  });
});

describe("selectCareItemsForRecord", () => {
  const items = [
    item("any", "care", []),
    item("hard-only", "care", ["hard"]),
    item("avoid", "avoid", []),
  ];

  it("控えたいことは、できたことの候補に混ぜない", () => {
    expect(
      selectCareItemsForRecord(items, null, []).map((i) => i.id)
    ).toEqual(["any"]);
  });

  it("状態を選び直しても、その日に選んである項目は残す", () => {
    // 「しんどい」で選んだあと「よい」に変えても、選択済みの項目は画面から消えない
    expect(
      selectCareItemsForRecord(items, "good", ["hard-only"]).map((i) => i.id)
    ).toEqual(["any", "hard-only"]);
  });
});

describe("describeStateLevels", () => {
  it("指定がなければ「いつでも」と示す", () => {
    expect(describeStateLevels([])).toBe("いつでも");
  });

  it("選んだ順にかかわらず、よい・ふつう・しんどい の並びで示す", () => {
    expect(describeStateLevels(["hard", "good"])).toBe("よい日・しんどい日");
  });

  it("1つだけの指定も示す", () => {
    expect(describeStateLevels(["hard"])).toBe("しんどい日");
  });
});

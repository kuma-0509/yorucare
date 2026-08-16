import { describe, expect, it } from "vitest";
import {
  createDemoTokyoAdapter,
  createTokyoOpenDataAdapter,
  PLANNED_TOKYO_DATASETS,
} from "./adapter";
import { listMunicipalities, searchSupportResources } from "./search";
import { isPubliclyUsable, type SupportResource } from "./types";

const demoSource = {
  provider: "テスト",
  datasetName: "テスト用",
  updatedAt: null,
  kind: "demo",
  permissionBasis: "demoOnly",
} as const;

function makeResource(overrides: Partial<SupportResource>): SupportResource {
  return {
    id: "r",
    name: "窓口",
    category: "mentalHealth",
    description: "テスト",
    prefecture: "東京都",
    consultationMethod: ["phone"],
    availableDays: [1, 2, 3, 4, 5],
    openingTime: "09:00",
    closingTime: "17:00",
    source: demoSource,
    ...overrides,
  };
}

/** 2026-08-05 は水曜 */
function at(day: number, hour: number): Date {
  return new Date(2026, 7, day, hour);
}

describe("支援先の並び順", () => {
  it("受付中の支援先が、受付時間外より先に並ぶ", () => {
    const open = makeResource({ id: "open", openingTime: "09:00", closingTime: "17:00" });
    const closed = makeResource({ id: "closed", openingTime: "18:00", closingTime: "21:00" });

    const items = searchSupportResources([closed, open], {}, at(5, 10));
    expect(items.map((item) => item.resource.id)).toEqual(["open", "closed"]);
  });

  it("「今すぐ」を選ぶと、24時間対応が先頭に来る", () => {
    const open = makeResource({ id: "open" });
    const always = makeResource({
      id: "always",
      is24Hours: true,
      availableDays: undefined,
      openingTime: undefined,
      closingTime: undefined,
    });

    const items = searchSupportResources(
      [open, always],
      { urgency: "now" },
      at(5, 10)
    );
    expect(items[0].resource.id).toBe("always");
  });

  it("緊急度で絞り込まず、受付時間外の支援先も候補として残す", () => {
    const closed = makeResource({ id: "closed", availableDays: [0] });
    const items = searchSupportResources([closed], { urgency: "now" }, at(5, 10));
    expect(items).toHaveLength(1);
  });

  it("市区町村を選ぶと、他の市区町村の支援先は候補から外れる", () => {
    const shinjuku = makeResource({ id: "shinjuku", municipality: "新宿区" });
    const setagaya = makeResource({ id: "setagaya", municipality: "世田谷区" });
    const wide = makeResource({ id: "wide" });

    const items = searchSupportResources(
      [setagaya, wide, shinjuku],
      { municipality: "新宿区" },
      at(5, 10)
    );
    expect(items.map((item) => item.resource.id)).toEqual(["shinjuku", "wide"]);
  });

  it("相談方法で絞り込める", () => {
    const phone = makeResource({ id: "phone", consultationMethod: ["phone"] });
    const online = makeResource({ id: "online", consultationMethod: ["online"] });

    const items = searchSupportResources(
      [phone, online],
      { method: "online" },
      at(5, 10)
    );
    expect(items.map((item) => item.resource.id)).toEqual(["online"]);
  });

  it("選んだ相談内容が、同じ受付状況のなかで先に並ぶ", () => {
    const mental = makeResource({ id: "mental", category: "mentalHealth" });
    const welfare = makeResource({ id: "welfare", category: "welfare" });

    const items = searchSupportResources(
      [welfare, mental],
      {},
      at(5, 10)
    );
    // 条件を選んでいなければ id 昇順で安定する
    expect(items.map((item) => item.resource.id)).toEqual(["mental", "welfare"]);
  });

  it("受付時間外の支援先には、次回受付日時が付く", () => {
    const closed = makeResource({ id: "closed", availableDays: [1] });
    const items = searchSupportResources([closed], {}, at(5, 10));
    expect(items[0].availability.isOpenNow).toBe(false);
    expect(items[0].availability.nextOpening?.openingTime).toBe("09:00");
  });

  it("同じ条件なら並び順が毎回同じになる", () => {
    const resources = [
      makeResource({ id: "b" }),
      makeResource({ id: "a" }),
      makeResource({ id: "c" }),
    ];
    const first = searchSupportResources(resources, {}, at(5, 10));
    const second = searchSupportResources([...resources].reverse(), {}, at(5, 10));
    expect(first.map((i) => i.resource.id)).toEqual(
      second.map((i) => i.resource.id)
    );
  });
});

describe("市区町村の一覧", () => {
  it("データに入っている市区町村だけを返す", () => {
    const resources = [
      makeResource({ id: "a", municipality: "世田谷区" }),
      makeResource({ id: "b", municipality: "新宿区" }),
      makeResource({ id: "c" }),
      makeResource({ id: "d", municipality: "新宿区" }),
    ];
    expect([...listMunicipalities(resources)].sort()).toEqual([
      "世田谷区",
      "新宿区",
    ]);
    expect(listMunicipalities(resources)).toHaveLength(2);
  });
});

describe("デモデータ", () => {
  it("読み込めて、デモとして出典が付いている", async () => {
    const result = await createDemoTokyoAdapter().loadResources();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBeGreaterThan(0);
    for (const resource of result.value) {
      expect(resource.source.kind).toBe("demo");
    }
  });

  it("架空の電話番号とURLを持たない", async () => {
    const result = await createDemoTokyoAdapter().loadResources();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const resource of result.value) {
      expect(resource.phone).toBeUndefined();
      expect(resource.websiteUrl).toBeUndefined();
    }
  });

  it("すべて東京都のデータで、デモと分かる名称になっている", async () => {
    const result = await createDemoTokyoAdapter().loadResources();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const resource of result.value) {
      expect(resource.prefecture).toBe("東京都");
      expect(resource.name).toContain("デモ");
    }
  });
});

describe("利用の根拠", () => {
  const dataset = (
    permissionBasis: string,
    kind: "demo" | "official" = "official"
  ) => ({
    source: {
      provider: "東京都",
      datasetName: "テスト用",
      updatedAt: "2026-08-01",
      kind,
      permissionBasis,
    },
    resources: [
      {
        id: "x",
        name: "窓口",
        category: "mentalHealth",
        description: "テスト",
        prefecture: "東京都",
        consultationMethod: ["phone"],
      },
    ],
  });

  const load = (raw: unknown) =>
    createTokyoOpenDataAdapter(
      {
        provider: "東京都",
        datasetName: "テスト用",
        updatedAt: "2026-08-01",
        kind: "official",
        permissionBasis: "unverified",
      },
      async () => raw
    ).loadResources();

  it("利用条件を確認していないデータは読み込まない", async () => {
    const result = await load(dataset("unverified"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PERMISSION_UNCONFIRMED");
  });

  it("許諾が必要でまだ得ていないデータは読み込まない", async () => {
    const result = await load(dataset("permissionRequired"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PERMISSION_UNCONFIRMED");
  });

  it("オープンデータとして公開されているデータは読み込める", async () => {
    const result = await load(dataset("openDataCatalog"));
    expect(result.ok).toBe(true);
  });

  it("許諾を得たデータは読み込める", async () => {
    const result = await load(dataset("permissionGranted"));
    expect(result.ok).toBe(true);
  });

  it("実データにデモ用の根拠を付け替えても通さない", async () => {
    const result = await load(dataset("demoOnly", "official"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PERMISSION_UNCONFIRMED");
  });

  it("デモデータは、外部データを含まない根拠を持つ", async () => {
    const adapter = createDemoTokyoAdapter();
    expect(adapter.dataSource.permissionBasis).toBe("demoOnly");
  });

  it("接続予定のデータは、確認できるまで unverified のままにする", () => {
    expect(PLANNED_TOKYO_DATASETS.length).toBeGreaterThan(0);
    for (const dataset of PLANNED_TOKYO_DATASETS) {
      expect(isPubliclyUsable(dataset.permissionBasis)).toBe(false);
    }
  });
});

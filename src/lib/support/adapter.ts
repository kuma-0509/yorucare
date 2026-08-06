import { z } from "zod";
import demoDataset from "./data/tokyo-support-resources.demo.json";
import type {
  DataSource,
  SupportDataError,
  SupportResource,
} from "./types";
import { err, ok, type Result } from "../result";

/**
 * 外部公開データの取り込み口。
 *
 * 東京都オープンデータの実URLとAPI仕様は本実装時点で確認できていない。
 * 確認できていない接続先を推測して実装すると、動かないだけでなく、
 * 誤った窓口情報を画面へ出す危険がある。
 * そのため MVP はローカルJSONのデモデータで動かし、
 * 実データへは後からアダプターを差し替えて接続する。
 *
 * このモジュールは本人の記録（`src/lib/repository.ts`）を読まない。
 */

const dataSourceSchema = z.object({
  provider: z.string().min(1),
  datasetName: z.string().min(1),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  referenceUrl: z.url().optional(),
  kind: z.enum(["demo", "official"]),
  license: z.string().optional(),
});

const resourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    "emergency",
    "nightConsultation",
    "mentalHealth",
    "medical",
    "welfare",
    "employment",
    "developmentalDisability",
  ]),
  description: z.string().min(1),
  prefecture: z.string().min(1),
  municipality: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  websiteUrl: z.url().optional(),
  consultationMethod: z.array(z.enum(["phone", "online", "inPerson"])).min(1),
  targetUsers: z.array(z.string().min(1)).optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  is24Hours: z.boolean().optional(),
  reservationRequired: z.boolean().optional(),
});

const datasetSchema = z.object({
  source: dataSourceSchema,
  resources: z.array(resourceSchema),
});

/**
 * デモデータに実在しない電話番号・URLを持たせない。
 * 架空の番号を置くと、画面のどこかで本物として扱われる余地が残る。
 */
const demoContactSchema = resourceSchema.refine(
  (value) => value.phone === undefined && value.websiteUrl === undefined,
  { message: "デモデータは電話番号とURLを持たない" }
);

export interface SupportResourceAdapter {
  /** アダプターの識別子。将来の切り替え先を見分けるために持つ */
  readonly id: string;
  /** このアダプターが返すデータの出典 */
  readonly dataSource: DataSource;
  loadResources(): Promise<Result<SupportResource[], SupportDataError>>;
}

function parseDataset(
  raw: unknown
): Result<SupportResource[], SupportDataError> {
  const parsed = datasetSchema.safeParse(raw);
  if (!parsed.success) {
    return err({
      code: "PARSE_FAILED",
      message: "支援先データの形式が想定と違うため読み込めませんでした。",
    });
  }

  const source = parsed.data.source;
  if (source.kind === "demo") {
    for (const resource of parsed.data.resources) {
      if (!demoContactSchema.safeParse(resource).success) {
        return err({
          code: "PARSE_FAILED",
          message: "デモデータに連絡先が含まれているため読み込みを止めました。",
        });
      }
    }
  }

  return ok(parsed.data.resources.map((resource) => ({ ...resource, source })));
}

/** ローカルJSONのデモデータを返すアダプター */
export function createDemoTokyoAdapter(): SupportResourceAdapter {
  const source = dataSourceSchema.parse(demoDataset.source);
  return {
    id: "demo-tokyo-local-json",
    dataSource: source,
    async loadResources() {
      return parseDataset(demoDataset);
    },
  };
}

/**
 * 将来の接続先として想定しているデータセット。
 *
 * 実URLとAPI仕様が確認できていないため、ここにURLは書かない。
 * 接続作業のときに、公式のカタログで確認した値を入れる。
 */
export type PlannedDataset = {
  provider: string;
  datasetName: string;
  /** このデータセットで満たしたい画面上の役割 */
  usedFor: string;
};

export const PLANNED_TOKYO_DATASETS: PlannedDataset[] = [
  {
    provider: "東京都",
    datasetName: "相談窓口・保健所・精神保健福祉センター一覧",
    usedFor: "市区町村・相談内容・相談方法で絞り込む支援先の一覧",
  },
  {
    provider: "東京都",
    datasetName: "TOKYO WALKING MAP",
    usedFor: "近所を歩く選択肢の、実在するコース情報",
  },
  {
    provider: "東京都",
    datasetName: "都立公園・庭園一覧",
    usedFor: "公園への散歩という選択肢の、実在する行き先",
  },
  {
    provider: "東京都",
    datasetName: "都立スポーツ施設一覧",
    usedFor: "近隣スポーツ施設という選択肢の、実在する行き先",
  },
];

/**
 * 実データ用アダプターの受け口。
 *
 * 接続先が確定するまでは呼び出しても失敗を返す。
 * 「まだ接続していない」ことを型と戻り値で表し、
 * 推測したURLで動くように見せかけない。
 */
export function createTokyoOpenDataAdapter(
  dataSource: DataSource,
  fetchDataset: () => Promise<unknown>
): SupportResourceAdapter {
  return {
    id: "tokyo-open-data",
    dataSource,
    async loadResources() {
      try {
        return parseDataset(await fetchDataset());
      } catch {
        return err({
          code: "SOURCE_UNAVAILABLE",
          message: "支援先データを取得できませんでした。",
        });
      }
    },
  };
}

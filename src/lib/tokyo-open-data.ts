import facilityData from "@/data/tokyo-support-facilities.json";

export type TokyoSupportDatasetKey =
  | "specialWards"
  | "municipalities"
  | "coreCities";

export interface TokyoSupportFacility {
  municipality: string;
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  source: TokyoSupportDatasetKey;
}

export const TOKYO_OPEN_DATASETS = {
  specialWards: {
    title: "特別区保健所・保健センター一覧",
    href: "https://catalog.data.metro.tokyo.lg.jp/dataset/t000055d0000000401",
  },
  municipalities: {
    title: "市町村保健センター一覧",
    href: "https://catalog.data.metro.tokyo.lg.jp/dataset/t000055d0000000399",
  },
  coreCities: {
    title: "中核市・政令市保健所・保健センター一覧",
    href: "https://catalog.data.metro.tokyo.lg.jp/dataset/t000055d0000000400",
  },
  welfareSurvey: {
    title: "令和6年度東京都福祉保健基礎調査",
    href: "https://catalog.data.metro.tokyo.lg.jp/dataset/t000054d0000000398",
  },
} as const;

/**
 * 東京都オープンデータのCSVをUTF-8へ変換し、ビルド時の静的データとして同梱する。
 * 位置情報や入力内容を外部へ送らず、端末内だけで地域を絞り込めるようにする。
 */
export const TOKYO_SUPPORT_FACILITIES =
  facilityData as TokyoSupportFacility[];

export const TOKYO_MUNICIPALITIES = Array.from(
  new Set(TOKYO_SUPPORT_FACILITIES.map((facility) => facility.municipality))
).sort((left, right) => left.localeCompare(right, "ja"));

export const TOKYO_WELFARE_SURVEY_CONTEXT = {
  year: "令和6年度",
  respondents: 2_658,
  frequentOrOccasionalStressPercent: 70.7,
  description:
    "20歳以上の回答者の70.7%が、悩みやストレスが「よくある」または「たまにある」と回答しました。",
} as const;

export function findTokyoSupportFacilities(municipality: string) {
  if (!municipality) {
    return [];
  }

  return TOKYO_SUPPORT_FACILITIES.filter(
    (facility) => facility.municipality === municipality
  );
}

export function toTelephoneHref(phoneNumber: string) {
  return `tel:${getTelephoneNumber(phoneNumber).replace(/\D/g, "")}`;
}

/** CSV内に担当課の注記が続く場合も、画面と発信先には電話番号だけを使う */
export function getTelephoneNumber(phoneNumberWithNote: string) {
  return phoneNumberWithNote.match(/^\d[\d-]*/)?.[0] ?? phoneNumberWithNote;
}

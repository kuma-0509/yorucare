/**
 * 外部公開データ（相談・医療・福祉機関）の型。
 *
 * このディレクトリ配下は、本人の記録（`src/lib/repository.ts` 配下）を読まない。
 * 個人の記録と外部公開データを同じ層に置くと、
 * 「記録の内容に応じて表示する窓口を変える」実装が書けてしまう。
 * ヨルケアは入力内容から危険度・緊急度を推定しないため、
 * その経路自体をモジュール境界として塞ぐ。
 *
 * 緊急度は本人が選ぶ（`SupportUrgency`）。アプリは判定しない。
 */

export type SupportCategory =
  /** 命や身体に差し迫った危険 */
  | "emergency"
  /** 夜間・休日の相談 */
  | "nightConsultation"
  /** こころの健康 */
  | "mentalHealth"
  /** 医療機関 */
  | "medical"
  /** 福祉窓口 */
  | "welfare"
  /** 就労・生活 */
  | "employment"
  /** 発達障害 */
  | "developmentalDisability";

export type ConsultationMethod = "phone" | "online" | "inPerson";

/** 本人が選ぶ「いつ相談したいか」。アプリが記録から推定するものではない */
export type SupportUrgency = "now" | "today" | "withinDays";

/** デモデータか、出典を確認した実データか */
export type DataSourceKind = "demo" | "official";

/**
 * そのデータを使ってよい根拠。
 *
 * 一般公開されるプロトタイプでは、出典を書けば使えるわけではない。
 * 「引用」として許諾不要にできるのは、引用部分があくまで補足である場合に限る。
 * 施設情報を検索の中核コンテンツとして使う本アプリは引用に当たらないため、
 * 掲載元のライセンスか個別の許諾が要る。
 *
 * 根拠を任意の文字列ではなく閉じた集合にして、
 * 「たぶん大丈夫」で実データを載せられないようにする。
 */
export type DataPermissionBasis =
  /** オープンデータカタログ掲載、またはCCライセンス等が明記され、許諾なく使える */
  | "openDataCatalog"
  /** 掲載元へ個別に申請し、許諾を得た */
  | "permissionGranted"
  /** 許諾が必要だと分かっているが、まだ得られていない */
  | "permissionRequired"
  /** 掲載元の利用条件をまだ確認していない */
  | "unverified"
  /** 外部データを含まないデモデータ */
  | "demoOnly";

/**
 * 一般公開してよい根拠かどうか。
 *
 * 判定を1か所に閉じ込め、呼び出し側で条件を書き直せないようにする。
 */
export function isPubliclyUsable(basis: DataPermissionBasis): boolean {
  return (
    basis === "openDataCatalog" ||
    basis === "permissionGranted" ||
    basis === "demoOnly"
  );
}

/**
 * 外部データの出典。
 * すべての外部データに必ず持たせ、画面の「データについて」で開示する。
 */
export type DataSource = {
  /** 提供者（例: 東京都、区市町村、省庁） */
  provider: string;
  /** データセット名 */
  datasetName: string;
  /** 更新日 YYYY-MM-DD。確認できていないときは null */
  updatedAt: string | null;
  /** 参照URL。確認できていないときは持たせない */
  referenceUrl?: string;
  kind: DataSourceKind;
  /**
   * 使ってよい根拠。任意ではなく必須にする。
   * 省略できると、根拠を確かめないまま実データを載せる実装ができてしまう。
   */
  permissionBasis: DataPermissionBasis;
  /** オープンデータのライセンス表記が必要な場合に入れる */
  license?: string;
};

/**
 * 相談・医療・福祉機関の1件。
 *
 * MVP では `latitude` / `longitude` / `address` を持たない。
 * 距離順の並べ替えは現在地の取得を伴い、確認できていない位置情報を
 * 画面に出すことにもなるため、市区町村の一致までで扱う。
 */
export type SupportResource = {
  id: string;
  name: string;
  category: SupportCategory;
  description: string;
  prefecture: string;
  /** 市区町村。都全域が対象の窓口では持たない */
  municipality?: string;
  /** 出典を確認できた番号だけを持つ。デモデータは持たない */
  phone?: string;
  /** 出典を確認できたURLだけを持つ。デモデータは持たない */
  websiteUrl?: string;
  consultationMethod: ConsultationMethod[];
  targetUsers?: string[];
  /** 受付曜日。0=日曜 〜 6=土曜（`Date.getDay()` と同じ） */
  availableDays?: number[];
  /** HH:MM */
  openingTime?: string;
  /** HH:MM。開始より小さい場合は日をまたぐ受付として扱う */
  closingTime?: string;
  is24Hours?: boolean;
  reservationRequired?: boolean;
  source: DataSource;
};

/** 外部データの読み込みで起きうる失敗。個人記録の StorageError とは分ける */
export type SupportDataError =
  | { code: "PARSE_FAILED"; message: string }
  | { code: "SOURCE_UNAVAILABLE"; message: string }
  | { code: "PERMISSION_UNCONFIRMED"; message: string };

export const SUPPORT_CATEGORY_ORDER: SupportCategory[] = [
  "emergency",
  "nightConsultation",
  "mentalHealth",
  "medical",
  "welfare",
  "employment",
  "developmentalDisability",
];

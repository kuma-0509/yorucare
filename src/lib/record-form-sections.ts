import { STORAGE_KEYS } from "./constants";
import { COPY } from "./copy";

/**
 * 記録画面（「書く」タブ）に出す項目の設定。
 *
 * 決めたこと（2026-08-21）:
 * - **既定はすべてOFF。** 実機テストで、初回から項目が多いと1〜2分で終わらないことが分かった。
 *   最初は日付・気分・睡眠・メモだけを出し、必要な項目は本人が足す。
 * - **端末内の設定として1つ持つ。** 記録データ側には持たせないので、日ごとに項目が変わらない。
 * - **OFFにしても記録は消さない。** 表示を止めるだけで、保存済みの内容はONに戻せばまた見える。
 * - 保存に失敗する環境（プライベートモード等）では、その回だけ既定（すべてOFF）として扱い、
 *   記録本体の読み書きには影響させない。
 */

/** カスタム入力で切り替えられる項目 */
export type RecordFormSectionKey =
  | "selfCareSuggestion"
  | "details"
  | "warningSign"
  | "doneToday"
  | "goal";

export type RecordFormSections = Record<RecordFormSectionKey, boolean>;

/** 設定画面に並べる順。記録画面へ出てくる順と揃える */
export const RECORD_FORM_SECTION_OPTIONS: {
  key: RecordFormSectionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "selfCareSuggestion",
    label: COPY.selfCareSuggestion.title,
    description: "今日の状態から、選べそうなことを並べます",
  },
  {
    key: "details",
    label: COPY.detailSection,
    description: "気分の詳しさ、気持ち、お薬の記録",
  },
  {
    key: "warningSign",
    label: COPY.warningSign,
    description: "いつもと違うしんどさを、段階とタグで残せます",
  },
  {
    key: "doneToday",
    label: COPY.doneToday,
    description: "「できること」から、その日にできたことを選べます",
  },
  {
    key: "goal",
    label: COPY.goal.sectionName,
    description: "翌日の小さな目標と、前日の目標のふりかえり",
  },
];

const SECTION_KEYS = RECORD_FORM_SECTION_OPTIONS.map((option) => option.key);

/** 端末内に設定がないときの既定。すべてOFF */
export const DEFAULT_RECORD_FORM_SECTIONS: RecordFormSections = {
  selfCareSuggestion: false,
  details: false,
  warningSign: false,
  doneToday: false,
  goal: false,
};

/** 設定が変わったことを、同じ画面の別の場所へ伝えるための合図 */
const CHANGE_EVENT = "yorucare:record-form-sections";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function toSections(value: unknown): RecordFormSections {
  const sections = { ...DEFAULT_RECORD_FORM_SECTIONS };
  if (typeof value !== "object" || value === null) return sections;
  const source = value as Record<string, unknown>;
  for (const key of SECTION_KEYS) {
    // 知らない値が入っていても、表示しない側に倒す
    if (source[key] === true) sections[key] = true;
  }
  return sections;
}

/** いま保存されている設定。未設定・読み取り不能ならすべてOFF */
export function getRecordFormSections(): RecordFormSections {
  if (!isBrowser()) return { ...DEFAULT_RECORD_FORM_SECTIONS };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.recordFormSections);
    if (!raw) return { ...DEFAULT_RECORD_FORM_SECTIONS };
    return toSections(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_RECORD_FORM_SECTIONS };
  }
}

/** 設定を保存する。保存できなくても例外は投げない */
export function saveRecordFormSections(sections: RecordFormSections): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(
      STORAGE_KEYS.recordFormSections,
      JSON.stringify(sections)
    );
  } catch {
    // 設定を保存できない環境でも、記録の読み書きは続けられるようにする
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * 1項目だけ切り替えて保存し、保存できた設定を返す。
 * 保存できない環境では画面の表示だけが変わらないよう、書いたあとに読み直す
 */
export function toggleRecordFormSection(
  key: RecordFormSectionKey,
  enabled: boolean
): RecordFormSections {
  saveRecordFormSections({ ...getRecordFormSections(), [key]: enabled });
  return getRecordFormSections();
}

/** 設定が変わったら呼び出す。戻り値を呼ぶと購読をやめる */
export function subscribeRecordFormSections(
  listener: (sections: RecordFormSections) => void
): () => void {
  if (!isBrowser()) return () => {};
  const handle = () => listener(getRecordFormSections());
  // 別のタブで変えた設定も、開いたままの画面へ反映する。
  // 記録の保存など、ほかの書き込みでは知らせない（書く画面を作り直さない）
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEYS.recordFormSections) {
      return;
    }
    handle();
  };
  window.addEventListener(CHANGE_EVENT, handle);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handle);
    window.removeEventListener("storage", handleStorage);
  };
}

/**
 * LLM が書いた文を、報告書へ差し込む前に検証する層。
 *
 * 報告書は穴埋め方式で、数値の穴はアプリが埋め、文章の穴だけを LLM が書く。
 * ただし「文章の穴だけ」でも、そこへ評価語・助言・診断に読める表現や、
 * アプリが確定させた数値と食い違う数が入れば、報告書全体の信頼が崩れる。
 *
 * この層は「穴の選択肢を定型に限る」方式の代わりに置いている。
 * 定型の選択肢だけにすると LLM の仕事が並べ替えだけになり、週次まとめと同じ
 * 定型ルールで足りてしまう。一方この検証層は、モデルやプロンプトを差し替えても
 * そのまま効く。プロンプトは守られる保証がないが、検証は保証になる。
 *
 * 検証に通らなかった穴は、呼び出し側が定型のフォールバック文へ差し替える。
 * 過剰に弾いても失うのは LLM の言い回しだけなので、判定は厳しい側に倒す。
 */

/**
 * 評価語・助言・診断・危機に読める語。
 *
 * 既存の禁止語テスト（`src/lib/self-care.test.ts`、`src/lib/ai/milestones.test.ts`、
 * `src/components/reflection/accumulation-card.test.tsx`、
 * `src/components/completion/completion-choice.test.tsx`）で固定している語を
 * 1か所へまとめ、LLM が書いた文にも同じ制約を掛ける。
 */
export const NARRATIVE_FORBIDDEN_WORDS = [
  // 本人の状態や記録の量を評価する語
  "すごい",
  "えらい",
  "順調",
  "好調",
  "改善",
  "悪化",
  "達成率",
  "サボ",
  "失敗",
  "途切れ",
  "できていません",
  "できませんでした",
  "がんばり",
  "頑張",
  "努力",
  // 次の行動を求める語
  // 「寝ましょう」のような言い換えも拾うため、語尾だけで判定する
  "ましょう",
  "ください",
  "べき",
  "必ず",
  "すぐに",
  "おすすめ",
  // 診断・治療・受療に読める語
  "症状",
  "診断",
  "治療",
  "治し",
  "受診",
  "医師",
  "主治医",
  "病院",
  "服用",
  "うつ",
  "障害",
  // 危機判定に読める語
  "危険",
  "危機",
  "自殺",
  "死",
  // 相関を因果として断定する語
  "効果",
  "原因",
  "せい",
] as const;

/** 1つの穴に許す最大文字数の既定値 */
export const NARRATIVE_MAX_LENGTH = 60;

export type NarrativeRejectReason =
  /** 空、または空白だけ */
  | "empty"
  /** 文字数の上限を超えた */
  | "tooLong"
  /** 改行や制御文字を含む。穴は1文だけを受け取る */
  | "controlCharacter"
  /** 数を含む。数値はアプリが埋めるので、LLM の文に数が出ること自体を認めない */
  | "containsNumber"
  /** 評価語・助言・診断・危機に読める語を含む */
  | "forbiddenWord"
  /** URL らしき文字列を含む。報告書から外部へ誘導しない */
  | "containsLink";

export type NarrativeVerdict =
  | { ok: true; text: string }
  | { ok: false; reason: NarrativeRejectReason; detail?: string };

/**
 * 数と読める文字。
 *
 * 漢数字まで弾くため「一日ずつ」のような自然な言い回しも落ちるが、
 * 落ちた穴は定型文へ差し替わるだけで、報告書の数値が壊れるより安全側になる。
 */
const NUMBER_PATTERN = /[0-9０-９一二三四五六七八九十百千万億割%％]/u;

/** 改行を含む制御文字 */
// eslint-disable-next-line no-control-regex
const CONTROL_PATTERN = /[\u0000-\u001F\u007F]/u;

const LINK_PATTERN = /(https?:\/\/|www\.|:\/\/|@[a-z0-9-]+\.)/iu;

/**
 * LLM が書いた1文を検証する。
 *
 * 通った場合だけ、前後の空白を落とした文字列を返す。
 */
export function verifyNarrative(
  text: string,
  maxLength: number = NARRATIVE_MAX_LENGTH
): NarrativeVerdict {
  if (typeof text !== "string") {
    return { ok: false, reason: "empty" };
  }

  if (CONTROL_PATTERN.test(text)) {
    return { ok: false, reason: "controlCharacter" };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "empty" };
  }

  if ([...trimmed].length > maxLength) {
    return { ok: false, reason: "tooLong" };
  }

  if (LINK_PATTERN.test(trimmed)) {
    return { ok: false, reason: "containsLink" };
  }

  if (NUMBER_PATTERN.test(trimmed)) {
    return { ok: false, reason: "containsNumber" };
  }

  const hit = NARRATIVE_FORBIDDEN_WORDS.find((word) => trimmed.includes(word));
  if (hit !== undefined) {
    return { ok: false, reason: "forbiddenWord", detail: hit };
  }

  return { ok: true, text: trimmed };
}

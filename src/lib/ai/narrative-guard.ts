/**
 * 報告書の穴へ入る文が、表現の制約を守っているかを確かめる層。
 *
 * ## この層は「保証」ではない。保証は穴の選択肢を閉じていること
 *
 * ここにあるのは禁止語の一覧による判定で、**挙げていない言い回しは通る**。
 * 例えば「肺炎です。」「薬を増やすと良いでしょう。」は、この判定を素通りする。
 * 禁止語を足し続けても、書かれ得る文のほうが必ず多いので、
 * **自由文を受け取ってこの層で濾す設計は、診断・治療の制約を担保できない。**
 *
 * そのため報告書の穴は、LLM に文を書かせず
 * **アプリが書いた候補（`ReportSlot.candidates`）から1つ選ばせる** 形にしてある。
 * 出せる文がアプリの書いたものに限られるので、
 * 渡していない主張が報告書へ入る経路が無い（`report-narrative.ts`）。
 *
 * ## ではこの層は何のためにあるか
 *
 * **候補そのものを検査するため。** 候補は人が書き足すので、
 * うっかり評価語や数値や助言を含んだ文が増えることがある。
 * `report.test.ts` は全候補がこの検証を通ることを固定しており、
 * 制約を破る候補を足すとテストが落ちる。
 *
 * 選ばれた文にも実行時にもう一度掛けている。候補を増やした人が
 * テストを通していない場合に、画面へ出る前で止めるため。
 */

/**
 * 評価語・助言・診断・危機に読める語。
 *
 * 既存の禁止語テスト（`src/lib/self-care.test.ts`、`src/lib/ai/milestones.test.ts`、
 * `src/components/reflection/accumulation-card.test.tsx`）で固定している語を
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
 * 穴へ入る1文を検証する。
 *
 * 通った場合だけ、前後の空白を落とした文字列を返す。
 * 上記のとおり、これは候補を検査するためのもので、
 * 自由文の安全性を保証するものではない。
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

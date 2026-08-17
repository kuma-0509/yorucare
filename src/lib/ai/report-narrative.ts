import {
  verifyNarrative,
  type NarrativeRejectReason,
} from "./narrative-guard";
import {
  buildReport,
  type Report,
  type ReportFact,
  type ReportSkeleton,
  type ReportSlotId,
} from "./report";

/**
 * 報告書の文章の穴を LLM に埋めてもらうための境界。
 *
 * ## 何を渡すか
 *
 * 渡すのは `buildReportSkeleton` が作った骨格だけとする。
 * つまり **報告書に実際に出る数値と見出しだけ** を渡し、それ以外は渡さない。
 * 生の記録、メモ本文、目標の文面、セルフケアの感想、復職日、日単位の履歴は
 * 一切含まれない（`docs/ai-consent-decision.md` 1節・3節）。
 * LLM は報告書に出ている以上のことを知らないので、
 * 報告書へ載せないと決めた項目について書きようがない。
 *
 * ## 何を渡さないか
 *
 * 保存・削除の手段は渡さない。ここにあるのは文章を受け取る経路だけで、
 * 書き込み系のツールは `tools.ts` にも存在しない。
 * 報告書の確定は本人のボタン操作に限る。
 *
 * ## 外部送信について
 *
 * 特定の外部 AI API へ記録内容を自動送信する実装は、
 * `docs/phase2-plan.md` 5節と `docs/sharing-decision.md` 12節により、
 * Gate 3 と別途のデータ取扱い判断が完了するまで行わない。
 * そのため **外部へ送る `NarrativeFiller` はこのリポジトリに同梱していない。**
 * ここで実装したのは、境界の型・依頼データの組み立て・戻り値の検証までで、
 * 送信そのものは差し替え可能な1つの関数として外に出してある。
 */

/** LLM へ渡す1つの穴の説明 */
export type NarrativeSlotRequest = {
  id: ReportSlotId;
  /** その穴で何を書くか */
  purpose: string;
  maxLength: number;
};

/** LLM へ渡す1つの節。報告書に出る数値と見出しだけを持つ */
export type NarrativeSectionRequest = {
  id: ReportSlotId;
  title: string;
  facts: ReportFact[];
};

export type NarrativeRequest = {
  /** 守らせたい制約。プロンプトへそのまま並べる */
  instructions: string[];
  range: { from: string; to: string };
  sections: NarrativeSectionRequest[];
  slots: NarrativeSlotRequest[];
};

/** LLM から受け取る1つの穴の答え */
export type NarrativeFill = {
  slotId: string;
  text: string;
};

/**
 * 穴を埋める実装。
 *
 * 外部 AI API を呼ぶ実装をここへ差し込むかどうかは、上記の Gate に従う。
 * 例外を投げても呼び出し側がすべて定型文へ落とすので、失敗は握りつぶさない。
 */
export type NarrativeFiller = (
  request: NarrativeRequest
) => Promise<NarrativeFill[]>;

/** 穴が定型文になった理由 */
export type NarrativeFallbackReason =
  /** LLM を呼んでいない */
  | "notRequested"
  /** filler が例外を投げた、または戻り値の形が違った */
  | "fillerFailed"
  /** その穴の答えが返ってこなかった */
  | "notFilled"
  /** 検証に落ちた */
  | NarrativeRejectReason;

export type NarrativeOutcome = {
  slotId: ReportSlotId;
  source: "llm" | "fallback";
  /** source が fallback のときだけ入る */
  reason?: NarrativeFallbackReason;
  /** 検証に落ちた語など、原因の手がかり */
  detail?: string;
};

export type FilledReport = {
  report: Report;
  /** どの穴が LLM 由来で、どの穴が定型文になったか */
  outcomes: NarrativeOutcome[];
};

/**
 * 外部 AI API への送信を有効にしてよいか。
 *
 * 既定で false のまま固定する。Gate 3 と別途のデータ取扱い判断が完了するまで
 * true にしない。環境変数では切り替えられないようにしてあるので、
 * 設定ミスで本番から送信が始まることはない。
 */
export function isExternalNarrativeEnabled(): boolean {
  return false;
}

/**
 * 現在使える filler を返す。
 *
 * 外部送信は上記のとおり無効で、端末内で文章を書く手段も持たないため、常に null。
 * null のときは全部の穴が定型文になる。
 */
export function resolveNarrativeFiller(): NarrativeFiller | null {
  if (!isExternalNarrativeEnabled()) return null;
  return null;
}

/**
 * LLM へ渡す依頼データを組み立てる。
 *
 * 制約は文章で伝えるが、守られる保証はプロンプトではなく
 * `verifyNarrative` の側に置く。
 */
export function buildNarrativeRequest(
  skeleton: ReportSkeleton
): NarrativeRequest {
  return {
    instructions: [
      "渡した数値と見出しだけを材料にして、節ごとに1文だけ書く。",
      "数を書かない。数値はアプリが埋めるので、文の中に数を出さない。",
      "本人の状態や記録の量を評価しない。良い・悪い・順調といった言い方をしない。",
      "次の行動をすすめない。助言や指示をしない。",
      "体調の見立て、治し方、危ないかどうかの判断を書かない。",
      "記録がない日を、抜けた日・できなかった日として書かない。",
      "渡していない事実を足さない。推測で補わない。",
      "改行を入れず、1文で終える。",
    ],
    range: skeleton.range,
    sections: skeleton.sections.map((section) => ({
      id: section.id,
      title: section.title,
      facts: section.facts.map((fact) => ({ ...fact })),
    })),
    slots: skeleton.sections.map((section) => ({
      id: section.slot.id,
      purpose: section.slot.purpose,
      maxLength: section.slot.maxLength,
    })),
  };
}

/** filler の戻り値を、穴ごとの文字列へ畳む。同じ穴が複数返ったら最初を使う */
function indexFills(fills: unknown): Map<string, string> | null {
  if (!Array.isArray(fills)) return null;
  const byId = new Map<string, string>();
  for (const fill of fills) {
    if (typeof fill !== "object" || fill === null) continue;
    const { slotId, text } = fill as Partial<NarrativeFill>;
    if (typeof slotId !== "string" || typeof text !== "string") continue;
    if (byId.has(slotId)) continue;
    byId.set(slotId, text);
  }
  return byId;
}

/**
 * 骨格の穴を埋めて報告書を作る。
 *
 * filler を渡さなければ、外部通信は起きず、すべての穴が定型文になる。
 * filler が返した文は1つずつ検証し、通らなかった穴だけ定型文へ差し替える。
 * 節ごとに独立して判定するので、1つ落ちても他の節の文は残る。
 */
export async function fillReport(
  skeleton: ReportSkeleton,
  filler?: NarrativeFiller | null
): Promise<FilledReport> {
  const base = buildReport(skeleton);

  if (!filler) {
    return {
      report: base,
      outcomes: base.sections.map((section) => ({
        slotId: section.id,
        source: "fallback" as const,
        reason: "notRequested" as const,
      })),
    };
  }

  let byId: Map<string, string> | null = null;
  try {
    byId = indexFills(await filler(buildNarrativeRequest(skeleton)));
  } catch {
    byId = null;
  }

  const outcomes: NarrativeOutcome[] = [];
  const sections = base.sections.map((section) => {
    const raw = byId?.get(section.slot.id);
    if (raw === undefined) {
      outcomes.push({
        slotId: section.id,
        source: "fallback",
        reason: byId === null ? "fillerFailed" : "notFilled",
      });
      return section;
    }

    const verdict = verifyNarrative(raw, section.slot.maxLength);
    if (!verdict.ok) {
      outcomes.push({
        slotId: section.id,
        source: "fallback",
        reason: verdict.reason,
        detail: verdict.detail,
      });
      return section;
    }

    outcomes.push({ slotId: section.id, source: "llm" });
    return {
      ...section,
      narrative: verdict.text,
      narrativeSource: "llm" as const,
    };
  });

  return { report: { ...base, sections }, outcomes };
}

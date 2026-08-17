import {
  verifyNarrative,
  type NarrativeRejectReason,
} from "./narrative-guard";
import {
  buildReport,
  type Report,
  type ReportFact,
  type ReportNarrativeCandidate,
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
 * ## LLM は文を書かず、候補を選ぶ
 *
 * 穴へ入る文はアプリが書き、LLM は候補の `id` を1つ返すだけとする。
 * 自由文を受け取って禁止語で濾す設計は採らない。禁止語の一覧は必ず取りこぼすので
 * （「肺炎です。」のような文が通ってしまう）、診断・治療・助言を出さないという
 * 制約を担保できない。**選択肢を閉じておけば、出せる文はアプリが書いたものだけになる。**
 *
 * `verifyNarrative` は候補そのものの検査として残し、選ばれた文にも実行時に掛ける。
 *
 * ## 何を渡さないか
 *
 * 保存・削除の手段は渡さない。ここにあるのは選択を受け取る経路だけで、
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
  /** その穴が何を述べるものか */
  purpose: string;
  maxLength: number;
  /** この中から1つ選ばせる。ここに無い文は報告書へ入らない */
  candidates: ReportNarrativeCandidate[];
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

/**
 * LLM から受け取る1つの穴の答え。
 *
 * 文そのものではなく候補の `id` を受け取る。
 * 自由文を受け取るフィールドを型に置かないことで、
 * アプリが書いていない文が報告書へ入る経路を無くす。
 */
export type NarrativeFill = {
  slotId: string;
  candidateId: string;
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
  /** 候補に無い id が返ってきた */
  | "unknownCandidate"
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
 * 制約は指示としても伝えるが、守られる保証はプロンプトではなく
 * 「候補の外の文は使えない」という形の側に置く。
 */
export function buildNarrativeRequest(
  skeleton: ReportSkeleton
): NarrativeRequest {
  return {
    instructions: [
      "節ごとに、渡した候補の中から最もあてはまる1つを選び、その id を返す。",
      "文を書かない。候補にない文は使えない。",
      "渡した数値と見出しだけを材料にして選ぶ。推測で補わない。",
      "本人の状態や記録の量を評価しない。",
      "記録がない日を、抜けた日・できなかった日として扱わない。",
      "迷ったときは、いちばん最初の候補を選ぶ。",
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
      candidates: section.slot.candidates.map((candidate) => ({ ...candidate })),
    })),
  };
}

/** filler の戻り値を、穴ごとの候補 id へ畳む。同じ穴が複数返ったら最初を使う */
function indexFills(fills: unknown): Map<string, string> | null {
  if (!Array.isArray(fills)) return null;
  const byId = new Map<string, string>();
  for (const fill of fills) {
    if (typeof fill !== "object" || fill === null) continue;
    const { slotId, candidateId } = fill as Partial<NarrativeFill>;
    if (typeof slotId !== "string" || typeof candidateId !== "string") continue;
    if (byId.has(slotId)) continue;
    byId.set(slotId, candidateId);
  }
  return byId;
}

/**
 * 骨格の穴を埋めて報告書を作る。
 *
 * filler を渡さなければ、外部通信は起きず、すべての穴が既定の文になる。
 * filler が返すのは候補の id だけで、候補に無い id と、検証に落ちた候補は
 * 既定の文へ差し替える。節ごとに独立して判定するので、
 * 1つ落ちても他の節の選択は残る。
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
    const chosenId = byId?.get(section.slot.id);
    if (chosenId === undefined) {
      outcomes.push({
        slotId: section.id,
        source: "fallback",
        reason: byId === null ? "fillerFailed" : "notFilled",
      });
      return section;
    }

    // 候補にない id は使わない。ここが「アプリが書いた文しか出ない」の要
    const chosen = section.slot.candidates.find(
      (candidate) => candidate.id === chosenId
    );
    if (chosen === undefined) {
      outcomes.push({
        slotId: section.id,
        source: "fallback",
        reason: "unknownCandidate",
        detail: chosenId,
      });
      return section;
    }

    // 候補は `report.test.ts` で検証済みだが、増やした人がテストを
    // 通していない場合に備えて実行時にももう一度掛ける
    const verdict = verifyNarrative(chosen.text, section.slot.maxLength);
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

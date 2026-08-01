import { enumerateDates, indexRecordsByDate } from "./range";
import type {
  DailyRecord,
  MedicationStatus,
  MoodScore,
  SelfCareItem,
  WarningLevel,
} from "../types";

/**
 * 日ごとの記録を、外部へ渡してよい形に落とした表現。
 *
 * 引き継ぎ時の設計では「期間内の生の記録」を返す予定だったが、
 * 生の記録には本人が書いたメモ本文が含まれる。
 * `docs/ai-consent-decision.md` の方針に従い、本文を持たない型として定義する。
 *
 * `selfCareIds` ではなくタイトルを持つのは、ID だけ渡してもLLMには意味がなく、
 * 辞書を引く往復が増えるため。
 */
export type DailyView = {
  date: string;
  /** その日の記録があったか。false のとき以下はすべて空になる */
  recorded: boolean;
  moodScore: MoodScore | null;
  /** 選択式のラベル。本人が書いた文章ではない */
  moodLabels: string[];
  sleepStart: string | null;
  sleepEnd: string | null;
  sleepMinutes: number | null;
  medication: MedicationStatus | null;
  warningLevel: WarningLevel | null;
  /** 選択式のタグ。本人が書いた文章ではない */
  warningTags: string[];
  /** 実行した「できること」のタイトル。辞書から消えた項目は除く */
  selfCareTitles: string[];
  /** メモ本文があったかどうかだけを返す。本文そのものは渡さない */
  hasMemo: boolean;
};

function emptyView(date: string): DailyView {
  return {
    date,
    recorded: false,
    moodScore: null,
    moodLabels: [],
    sleepStart: null,
    sleepEnd: null,
    sleepMinutes: null,
    medication: null,
    warningLevel: null,
    warningTags: [],
    selfCareTitles: [],
    hasMemo: false,
  };
}

/**
 * 期間内の記録を日ごとの表示用に整える。
 *
 * 記録がない日も `recorded: false` として返す。
 * 記録がある日だけを返すと、記録できないほどしんどかった日が
 * 期間そのものから消え、LLMが「その期間は何もなかった」と読む。
 */
export function buildDailyViews(
  records: DailyRecord[],
  selfCareItems: SelfCareItem[],
  from: string,
  to: string
): DailyView[] {
  const byDate = indexRecordsByDate(records, from, to);
  const titleById = new Map(selfCareItems.map((item) => [item.id, item.title]));

  return enumerateDates(from, to).map((date) => {
    const record = byDate.get(date);
    if (!record) return emptyView(date);

    return {
      date,
      recorded: true,
      moodScore: record.moodScore,
      moodLabels: record.moodLabels.map((label) => label.label),
      sleepStart: record.sleepStart,
      sleepEnd: record.sleepEnd,
      sleepMinutes: record.sleepMinutes,
      medication: record.medication,
      warningLevel: record.warningLevel,
      warningTags: [...record.warningTags],
      selfCareTitles: record.selfCareIds
        .map((id) => titleById.get(id))
        .filter((title): title is string => title !== undefined),
      hasMemo:
        record.note.length > 0 ||
        record.warningNote.length > 0 ||
        record.selfCareMemo.length > 0,
    };
  });
}

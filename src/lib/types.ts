export type MoodScore = 1 | 2 | 3 | 4 | 5;

export type MedicationStatus = "done" | "partial" | "forgot" | "none";

export type WarningLevel = "none" | "small" | "yes";

export type StateLevel = "good" | "normal" | "hard";

export type GoalReviewStatus = "done" | "partial" | "notDone";

/**
 * その日のセルフケアをやってみた感想。
 * 本人や結果の評価ではなく、その行動が自分に合ったかどうかだけを選ぶ。
 */
export type SelfCareFeeling = "good" | "neutral" | "notFit";

export type MoodLabelCategory =
  | "ポジティブ"
  | "ややポジティブ"
  | "普通"
  | "ややネガティブ"
  | "ネガティブ";

export interface MoodLabelEntry {
  label: string;
  category: MoodLabelCategory;
  isCustom: boolean;
}

export interface DailyRecord {
  id: string;
  date: string;
  moodScore: MoodScore | null;
  moodLabels: MoodLabelEntry[];
  sleepStart: string | null;
  sleepEnd: string | null;
  sleepMinutes: number | null;
  medication: MedicationStatus | null;
  warningLevel: WarningLevel | null;
  warningTags: string[];
  warningNote: string;
  selfCareIds: string[];
  selfCareMemo: string;
  /** その日のセルフケアの感想。選択式のみで、未選択なら null */
  selfCareFeeling: SelfCareFeeling | null;
  note: string;
  /** この日に決めた「翌日の小さな目標」。未設定なら空文字 */
  tomorrowGoal: string;
  /** 前日に決めた目標をこの日にふりかえった結果。未選択なら null */
  goalReviewStatus: GoalReviewStatus | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 登録簿の種別。
 * care: その日にやってみる「できること」。実施として記録に残せる。
 * avoid: その日は控えたいこと。実施可否を記録せず、思い出すためだけに表示する。
 */
export type SelfCareItemKind = "care" | "avoid";

export interface SelfCareItem {
  id: string;
  title: string;
  /** 種別。既定は "care" とし、種別を持たない保存データもそのまま読める */
  kind: SelfCareItemKind;
  /**
   * この項目を出す状態。本人が選ぶもので、アプリ側では推定しない。
   * 空配列は「状態を問わず出す」を意味する。
   */
  stateLevels: StateLevel[];
  createdAt: string;
  updatedAt: string;
}

export type AppTab = "today" | "records" | "selfcare" | "reflection";

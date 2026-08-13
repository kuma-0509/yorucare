export type MoodScore = 1 | 2 | 3 | 4 | 5;

export type MedicationStatus = "done" | "partial" | "forgot" | "none";

export type WarningLevel = "none" | "small" | "yes";

export type StateLevel = "good" | "normal" | "hard";

export type GoalReviewStatus = "done" | "partial" | "notDone";

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
  note: string;
  /** この日に決めた「翌日の小さな目標」。未設定なら空文字 */
  tomorrowGoal: string;
  /** 前日に決めた目標をこの日にふりかえった結果。未選択なら null */
  goalReviewStatus: GoalReviewStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface SelfCareItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type AppTab = "today" | "records" | "selfcare" | "reflection";

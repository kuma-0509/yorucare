export type MoodScore = 1 | 2 | 3 | 4 | 5;

export type MedicationStatus = "done" | "partial" | "forgot" | "none";

export type WarningLevel = "none" | "small" | "yes";

/** 前日に決めた小さな行動のふりかえり結果 */
export type GoalResult = "done" | "partial" | "missed";

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
  /** 次の日にためすと決めた小さな行動（""＝未設定） */
  goal: string;
  /** 前日に決めた行動のふりかえり結果 */
  goalResult: GoalResult | null;
  /** ふりかえった行動の文（前日の goal の写し。前日の記録が変わってもずれない） */
  goalReviewedText: string;
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

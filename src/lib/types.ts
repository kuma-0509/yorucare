export type MoodScore = 1 | 2 | 3 | 4 | 5;

export type MedicationStatus = "done" | "partial" | "forgot" | "none";

export type WarningLevel = "none" | "small" | "yes";

export interface DailyRecord {
  id: string;
  date: string;
  moodScore: MoodScore | null;
  moodLabels: string[];
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

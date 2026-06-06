import { STORAGE_KEYS } from "./constants";
import { getTodayString } from "./dates";

export type AnalyticsEventName =
  | "record_saved"
  | "first_record_saved"
  | "backup_exported"
  | "backup_imported"
  | "tab_viewed";

type AnalyticsEvent = {
  name: AnalyticsEventName;
  at: string;
  meta?: Record<string, string | number | boolean>;
};

type AnalyticsSnapshot = {
  events: AnalyticsEvent[];
  metrics: {
    totalSaves: number;
    uniqueRecordDays: string[];
    firstSaveAt: string | null;
    lastSaveAt: string | null;
  };
};

const MAX_EVENTS = 500;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readSnapshot(): AnalyticsSnapshot {
  const empty: AnalyticsSnapshot = {
    events: [],
    metrics: {
      totalSaves: 0,
      uniqueRecordDays: [],
      firstSaveAt: null,
      lastSaveAt: null,
    },
  };
  if (!isBrowser()) return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.analytics);
    if (!raw) return empty;
    return JSON.parse(raw) as AnalyticsSnapshot;
  } catch {
    return empty;
  }
}

function writeSnapshot(snapshot: AnalyticsSnapshot): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.analytics, JSON.stringify(snapshot));
  } catch {
    /* analytics must not break core flows */
  }
}

export function trackEvent(
  name: AnalyticsEventName,
  meta?: Record<string, string | number | boolean>
): void {
  if (!isBrowser()) return;

  const snapshot = readSnapshot();
  const at = new Date().toISOString();
  snapshot.events.push({ name, at, meta });
  if (snapshot.events.length > MAX_EVENTS) {
    snapshot.events = snapshot.events.slice(-MAX_EVENTS);
  }

  if (name === "record_saved" && typeof meta?.date === "string") {
    snapshot.metrics.totalSaves += 1;
    snapshot.metrics.lastSaveAt = at;
    if (!snapshot.metrics.firstSaveAt) {
      snapshot.metrics.firstSaveAt = at;
    }
    if (!snapshot.metrics.uniqueRecordDays.includes(meta.date)) {
      snapshot.metrics.uniqueRecordDays.push(meta.date);
    }
  }

  writeSnapshot(snapshot);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("yorucare:analytics", {
        detail: { name, at, meta },
      })
    );
  }
}

export function trackRecordSaved(date: string, isFirstEver: boolean): void {
  trackEvent("record_saved", { date });
  if (isFirstEver) {
    trackEvent("first_record_saved", { date });
  }
}

export function trackTabViewed(tab: string): void {
  trackEvent("tab_viewed", { tab });
}

export function getAnalyticsMetrics(): AnalyticsSnapshot["metrics"] {
  return readSnapshot().metrics;
}

/** 直近7日で記録した日数（パイロット確認用） */
export function getRecentSaveStreakHint(): {
  daysRecorded: number;
  savedToday: boolean;
} {
  const metrics = getAnalyticsMetrics();
  const today = getTodayString();
  const recent = new Set(metrics.uniqueRecordDays);
  return {
    daysRecorded: recent.size,
    savedToday: recent.has(today),
  };
}

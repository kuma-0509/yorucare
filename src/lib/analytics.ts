import { STORAGE_KEYS } from "./constants";
import { getTodayString } from "./dates";
import { hasAnalyticsConsent } from "./analytics-consent";
import type { AnalyticsEventName, AnalyticsTab } from "./analytics-events";

export type { AnalyticsEventName } from "./analytics-events";

/** 同一オリジンの収集エンドポイント（CSP connect-src 'self' で許可済み） */
const ANALYTICS_ENDPOINT = "/api/events";

/**
 * 端末ごとの匿名ID。Week 2 / Week 4 継続率をサーバ側で算出するために、
 * 個人を特定しない乱数IDを端末に1つだけ持つ。
 */
function getInstallId(): string {
  if (!isBrowser()) return "";
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.installId);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEYS.installId, id);
    return id;
  } catch {
    return "";
  }
}

function createEventId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 匿名イベントを同一オリジンのエンドポイントへ送る。
 * 本人が任意同意した場合だけ、許可済みの日付・タブ名・件数を載せる。
 * サーバ側では記録対象日を破棄し、入力本文は受け付けない。
 * 送信失敗はコア機能に影響させない（握りつぶす）。
 */
function sendToServer(event: {
  eventId: string;
  installId: string;
  name: AnalyticsEventName;
  at: string;
  meta?: Record<string, string | number | boolean>;
}): void {
  if (!isBrowser() || !event.installId || !hasAnalyticsConsent()) return;
  try {
    const body = JSON.stringify(event);
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
      return;
    }
    void fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must not break core flows */
  }
}

type AnalyticsEvent = {
  /** 旧版の端末内データには存在しないため optional */
  eventId?: string;
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
  const eventId = createEventId();
  snapshot.events.push({ eventId, name, at, meta });
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

  if (hasAnalyticsConsent()) {
    sendToServer({ eventId, installId: getInstallId(), name, at, meta });
  }

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

export function trackTabViewed(tab: AnalyticsTab): void {
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

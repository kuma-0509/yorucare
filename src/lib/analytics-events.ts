export const ANALYTICS_EVENT_NAMES = [
  "record_saved",
  "first_record_saved",
  "backup_exported",
  "backup_imported",
  "tab_viewed",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const ANALYTICS_TABS = [
  "today",
  "records",
  "selfcare",
  "reflection",
] as const;

export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

export type PersistedAnalyticsMeta =
  | { recordCount: number; selfCareCount: number }
  | { tab: AnalyticsTab }
  | Record<string, never>;

export type AcceptedAnalyticsEvent = {
  eventId: string;
  installId: string;
  name: AnalyticsEventName;
  occurredAt: string;
  meta: PersistedAnalyticsMeta;
};

type ParseSuccess<T> = { ok: true; value: T };
type ParseFailure = { ok: false };

export type AnalyticsParseResult<T> = ParseSuccess<T> | ParseFailure;

const EVENT_NAME_SET = new Set<string>(ANALYTICS_EVENT_NAMES);
const TAB_SET = new Set<string>(ANALYTICS_TABS);
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_COUNT = 100_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[]
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isIdentifier(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    IDENTIFIER_PATTERN.test(value)
  );
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime());
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function isSafeCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_COUNT
  );
}

function parseMeta(
  name: AnalyticsEventName,
  value: unknown
): AnalyticsParseResult<PersistedAnalyticsMeta> {
  if (name === "record_saved" || name === "first_record_saved") {
    if (
      !isPlainObject(value) ||
      !hasOnlyKeys(value, ["date"]) ||
      !isCalendarDate(value.date)
    ) {
      return { ok: false };
    }

    // 継続指標はサーバ受信日から算出するため、記録対象日は保存しない。
    return { ok: true, value: {} };
  }

  if (name === "backup_exported") {
    if (
      value !== undefined &&
      (!isPlainObject(value) || Object.keys(value).length > 0)
    ) {
      return { ok: false };
    }
    return { ok: true, value: {} };
  }

  if (name === "backup_imported") {
    if (
      !isPlainObject(value) ||
      !hasOnlyKeys(value, ["recordCount", "selfCareCount"]) ||
      Object.keys(value).length !== 2 ||
      !isSafeCount(value.recordCount) ||
      !isSafeCount(value.selfCareCount)
    ) {
      return { ok: false };
    }
    return {
      ok: true,
      value: {
        recordCount: value.recordCount,
        selfCareCount: value.selfCareCount,
      },
    };
  }

  if (
    !isPlainObject(value) ||
    !hasOnlyKeys(value, ["tab"]) ||
    Object.keys(value).length !== 1 ||
    typeof value.tab !== "string" ||
    !TAB_SET.has(value.tab)
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    value: { tab: value.tab as AnalyticsTab },
  };
}

export function parseAnalyticsEventPayload(
  payload: unknown
): AnalyticsParseResult<AcceptedAnalyticsEvent> {
  if (
    !isPlainObject(payload) ||
    !hasOnlyKeys(payload, ["eventId", "installId", "name", "at", "meta"]) ||
    !isIdentifier(payload.eventId, 100) ||
    !isIdentifier(payload.installId, 80) ||
    typeof payload.name !== "string" ||
    !EVENT_NAME_SET.has(payload.name) ||
    !isIsoTimestamp(payload.at)
  ) {
    return { ok: false };
  }

  const name = payload.name as AnalyticsEventName;
  const meta = parseMeta(name, payload.meta);
  if (!meta.ok) return meta;

  return {
    ok: true,
    value: {
      eventId: payload.eventId,
      installId: payload.installId,
      name,
      occurredAt: new Date(payload.at).toISOString(),
      meta: meta.value,
    },
  };
}

export function parseAnalyticsDeletionPayload(
  payload: unknown
): AnalyticsParseResult<{ installId: string }> {
  if (
    !isPlainObject(payload) ||
    !hasOnlyKeys(payload, ["installId"]) ||
    Object.keys(payload).length !== 1 ||
    !isIdentifier(payload.installId, 80)
  ) {
    return { ok: false };
  }

  return { ok: true, value: { installId: payload.installId } };
}

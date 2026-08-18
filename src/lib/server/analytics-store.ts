import { createHmac } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { AcceptedAnalyticsEvent } from "@/lib/analytics-events";
import { toJapanDate } from "@/lib/analytics-retention";

/**
 * このファイルは書き込みと削除だけを担う。
 * 継続指標の読み出しは `pnpm analytics:summary`（`scripts/analytics-summary.mjs`）
 * に置き、アプリ側からは公開しない。読み出す口を2つ持つと、同じ表に対して
 * 別々のクエリと数え方ができてしまう。
 */

const RETENTION_DAYS = 365;
const MINIMUM_SALT_LENGTH = 32;

let cachedConnection:
  | {
      databaseUrl: string;
      sql: NeonQueryFunction<false, false>;
    }
  | undefined;

export class AnalyticsStoreUnavailableError extends Error {
  constructor() {
    super("Anonymous analytics store is not configured.");
    this.name = "AnalyticsStoreUnavailableError";
  }
}

function getConfig(): { databaseUrl: string; salt: string } {
  const databaseUrl =
    process.env.ANALYTICS_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  const salt = process.env.ANALYTICS_ID_SALT ?? "";

  if (!databaseUrl || salt.length < MINIMUM_SALT_LENGTH) {
    throw new AnalyticsStoreUnavailableError();
  }

  return { databaseUrl, salt };
}

function getSql(databaseUrl: string): NeonQueryFunction<false, false> {
  if (!cachedConnection || cachedConnection.databaseUrl !== databaseUrl) {
    cachedConnection = {
      databaseUrl,
      sql: neon(databaseUrl),
    };
  }
  return cachedConnection.sql;
}

function hashIdentifier(identifier: string, salt: string): string {
  return createHmac("sha256", salt).update(identifier).digest("hex");
}

function deleteAfter(receivedAt: Date): string {
  return new Date(
    receivedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}

export async function saveAnonymousEvent(
  event: AcceptedAnalyticsEvent,
  receivedAt = new Date()
): Promise<void> {
  const { databaseUrl, salt } = getConfig();
  const sql = getSql(databaseUrl);
  const installIdHash = hashIdentifier(event.installId, salt);
  const eventIdHash = hashIdentifier(event.eventId, salt);
  const receivedAtIso = receivedAt.toISOString();
  const activityDate = toJapanDate(receivedAt);
  const metaJson = JSON.stringify(event.meta);

  await sql.transaction((transaction) => [
    transaction`
      WITH inserted_event AS (
        INSERT INTO anonymous_analytics_events (
          event_id_hash,
          install_id_hash,
          name,
          occurred_at,
          received_at,
          meta,
          delete_after
        )
        VALUES (
          ${eventIdHash},
          ${installIdHash},
          ${event.name},
          ${event.occurredAt},
          ${receivedAtIso},
          ${metaJson}::jsonb,
          ${deleteAfter(receivedAt)}
        )
        ON CONFLICT (event_id_hash) DO NOTHING
        RETURNING install_id_hash, name, received_at
      )
      INSERT INTO anonymous_analytics_record_days (
        install_id_hash,
        activity_date,
        first_received_at,
        last_received_at,
        save_count
      )
      SELECT
        install_id_hash,
        ${activityDate}::date,
        received_at,
        received_at,
        1
      FROM inserted_event
      WHERE name = 'record_saved'
      ON CONFLICT (install_id_hash, activity_date)
      DO UPDATE SET
        first_received_at = LEAST(
          anonymous_analytics_record_days.first_received_at,
          EXCLUDED.first_received_at
        ),
        last_received_at = GREATEST(
          anonymous_analytics_record_days.last_received_at,
          EXCLUDED.last_received_at
        ),
        save_count = anonymous_analytics_record_days.save_count + 1
    `,
    transaction`
      DELETE FROM anonymous_analytics_events
      WHERE delete_after <= ${receivedAtIso}
    `,
    transaction`
      DELETE FROM anonymous_analytics_record_days
      WHERE activity_date <= (
        ${activityDate}::date - ${RETENTION_DAYS}::integer
      )
    `,
  ]);
}

export async function deleteAnonymousInstallEvents(
  installId: string
): Promise<void> {
  const { databaseUrl, salt } = getConfig();
  const sql = getSql(databaseUrl);
  const installIdHash = hashIdentifier(installId, salt);

  await sql.transaction((transaction) => [
    transaction`
      DELETE FROM anonymous_analytics_events
      WHERE install_id_hash = ${installIdHash}
    `,
    transaction`
      DELETE FROM anonymous_analytics_record_days
      WHERE install_id_hash = ${installIdHash}
    `,
  ]);
}

export async function purgeExpiredAnonymousAnalytics(
  now = new Date()
): Promise<void> {
  const { databaseUrl } = getConfig();
  const sql = getSql(databaseUrl);
  const nowIso = now.toISOString();
  const activityDate = toJapanDate(now);

  await sql.transaction((transaction) => [
    transaction`
      DELETE FROM anonymous_analytics_events
      WHERE delete_after <= ${nowIso}
    `,
    transaction`
      DELETE FROM anonymous_analytics_record_days
      WHERE activity_date <= (
        ${activityDate}::date - ${RETENTION_DAYS}::integer
      )
    `,
  ]);
}

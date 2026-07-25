import { describe, expect, it } from "vitest";
import {
  parseAnalyticsDeletionPayload,
  parseAnalyticsEventPayload,
} from "./analytics-events";

const baseEvent = {
  eventId: "550e8400-e29b-41d4-a716-446655440000",
  installId: "install-123",
  name: "record_saved",
  at: "2026-07-25T12:00:00.000Z",
  meta: { date: "2026-07-25" },
};

describe("parseAnalyticsEventPayload", () => {
  it("accepts an allowed event and drops an unnecessary record date", () => {
    const result = parseAnalyticsEventPayload(baseEvent);

    expect(result).toEqual({
      ok: true,
      value: {
        eventId: baseEvent.eventId,
        installId: baseEvent.installId,
        name: "record_saved",
        occurredAt: baseEvent.at,
        meta: {},
      },
    });
  });

  it("accepts only allowlisted metadata for each event", () => {
    expect(
      parseAnalyticsEventPayload({
        ...baseEvent,
        name: "tab_viewed",
        meta: { tab: "reflection" },
      }).ok
    ).toBe(true);

    expect(
      parseAnalyticsEventPayload({
        ...baseEvent,
        name: "backup_imported",
        meta: { recordCount: 12, selfCareCount: 3 },
      }).ok
    ).toBe(true);
  });

  it("rejects unknown events, tabs, and metadata keys", () => {
    expect(
      parseAnalyticsEventPayload({ ...baseEvent, name: "note_viewed" }).ok
    ).toBe(false);
    expect(
      parseAnalyticsEventPayload({
        ...baseEvent,
        name: "tab_viewed",
        meta: { tab: "admin" },
      }).ok
    ).toBe(false);
    expect(
      parseAnalyticsEventPayload({
        ...baseEvent,
        meta: { date: "2026-07-25", note: "送信しない" },
      }).ok
    ).toBe(false);
  });

  it("rejects malformed identifiers, dates, timestamps, and counts", () => {
    expect(
      parseAnalyticsEventPayload({ ...baseEvent, installId: "id with spaces" })
        .ok
    ).toBe(false);
    expect(
      parseAnalyticsEventPayload({
        ...baseEvent,
        meta: { date: "2026-02-30" },
      }).ok
    ).toBe(false);
    expect(
      parseAnalyticsEventPayload({ ...baseEvent, at: "not-a-date" }).ok
    ).toBe(false);
    expect(
      parseAnalyticsEventPayload({
        ...baseEvent,
        name: "backup_imported",
        meta: { recordCount: -1, selfCareCount: 0 },
      }).ok
    ).toBe(false);
  });
});
describe("parseAnalyticsDeletionPayload", () => {
  it("accepts only an install identifier", () => {
    expect(parseAnalyticsDeletionPayload({ installId: "install-123" })).toEqual({
      ok: true,
      value: { installId: "install-123" },
    });
    expect(
      parseAnalyticsDeletionPayload({
        installId: "install-123",
        participantId: "not-allowed",
      }).ok
    ).toBe(false);
  });
});

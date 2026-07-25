import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DELETE, POST } from "./route";

const validEvent = {
  eventId: "550e8400-e29b-41d4-a716-446655440000",
  installId: "install-123",
  name: "record_saved",
  at: "2026-07-25T12:00:00.000Z",
  meta: { date: "2026-07-25" },
};

function jsonRequest(
  method: "POST" | "DELETE",
  body: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request("https://yorucare.example/api/events", {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://yorucare.example",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("/api/events", () => {
  const originalAnalyticsDatabaseUrl = process.env.ANALYTICS_DATABASE_URL;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSalt = process.env.ANALYTICS_ID_SALT;

  beforeEach(() => {
    delete process.env.ANALYTICS_DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.ANALYTICS_ID_SALT;
  });

  afterEach(() => {
    if (originalAnalyticsDatabaseUrl === undefined) {
      delete process.env.ANALYTICS_DATABASE_URL;
    } else {
      process.env.ANALYTICS_DATABASE_URL = originalAnalyticsDatabaseUrl;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    if (originalSalt === undefined) {
      delete process.env.ANALYTICS_ID_SALT;
    } else {
      process.env.ANALYTICS_ID_SALT = originalSalt;
    }
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(
      jsonRequest("POST", validEvent, { Origin: "https://example.com" })
    );

    expect(response.status).toBe(403);
  });

  it("rejects non-JSON and oversized requests", async () => {
    const nonJson = new Request("https://yorucare.example/api/events", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    });
    expect((await POST(nonJson)).status).toBe(415);

    const oversized = jsonRequest("POST", {
      ...validEvent,
      extra: "x".repeat(5_000),
    });
    expect((await POST(oversized)).status).toBe(413);
  });

  it("rejects fields outside the allowlist before touching the store", async () => {
    const response = await POST(
      jsonRequest("POST", {
        ...validEvent,
        meta: { date: "2026-07-25", note: "送信してはいけない内容" },
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 503 without DB configuration and never falls back to logs", async () => {
    const response = await POST(jsonRequest("POST", validEvent));

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it("validates deletion payloads before touching the store", async () => {
    const invalid = await DELETE(
      jsonRequest("DELETE", {
        installId: "install-123",
        participantId: "not-allowed",
      })
    );
    expect(invalid.status).toBe(400);

    const unavailable = await DELETE(
      jsonRequest("DELETE", { installId: "install-123" })
    );
    expect(unavailable.status).toBe(503);
  });
});

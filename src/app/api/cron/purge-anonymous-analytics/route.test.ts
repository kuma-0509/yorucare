import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("/api/cron/purge-anonymous-analytics", () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalAnalyticsDatabaseUrl = process.env.ANALYTICS_DATABASE_URL;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSalt = process.env.ANALYTICS_ID_SALT;

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
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

  it("rejects requests when the cron secret is missing", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(
      new Request(
        "https://yorucare.example/api/cron/purge-anonymous-analytics"
      )
    );

    expect(response.status).toBe(401);
  });

  it("rejects requests with the wrong bearer token", async () => {
    process.env.CRON_SECRET = "correct-secret-with-16-characters";
    const response = await GET(
      new Request(
        "https://yorucare.example/api/cron/purge-anonymous-analytics",
        { headers: { Authorization: "Bearer wrong-secret" } }
      )
    );

    expect(response.status).toBe(401);
  });

  it("returns 503 when an authorized purge has no DB configuration", async () => {
    const secret = "correct-secret-with-16-characters";
    process.env.CRON_SECRET = secret;
    delete process.env.ANALYTICS_DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.ANALYTICS_ID_SALT;

    const response = await GET(
      new Request(
        "https://yorucare.example/api/cron/purge-anonymous-analytics",
        { headers: { Authorization: `Bearer ${secret}` } }
      )
    );

    expect(response.status).toBe(503);
  });
});

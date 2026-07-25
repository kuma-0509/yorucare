import { purgeExpiredAnonymousAnalytics } from "@/lib/server/analytics-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (
    !cronSecret ||
    cronSecret.length < 16 ||
    authorization !== `Bearer ${cronSecret}`
  ) {
    return new Response(null, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    await purgeExpiredAnonymousAnalytics();
  } catch {
    return new Response(null, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "60",
      },
    });
  }

  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}

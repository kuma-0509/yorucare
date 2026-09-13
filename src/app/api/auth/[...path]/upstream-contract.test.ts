/**
 * 中継処理が、上流（Managed Better Auth）の受け入れ条件を壊していないかを、
 * 本物の `@neondatabase/auth` の中継部分と偽の上流サーバーを使って確かめる。
 *
 * 2026-09-13に見つかった不具合の再発防止。ブラウザは「ログアウト」を本文なし・
 * Content-Typeなしで送るが、中継処理が空文字を本文として組み直していたため、
 * `Request` が `Content-Type: text/plain;charset=UTF-8` を自動で付け、それが
 * そのまま上流へ転送されていた。上流のBetter Authは全ルートで
 * `allowedMediaTypes: ["application/json"]` を要求するため、JSON以外の
 * Content-Typeが付いた要求を 415 で断る（`better-call` の `getBody`）。
 * その結果、ログインはできるのにログアウトだけが必ず失敗していた。
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  handleAuthProxyRequest,
  NEON_AUTH_SESSION_COOKIE_NAME,
} from "@neondatabase/auth/server";

type Received = { method: string; url: string; contentType: string | undefined };

const received: Received[] = [];
let baseUrl = "";
let server: ReturnType<typeof createServer>;

/** 上流のBetter Authと同じ判定（JSON以外のContent-Typeは415で断る） */
const JSON_CONTENT_TYPE = /^application\/([a-z0-9.+-]*\+)?json/i;

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => {
      const contentType = req.headers["content-type"];
      received.push({
        method: req.method ?? "",
        url: req.url ?? "",
        contentType,
      });

      // Content-Typeが付いている＝本文があるものとして扱われる。JSON以外は断る
      if (contentType && !JSON_CONTENT_TYPE.test(contentType)) {
        res.writeHead(415, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: "UNSUPPORTED_MEDIA_TYPE" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  received.length = 0;
});

/** `src/app/api/auth/[...path]/route.ts` が本文を読み直して組み直すのと同じ手順 */
async function relayAsRoute(request: Request, path: string): Promise<Response> {
  const text = await request.text();
  const rebuilt = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    ...(text.length > 0 ? { body: text } : {}),
  });
  return handleAuthProxyRequest({
    request: rebuilt,
    path,
    baseUrl,
    cookieSecret: "x".repeat(40),
  });
}

function browserSignOutRequest(): Request {
  // ブラウザのサインアウトは本文もContent-Typeも持たない
  return new Request("https://yorucare.example/api/auth/sign-out", {
    method: "POST",
    headers: {
      origin: "https://yorucare.example",
      cookie: `${NEON_AUTH_SESSION_COOKIE_NAME}=abc123`,
    },
  });
}

describe("上流へ転送するときの取り決め", () => {
  it("本文の無いサインアウトに、Content-Typeを勝手に足さない", async () => {
    const response = await relayAsRoute(browserSignOutRequest(), "sign-out");

    expect(received).toHaveLength(1);
    expect(received[0].contentType).toBeUndefined();
    expect(response.status).toBe(200);
  });

  it("本文のある要求（6桁コードの送信）は、JSONのまま転送する", async () => {
    const response = await relayAsRoute(
      new Request("https://yorucare.example/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        headers: {
          origin: "https://yorucare.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "sanka@example.com", type: "sign-in" }),
      }),
      "email-otp/send-verification-otp"
    );

    expect(received).toHaveLength(1);
    expect(received[0].contentType).toBe("application/json");
    expect(response.status).toBe(200);
  });
});

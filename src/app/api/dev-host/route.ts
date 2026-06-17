import { networkInterfaces } from "os";

/**
 * 開発時のみ：スマホからアクセスするための LAN IP を返す。
 * 本番では 404（プレビュー導線の補助用）。
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const ips: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const net of entries ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return Response.json({ ips: [...new Set(ips)] });
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * 演出プロトタイプの入口。スマホから見るときの URL を案内する。
 * 本番フローにはつながっていない。
 */
export default function PreviewHubPage() {
  const [phoneUrl, setPhoneUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const { protocol, port } = window.location;
    const portPart = port ? `:${port}` : "";

    const buildUrl = (host: string) =>
      `${protocol}//${host}${portPart}/preview/report`;

    const { hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      setPhoneUrl(buildUrl(hostname));
      return;
    }

    // PC の localhost 表示時は LAN IP を取得してスマホ用 URL を組み立てる
    fetch("/api/dev-host")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ips?: string[] } | null) => {
        const lanIp = data?.ips?.[0];
        setPhoneUrl(lanIp ? buildUrl(lanIp) : buildUrl(hostname));
      })
      .catch(() => setPhoneUrl(buildUrl(hostname)));
  }, []);

  const handleCopy = async () => {
    if (!phoneUrl) return;
    try {
      await navigator.clipboard.writeText(phoneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不可の端末では無視
    }
  };

  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg px-4 py-8 pb-safe">
      <h1 className="text-xl font-medium text-foreground">
        演出プロトタイプ（プレビュー）
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        本番の記録には影響しません。スマホで見るときは、下の URL を使ってください。
      </p>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">スマホで見る手順</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-2 pl-5">
            <li>PC とスマホを同じ Wi‑Fi に接続する</li>
            <li>PC で開発サーバーを起動する（pnpm.cmd dev）</li>
            <li>
              スマホのブラウザで、下の URL を開く
              <span className="block text-xs text-muted-foreground/80">
                ※ localhost はスマホでは使えません
              </span>
            </li>
          </ol>

          {phoneUrl && (
            <div className="rounded-lg bg-muted px-3 py-3">
              <p className="break-all font-mono text-xs text-foreground">
                {phoneUrl}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={handleCopy}
              >
                {copied ? "コピーしました" : "URLをコピー"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href="/preview/report">期間の報告書を見る</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">アプリのトップへ</Link>
        </Button>
      </div>
    </main>
  );
}

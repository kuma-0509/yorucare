"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAnalyticsConsent,
  saveAnalyticsConsent,
  stopAndDeleteAnonymousAnalytics,
} from "@/lib/analytics-consent";
import { COPY } from "@/lib/copy";

type StatusMessage =
  | "enabled"
  | "deleted"
  | "deleteFailed"
  | null;

export function AnonymousAnalyticsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);

  useEffect(() => {
    setEnabled(getAnalyticsConsent() === "granted");
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  const enable = () => {
    saveAnalyticsConsent(true);
    setEnabled(true);
    setStatusMessage("enabled");
  };

  const disable = async () => {
    setBusy(true);
    const deleted = await stopAndDeleteAnonymousAnalytics();
    setEnabled(false);
    setStatusMessage(deleted ? "deleted" : "deleteFailed");
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{COPY.analyticsConsentTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {COPY.analyticsConsentBody}
        </p>
        <p className="text-sm font-medium" role="status">
          {enabled ? COPY.analyticsEnabled : COPY.analyticsDisabled}
        </p>
        {statusMessage === "enabled" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            これからの操作について、匿名の利用状況が送信されます。
          </p>
        )}
        {statusMessage === "deleted" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            送信を停止し、この端末に対応する保存済みデータを削除しました。
          </p>
        )}
        {statusMessage === "deleteFailed" && (
          <p className="text-xs leading-relaxed text-caution-foreground">
            これからの送信は停止しました。保存済みデータの削除は完了しなかったため、時間をおいてもう一度お試しください。
          </p>
        )}
        {enabled ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void disable()}
          >
            {busy ? "停止しています…" : COPY.analyticsDisableAction}
          </Button>
        ) : statusMessage === "deleteFailed" ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void disable()}
          >
            {busy ? "削除しています…" : COPY.analyticsRetryDeleteAction}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={enable}
          >
            {COPY.analyticsEnableAction}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

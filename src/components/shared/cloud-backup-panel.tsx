"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CloudRestoreDialog } from "@/components/shared/cloud-restore-dialog";
import { LiveRegion } from "@/components/shared/live-region";
import { isCloudBackupEnabled } from "@/lib/cloud-backup";
import { cloudAuthClient } from "@/lib/cloud-auth-client";
import { fetchCloudAuthOutcome } from "@/lib/cloud-auth-status";
import {
  hasCloudBackupConsent,
  saveCloudBackupConsent,
} from "@/lib/cloud-consent";
import {
  clearCloudSyncState,
  evaluateSyncNotice,
  readCloudSyncState,
  type SyncNotice,
} from "@/lib/cloud-sync-state";
import {
  deleteCloudData,
  pushSnapshot,
  summarizePayload,
  type SnapshotSummary,
} from "@/lib/cloud-sync";
import { COPY } from "@/lib/copy";
import {
  formatDateLabel,
  formatDateTimeLabel,
  formatShortDate,
} from "@/lib/dates";
import { repository } from "@/lib/repository";

/**
 * クラウド保存の設定。
 *
 * 入口が閉じているあいだは何も出さない。ログイン（アカウント作成）と
 * アップロードは別の操作にし、預ける直前に件数だけを示す。記録の中身は
 * ここにも運営者向けの記録にも出さない
 * （`docs/account-cloud-storage-decision.md` 4節）。
 */

const CLOUD = COPY.cloudBackup;
const LOGIN_PATH = "/cloud-login";

type Phase =
  /** 入口が閉じている、または確認中 */
  | { step: "loading" }
  /** ログインしていない。ここではまだ1件も送らない */
  | { step: "signed_out" }
  /** Better Authのセッションはあるが、許可リスト外。使えない */
  | { step: "not_allowed" }
  /** ログイン済みだが、まだ預けることに同意していない */
  | { step: "not_enabled" }
  /** 預けている */
  | { step: "enabled" };

type ConfirmKind = "stop" | "leave";

export function CloudBackupPanel() {
  const [phase, setPhase] = useState<Phase>({ step: "loading" });
  const [localSummary, setLocalSummary] = useState<SnapshotSummary | null>(null);
  const [notice, setNotice] = useState<SyncNotice>({ kind: "none" });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  /** 端末側が覚えている最終預け日時と案内を読み直す */
  const refreshSyncState = useCallback(() => {
    const state = readCloudSyncState();
    setLastSyncedAt(state.lastSyncedAt);
    setNotice(evaluateSyncNotice(state));
  }, []);

  /** 預ける直前に出す件数。記録の中身は取り出さない */
  const refreshLocalSummary = useCallback(async () => {
    const payload = await repository.buildExportPayload();
    setLocalSummary(payload.ok ? summarizePayload(payload.value) : null);
  }, []);

  useEffect(() => {
    if (!isCloudBackupEnabled()) return;

    let cancelled = false;
    void (async () => {
      // サーバー側の判定（`getCloudAuthStatus`）だけを正とする。Better Auth
      // のセッション有無を自分で見ると、許可リスト外のメールアドレスでも
      // 「ログインできている」と扱ってしまう（記録APIは401で拒否するが、
      // この画面の表示だけが食い違う）
      const outcome = await fetchCloudAuthOutcome();
      if (cancelled) return;

      refreshSyncState();
      await refreshLocalSummary();
      if (cancelled) return;

      if (outcome === "ok") {
        setPhase(hasCloudBackupConsent() ? { step: "enabled" } : { step: "not_enabled" });
        return;
      }
      if (outcome === "not_allowed") {
        setPhase({ step: "not_allowed" });
        return;
      }
      // 未認証・判定不能（マウント時点では何も分かっていないため、どちらも
      // 未ログイン扱いにしてよい）
      setPhase({ step: "signed_out" });
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSyncState, refreshLocalSummary]);

  // 入口が閉じているあいだは、本番画面からクラウド保存へ到達させない
  if (!isCloudBackupEnabled()) return null;
  if (phase.step === "loading") return null;

  /** 同意して、はじめて1件目を預ける */
  async function handleEnable() {
    setBusy(true);
    setMessage(null);
    saveCloudBackupConsent(true);

    const payload = await repository.buildExportPayload();
    if (!payload.ok) {
      saveCloudBackupConsent(false);
      setBusy(false);
      setMessage(CLOUD.uploadFailed);
      return;
    }

    const pushed = await pushSnapshot(JSON.stringify(payload.value));
    setBusy(false);
    if (pushed.status !== "synced") {
      // 1件も預けられていない状態で「預けている」と見せない
      saveCloudBackupConsent(false);
      setMessage(CLOUD.uploadFailed);
      return;
    }

    refreshSyncState();
    setPhase({ step: "enabled" });
  }

  /** 停止と退会。どちらもクラウド上の控えを消す */
  async function handleDelete(kind: ConfirmKind) {
    setBusy(true);
    setMessage(null);
    const result = await deleteCloudData();

    if (result === "reauth_required") {
      setBusy(false);
      // 確認の画面を閉じてから案内する。開いたままだと、もう一度ログインする
      // ための導線が画面の裏に隠れてしまう
      setConfirm(null);
      setNeedsReauth(true);
      setMessage(CLOUD.reauthRequired);
      return;
    }
    if (result !== "deleted") {
      setBusy(false);
      setMessage(CLOUD.stopFailed);
      return;
    }

    // 端末内の記録は消さない。消すのはクラウド側と、この端末が覚えていた状態だけ
    saveCloudBackupConsent(false);
    clearCloudSyncState();
    refreshSyncState();

    if (kind === "leave") {
      try {
        await cloudAuthClient.signOut();
      } catch {
        // 出られなくても、クラウド上の控えはすでに消えている
      }
      setBusy(false);
      setConfirm(null);
      setPhase({ step: "signed_out" });
      setMessage(CLOUD.leaveDone);
      return;
    }

    setBusy(false);
    setConfirm(null);
    setPhase({ step: "not_enabled" });
    setMessage(CLOUD.stopDone);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{CLOUD.title}</CardTitle>
          <CardDescription>{CLOUD.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {phase.step !== "enabled" && phase.step !== "not_allowed" && (
            <CloudBackupExplainer />
          )}

          {phase.step === "signed_out" && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                {CLOUD.signInHeading}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {CLOUD.signInBody}
              </p>
              <Button asChild variant="outline" className="w-full">
                <a href={LOGIN_PATH}>{CLOUD.signInAction}</a>
              </Button>
            </div>
          )}

          {phase.step === "not_allowed" && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                {CLOUD.notAllowedHeading}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {CLOUD.notAllowedBody}
              </p>
              <Button asChild variant="outline" className="w-full">
                <a href={LOGIN_PATH}>{CLOUD.notAllowedAction}</a>
              </Button>
            </div>
          )}

          {phase.step === "not_enabled" && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                {CLOUD.confirmHeading}
              </h3>
              {localSummary && localSummary.recordCount > 0 ? (
                <div className="rounded-xl bg-muted px-3 py-2">
                  <p className="text-sm text-foreground">
                    {CLOUD.confirmCounts(
                      localSummary.recordCount,
                      localSummary.selfCareCount,
                      localSummary.notToDoCount
                    )}
                  </p>
                  {localSummary.firstDate && localSummary.lastDate && (
                    <p className="text-xs text-muted-foreground">
                      {CLOUD.confirmPeriod(
                        formatShortDate(localSummary.firstDate),
                        formatShortDate(localSummary.lastDate)
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {CLOUD.confirmNoRecords}
                </p>
              )}
              <Button
                type="button"
                className="w-full"
                disabled={busy || !localSummary || localSummary.recordCount === 0}
                onClick={() => void handleEnable()}
              >
                {busy ? CLOUD.confirmBusy : CLOUD.confirmAction}
              </Button>

              {/* 機種変更のあとは、この端末に記録が無い状態でここへ来る。
                  戻す導線をここに置かないと、預けた控えへたどり着けない */}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {CLOUD.restoreHint}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setRestoreOpen(true)}
              >
                {CLOUD.restoreAction}
              </Button>
            </div>
          )}

          {phase.step === "enabled" && (
            <div className="space-y-3">
              {notice.kind === "handed_over" ? (
                <div className="space-y-2 rounded-xl bg-caution px-3 py-2">
                  <h3 className="text-sm font-medium text-caution-foreground">
                    {CLOUD.handedOverHeading}
                  </h3>
                  <p className="text-sm leading-relaxed text-caution-foreground">
                    {CLOUD.handedOverBody(formatDateLabel(notice.handedOverAt))}
                  </p>
                  <p className="text-sm leading-relaxed text-caution-foreground">
                    {CLOUD.handedOverKept}
                  </p>
                  <p className="text-sm leading-relaxed text-caution-foreground">
                    {CLOUD.handedOverReturn}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    {CLOUD.enabledHeading}
                  </p>
                  <p className="text-sm text-muted-foreground" role="status">
                    {lastSyncedAt
                      ? CLOUD.lastSyncedAt(formatDateTimeLabel(lastSyncedAt))
                      : CLOUD.neverSynced}
                  </p>
                </>
              )}

              {notice.kind === "stale" && (
                <p className="rounded-xl bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                  {CLOUD.staleNotice(notice.daysSinceSync)}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setRestoreOpen(true)}
              >
                {notice.kind === "handed_over"
                  ? CLOUD.handedOverAction
                  : CLOUD.restoreAction}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setConfirm("stop")}
              >
                {CLOUD.stopAction}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setConfirm("leave")}
              >
                {CLOUD.leaveAction}
              </Button>
            </div>
          )}

          {needsReauth && (
            <Button asChild variant="outline" className="w-full">
              <a href={LOGIN_PATH}>{CLOUD.reauthAction}</a>
            </Button>
          )}

          {message && (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>
          )}
        </CardContent>
      </Card>

      <CloudRestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        onRestored={() => {
          refreshSyncState();
          void refreshLocalSummary();
          // 戻すなかで預ける方を選んだ場合は、そのまま預けている状態になる
          if (hasCloudBackupConsent()) setPhase({ step: "enabled" });
        }}
      />

      <Dialog
        open={confirm !== null}
        onOpenChange={(next) => {
          if (!next) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "leave" ? CLOUD.leaveHeading : CLOUD.stopHeading}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {confirm === "leave" ? CLOUD.leaveBody : CLOUD.stopBody}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="caution"
              disabled={busy}
              onClick={() => {
                if (confirm) void handleDelete(confirm);
              }}
            >
              {busy
                ? CLOUD.busy
                : confirm === "leave"
                  ? CLOUD.leaveConfirmAction
                  : CLOUD.stopConfirmAction}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirm(null)}
            >
              {COPY.cancel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LiveRegion message={message} />
    </>
  );
}

/** 預ける前に示す説明。短い要約と、折りたたんだ詳細の2段にする */
function CloudBackupExplainer() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">
        {CLOUD.summaryHeading}
      </h3>
      <ul className="space-y-1">
        {CLOUD.summary.map((line) => (
          <li
            key={line}
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {line}
          </li>
        ))}
      </ul>
      <details className="rounded-xl bg-muted px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          {CLOUD.detailsLabel}
        </summary>
        <dl className="mt-2 space-y-2">
          {CLOUD.details.map((item) => (
            <div key={item.heading}>
              <dt className="text-sm font-medium text-foreground">
                {item.heading}
              </dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiveRegion } from "@/components/shared/live-region";
import {
  claimThisDevice,
  fetchCloudSnapshot,
  planRestore,
  pushSnapshot,
  requiresLocalBackup,
  summarizePayload,
  type RestorePlan,
  type SnapshotSummary,
} from "@/lib/cloud-sync";
import { saveCloudBackupConsent } from "@/lib/cloud-consent";
import { COPY } from "@/lib/copy";
import { formatShortDate } from "@/lib/dates";
import { downloadBackup, importBackup } from "@/lib/export";
import { repository } from "@/lib/repository";

/**
 * クラウドから戻す画面。
 *
 * 端末とクラウドの両方に記録がある場合は、自動で統合も置き換えもしない。
 * 件数と期間を並べて本人に選んでもらい、選ぶ前にファイルへの保存を必須にする
 * （`docs/account-cloud-storage-decision.md` 9.3節）。
 */

const COPY_CLOUD = COPY.cloudBackup;

type Stage =
  | { step: "loading" }
  | { step: "unavailable" }
  | { step: "planned"; plan: RestorePlan; cloudText: string | null }
  | { step: "done"; message: string };

interface CloudRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 戻し終えたあとに、呼び出し側の表示を更新してもらう */
  onRestored?: () => void;
}

function CountLine({ summary }: { summary: SnapshotSummary }) {
  return (
    <>
      <p className="text-sm text-foreground">
        {COPY_CLOUD.confirmCounts(
          summary.recordCount,
          summary.selfCareCount,
          summary.notToDoCount
        )}
      </p>
      {summary.firstDate && summary.lastDate && (
        <p className="text-xs text-muted-foreground">
          {COPY_CLOUD.confirmPeriod(
            formatShortDate(summary.firstDate),
            formatShortDate(summary.lastDate)
          )}
        </p>
      )}
    </>
  );
}

export function CloudRestoreDialog({
  open,
  onOpenChange,
  onRestored,
}: CloudRestoreDialogProps) {
  const [stage, setStage] = useState<Stage>({ step: "loading" });
  const [busy, setBusy] = useState(false);
  const [backupSaved, setBackupSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStage({ step: "loading" });
    setBackupSaved(false);
    setMessage(null);

    const local = await repository.buildExportPayload();
    if (!local.ok) {
      setStage({ step: "unavailable" });
      return;
    }

    const cloud = await fetchCloudSnapshot();
    if (cloud.status === "unavailable" || cloud.status === "off") {
      setStage({ step: "unavailable" });
      return;
    }

    const cloudPayload = cloud.status === "found" ? cloud.payload : null;
    setStage({
      step: "planned",
      plan: planRestore(local.value, cloudPayload),
      cloudText: cloudPayload ? JSON.stringify(cloudPayload) : null,
    });
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  /** クラウドの控えをこの端末へ書き戻し、この端末を預ける端末にする */
  async function applyCloud(cloudText: string) {
    setBusy(true);
    const imported = await importBackup(cloudText);
    if (!imported.ok) {
      setBusy(false);
      setMessage(COPY_CLOUD.restoreFailed);
      return;
    }
    await claimThisDevice();
    setBusy(false);
    setStage({ step: "done", message: COPY_CLOUD.restoreDone });
    onRestored?.();
  }

  /** この端末の内容でクラウドを上書きし、この端末を預ける端末にする */
  async function applyLocal() {
    setBusy(true);
    // 件数を見たうえで「この端末の内容を預ける」を押した時点が、本人の
    // 明示的な指示にあたる。ここで同意として記録してから預ける
    saveCloudBackupConsent(true);
    // 先に登録して、以前の端末を停止状態にしてから預ける
    await claimThisDevice();
    const local = await repository.buildExportPayload();
    if (!local.ok) {
      setBusy(false);
      setMessage(COPY_CLOUD.restoreFailed);
      return;
    }
    const pushed = await pushSnapshot(JSON.stringify(local.value));
    setBusy(false);
    if (pushed.status !== "synced") {
      // 1件も預けられていない状態で「預けている」と見せない
      saveCloudBackupConsent(false);
      setMessage(COPY_CLOUD.restoreFailed);
      return;
    }
    setStage({ step: "done", message: COPY_CLOUD.restoreDone });
    onRestored?.();
  }

  async function handleSaveBackup() {
    setBusy(true);
    const saved = await downloadBackup();
    setBusy(false);
    if (saved.ok) {
      setBackupSaved(true);
      setMessage(COPY_CLOUD.restoreBackupDone);
      return;
    }
    setMessage(COPY_CLOUD.restoreBackupFailed);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{COPY_CLOUD.restoreHeading}</DialogTitle>
          {stage.step === "planned" &&
            stage.plan.kind === "choice_required" && (
              <DialogDescription className="text-sm leading-relaxed">
                {COPY_CLOUD.restoreChoiceBody}
              </DialogDescription>
            )}
        </DialogHeader>

        {stage.step === "loading" && (
          <p className="text-sm text-muted-foreground">
            {COPY_CLOUD.restoreLoading}
          </p>
        )}

        {stage.step === "unavailable" && (
          <p className="text-sm leading-relaxed text-foreground">
            {COPY_CLOUD.restoreUnavailable}
          </p>
        )}

        {stage.step === "done" && (
          <p className="text-sm leading-relaxed text-foreground">
            {stage.message}
          </p>
        )}

        {stage.step === "planned" && stage.plan.kind === "nothing_to_do" && (
          <p className="text-sm leading-relaxed text-foreground">
            {COPY_CLOUD.restoreNothing}
          </p>
        )}

        {stage.step === "planned" && stage.plan.kind === "restore_cloud" && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground">
              {COPY_CLOUD.restoreCloudOnly}
            </p>
            <div className="rounded-xl bg-muted px-3 py-2">
              <CountLine summary={stage.plan.cloud} />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={busy || !stage.cloudText}
              onClick={() => {
                if (stage.cloudText) void applyCloud(stage.cloudText);
              }}
            >
              {busy ? COPY_CLOUD.busy : COPY_CLOUD.restoreCloudAction}
            </Button>
          </div>
        )}

        {stage.step === "planned" && stage.plan.kind === "upload_local" && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground">
              {COPY_CLOUD.restoreLocalOnly}
            </p>
            <div className="rounded-xl bg-muted px-3 py-2">
              <CountLine summary={stage.plan.local} />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={busy}
              onClick={() => void applyLocal()}
            >
              {busy ? COPY_CLOUD.busy : COPY_CLOUD.restoreUploadAction}
            </Button>
          </div>
        )}

        {stage.step === "planned" && stage.plan.kind === "choice_required" && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              {COPY_CLOUD.restoreChoiceHeading}
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {COPY_CLOUD.restoreLocalColumn}
                </p>
                <CountLine summary={stage.plan.local} />
              </div>
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {COPY_CLOUD.restoreCloudColumn}
                </p>
                <CountLine summary={stage.plan.cloud} />
              </div>
            </div>

            {requiresLocalBackup(stage.plan) && !backupSaved && (
              <div className="space-y-2 rounded-xl bg-caution px-3 py-2">
                <p className="text-sm leading-relaxed text-caution-foreground">
                  {COPY_CLOUD.restoreBackupRequired}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void handleSaveBackup()}
                >
                  {busy ? COPY_CLOUD.busy : COPY_CLOUD.restoreBackupAction}
                </Button>
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              disabled={busy || !backupSaved || !stage.cloudText}
              onClick={() => {
                if (stage.cloudText) void applyCloud(stage.cloudText);
              }}
            >
              {COPY_CLOUD.restoreChooseCloud}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy || !backupSaved}
              onClick={() => void applyLocal()}
            >
              {COPY_CLOUD.restoreChooseLocal}
            </Button>
          </div>
        )}

        {message && (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            {message}
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          {COPY.cancel}
        </Button>

        <LiveRegion message={message} />
      </DialogContent>
    </Dialog>
  );
}

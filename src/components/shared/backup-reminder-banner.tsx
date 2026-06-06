"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import { getBackupReminder } from "@/lib/backup-reminder";
import type { AppTab } from "@/lib/types";

interface BackupReminderBannerProps {
  onNavigateTab?: (tab: AppTab) => void;
  refreshKey?: number;
}

const SNOOZE_KEY = "yorucare_backup_reminder_snoozed";

/**
 * 最終バックアップからの経過を検知して、能動的にファイル保存を促すバナー。
 * 受動的な案内（StorageNoticeBanner）と違い、保存が必要なときだけ出る。
 * セッション中は「あとで」で一時的に閉じられる。
 */
export function BackupReminderBanner({
  onNavigateTab,
  refreshKey = 0,
}: BackupReminderBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let snoozed = false;
    try {
      snoozed = sessionStorage.getItem(SNOOZE_KEY) === "1";
    } catch {
      snoozed = false;
    }
    if (snoozed) {
      setVisible(false);
      return;
    }
    setVisible(getBackupReminder().shouldRemind);
  }, [refreshKey]);

  const snooze = () => {
    try {
      sessionStorage.setItem(SNOOZE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="mb-4 rounded-2xl border-2 border-caution-border/60 bg-caution px-4 py-3"
      role="status"
    >
      <div className="flex items-start gap-2">
        <Download
          className="mt-0.5 h-5 w-5 shrink-0 text-caution-foreground"
          aria-hidden
        />
        <div>
          <p className="text-sm font-semibold text-caution-foreground">
            {COPY.backupReminderTitle}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-caution-foreground">
            {COPY.backupReminderBody}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {onNavigateTab && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => onNavigateTab("records")}
          >
            {COPY.backupReminderAction}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={snooze}
        >
          {COPY.backupReminderSnooze}
        </Button>
      </div>
    </div>
  );
}

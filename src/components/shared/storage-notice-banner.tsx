"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import {
  dismissStorageNotice,
  getVisibleStorageNotice,
} from "@/lib/storage-notices";
import type { AppTab } from "@/lib/types";

interface StorageNoticeBannerProps {
  onNavigateTab?: (tab: AppTab) => void;
  refreshKey?: number;
  onDismissed?: () => void;
}

export function StorageNoticeBanner({
  onNavigateTab,
  refreshKey = 0,
  onDismissed,
}: StorageNoticeBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    void getVisibleStorageNotice().then((result) => {
      if (active) {
        setVisible(result.ok && result.value === "storage_notice");
      }
    });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const dismiss = () => {
    dismissStorageNotice();
    setVisible(false);
    onDismissed?.();
  };

  if (!visible) return null;

  return (
    <div
      className="mb-4 rounded-2xl border-2 border-border bg-muted/60 px-4 py-3"
      role="status"
      data-testid="storage-notice-banner"
    >
      <p className="text-sm leading-relaxed text-foreground">
        {COPY.storageDeviceOnly}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {COPY.storageMayBeLost}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {onNavigateTab && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => onNavigateTab("records")}
          >
            記録をファイルで保存する
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={dismiss}
        >
          {COPY.storageDismiss}
        </Button>
      </div>
    </div>
  );
}

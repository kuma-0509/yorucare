"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS } from "@/lib/constants";

export function StorageNoticeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEYS.storageNoticeDismissed);
      setVisible(dismissed !== "1");
    } catch {
      setVisible(false);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.storageNoticeDismissed, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="mb-4 rounded-2xl border-2 border-border bg-muted/60 px-4 py-3"
      role="status"
    >
      <p className="text-sm leading-relaxed text-foreground">
        記録は<strong className="font-semibold">この端末のブラウザだけ</strong>
        に保存されます。別のスマホ・別ブラウザでは見えません。ブラウザのデータを消すと記録も消えることがあります。
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 w-full"
        onClick={dismiss}
      >
        理解しました
      </Button>
    </div>
  );
}

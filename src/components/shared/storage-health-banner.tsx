"use client";

import { useEffect, useState } from "react";
import { repository } from "@/lib/repository";
import { storageErrorMessage } from "@/lib/result";

export function StorageHealthBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void repository.getStorageHealth().then((health) => {
      if (!active || health.ok) return;
      setMessage(storageErrorMessage(health.error));
    });

    return () => {
      active = false;
    };
  }, []);

  if (!message) return null;

  return (
    <div
      className="mb-4 rounded-2xl border-2 border-destructive/40 bg-destructive/5 px-4 py-3"
      role="alert"
    >
      <p className="text-sm leading-relaxed text-foreground">{message}</p>
    </div>
  );
}

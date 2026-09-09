import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isCloudBackupEnabled } from "@/lib/cloud-backup";

/**
 * クラウドバックアップのログイン確認画面。
 *
 * `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` が有効でない限り 404 とする。
 * `/api/cloud/*` と同じ判定を使い、本番画面からは到達できないままにする。
 */
export default function CloudLoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isCloudBackupEnabled()) {
    notFound();
  }

  return children;
}

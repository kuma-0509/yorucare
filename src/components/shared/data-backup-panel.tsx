"use client";

import { useRef, useState } from "react";
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
import { LiveRegion } from "@/components/shared/live-region";
import { COPY } from "@/lib/copy";
import { downloadBackup, importBackup } from "@/lib/export";
import { storageErrorMessage } from "@/lib/result";

interface DataBackupPanelProps {
  onImported?: () => void;
}

const MAX_BACKUP_FILE_BYTES = 2 * 1024 * 1024;

export function DataBackupPanel({ onImported }: DataBackupPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleExport = () => {
    const result = downloadBackup();
    if (!result.ok) {
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setMessage("記録をファイルで保存しました。");
  };

  const handleImport = (file: File) => {
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setMessage("ファイルが大きすぎるため読み込めませんでした。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setPendingImport(text);
      setConfirmOpen(true);
    };
    reader.onerror = () => {
      setMessage("ファイルを読み込めませんでした。");
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const result = importBackup(pendingImport);
    setConfirmOpen(false);
    setPendingImport(null);
    if (result.ok) {
      setMessage(
        `バックアップを読み込みました（記録 ${result.value.recordCount} 件・できること ${result.value.selfCareCount} 件）。`
      );
      onImported?.();
    } else {
      setMessage(storageErrorMessage(result.error));
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">データのバックアップ</CardTitle>
          <CardDescription>
            機種変更やブラウザを替える前に、記録をファイルで保存・復元できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-xl bg-caution px-3 py-2 text-sm leading-relaxed text-caution-foreground">
            {COPY.backupPlaintextNotice}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleExport}
          >
            記録をファイルで保存する
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => inputRef.current?.click()}
          >
            保存したファイルから復元する
          </Button>
          {message && (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{COPY.importConfirmTitle}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {COPY.importConfirmBody}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={confirmImport}>
              復元する
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setPendingImport(null);
              }}
            >
              キャンセル
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LiveRegion message={message} />
    </>
  );
}

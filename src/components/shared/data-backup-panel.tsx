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
import { downloadBackup, importBackup } from "@/lib/export";

interface DataBackupPanelProps {
  onImported?: () => void;
}

export function DataBackupPanel({ onImported }: DataBackupPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = importBackup(text);
      if (result.ok) {
        setMessage("バックアップを読み込みました。画面を更新しています。");
        onImported?.();
      } else {
        setMessage(result.error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">データのバックアップ</CardTitle>
        <CardDescription>
          機種変更やブラウザを替える前に、記録をファイルで保存・復元できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" variant="outline" className="w-full" onClick={downloadBackup}>
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
  );
}

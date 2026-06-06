"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SaveRecordButtonProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  saving?: boolean;
}

export function SaveRecordButton({
  onClick,
  className,
  disabled = false,
  saving = false,
}: SaveRecordButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      className={cn("w-full", className)}
      onClick={onClick}
      disabled={disabled || saving}
      aria-busy={saving}
    >
      {saving ? "保存中…" : "記録を保存する"}
    </Button>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SaveRecordButtonProps {
  onClick: () => void;
  className?: string;
  /** 気分カード直下用の補足文 */
  showHint?: boolean;
}

export function SaveRecordButton({
  onClick,
  className,
  showHint = false,
}: SaveRecordButtonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Button type="button" size="lg" className="w-full" onClick={onClick}>
        記録を保存する
      </Button>
      {showHint && (
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          くわしい内容は、あとから足せます。
        </p>
      )}
    </div>
  );
}

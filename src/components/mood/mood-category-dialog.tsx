"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOOD_CATEGORY_OPTIONS } from "@/lib/mood-labels";
import type { MoodLabelCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MoodCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (category: MoodLabelCategory) => void;
}

export function MoodCategoryDialog({
  open,
  onOpenChange,
  onSelect,
}: MoodCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-5">
        <DialogHeader className="text-center">
          <DialogTitle className="text-base font-semibold text-foreground">
            どの気分で登録しますか
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {MOOD_CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-full border-2 border-border bg-white px-4 py-3 text-left text-base transition-colors",
                "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              onClick={() => onSelect(option.value)}
            >
              <span
                className={cn("h-5 w-5 shrink-0 rounded-full", option.dotClass)}
                aria-hidden
              />
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          キャンセル
        </Button>
      </DialogContent>
    </Dialog>
  );
}

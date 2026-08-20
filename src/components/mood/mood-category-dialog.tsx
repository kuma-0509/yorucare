"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectionControl } from "@/components/shared/option-button";
import { COPY } from "@/lib/copy";
import { MOOD_CATEGORY_OPTIONS } from "@/lib/mood-labels";
import type { MoodLabelCategory } from "@/lib/types";

interface MoodCategoryDialogProps {
  open: boolean;
  /** 区分を選ぶ対象の気持ち。見出しに出して、どれを操作しているかを示す */
  label: string;
  /** 追加時は null。選び直しのときは、いま付いている区分 */
  currentCategory: MoodLabelCategory | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (category: MoodLabelCategory) => void;
}

export function MoodCategoryDialog({
  open,
  label,
  currentCategory,
  onOpenChange,
  onSelect,
}: MoodCategoryDialogProps) {
  const isEditing = currentCategory !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-5">
        <DialogHeader className="text-center">
          {/* 閉じるボタンが右上に重なるので、見出しの右側を空けておく */}
          <DialogTitle className="px-6 text-base font-semibold text-foreground">
            {label ? `「${label}」の` : ""}
            {isEditing
              ? COPY.moodLabel.categoryEditTitle
              : COPY.moodLabel.categoryAddTitle}
          </DialogTitle>
          {/* 5区分と状態の3段階が別の軸であることを、選ぶ前に伝える */}
          <DialogDescription className="text-sm leading-relaxed">
            {COPY.moodLabel.categoryAxisNotice}
          </DialogDescription>
        </DialogHeader>

        <div
          role="radiogroup"
          aria-label={COPY.moodLabel.categoryName}
          className="space-y-2"
        >
          {MOOD_CATEGORY_OPTIONS.map((option) => (
            <SelectionControl
              key={option.value}
              selected={option.value === currentCategory}
              mode="radio"
              layout="row"
              accentDotClass={option.dotClass}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </SelectionControl>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          {COPY.cancel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SelectionControl,
  SelectionGroup,
} from "@/components/shared/option-button";
import { COPY } from "@/lib/copy";
import {
  DEFAULT_RECORD_FORM_SECTIONS,
  RECORD_FORM_SECTION_OPTIONS,
  getRecordFormSections,
  toggleRecordFormSection,
  type RecordFormSections,
} from "@/lib/record-form-sections";

interface CustomInputSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 記録画面に出す項目を選ぶ設定。切り替えた時点で端末内へ残す */
export function CustomInputSettingsDialog({
  open,
  onOpenChange,
}: CustomInputSettingsDialogProps) {
  // 端末内の設定は最初の描画では読まない（保存済みの設定と初期表示がずれないようにする）
  const [sections, setSections] = useState<RecordFormSections>(
    DEFAULT_RECORD_FORM_SECTIONS
  );

  useEffect(() => {
    if (!open) return;
    setSections(getRecordFormSections());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
            {COPY.customInput.title}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {COPY.customInput.description}
          </DialogDescription>
        </DialogHeader>

        <SelectionGroup legend={COPY.customInput.legend} mode="checkbox">
          {RECORD_FORM_SECTION_OPTIONS.map(({ key, label, description }) => (
            <SelectionControl
              key={key}
              selected={sections[key]}
              mode="checkbox"
              layout="row"
              onClick={() => setSections(toggleRecordFormSection(key, !sections[key]))}
            >
              <span className="flex flex-col">
                <span>{label}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {description}
                </span>
              </span>
            </SelectionControl>
          ))}
        </SelectionGroup>

        <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
          <p>{COPY.customInput.notice}</p>
          <p>{COPY.customInput.deviceOnly}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

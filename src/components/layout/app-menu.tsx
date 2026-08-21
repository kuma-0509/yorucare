"use client";

import { useState } from "react";
import { ChevronRight, LifeBuoy, Menu, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConsultationLinksDialog } from "@/components/shared/consultation-links-dialog";
import { CustomInputSettingsDialog } from "@/components/shared/custom-input-settings-dialog";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface AppMenuProps {
  compact?: boolean;
}

/**
 * 全タブ共通ヘッダーのメニュー。
 * 相談先はここから1手で開ける位置に置き、記録画面の項目設定を同じ場所へまとめる。
 */
export function AppMenu({ compact = false }: AppMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [customInputOpen, setCustomInputOpen] = useState(false);

  return (
    <>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "shrink-0 border-primary/40 px-3 text-primary",
              compact && "min-h-10"
            )}
            aria-label={COPY.menu.open}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle>{COPY.menu.title}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {COPY.menu.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <MenuItem
              icon={<LifeBuoy className="h-5 w-5 text-primary" aria-hidden="true" />}
              label={COPY.menu.consultation}
              description={COPY.menu.consultationDescription}
              onClick={() => {
                setMenuOpen(false);
                setConsultationOpen(true);
              }}
            />
            <MenuItem
              icon={
                <SlidersHorizontal
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
              }
              label={COPY.menu.customInput}
              description={COPY.menu.customInputDescription}
              onClick={() => {
                setMenuOpen(false);
                setCustomInputOpen(true);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConsultationLinksDialog
        open={consultationOpen}
        onOpenChange={setConsultationOpen}
      />
      <CustomInputSettingsDialog
        open={customInputOpen}
        onOpenChange={setCustomInputOpen}
      />
    </>
  );
}

function MenuItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-border bg-card px-4 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">
        <span className="block text-base font-medium">{label}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  );
}

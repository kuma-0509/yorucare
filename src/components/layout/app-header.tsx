import { COPY } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { ConsultationLinksDialog } from "@/components/shared/consultation-links-dialog";
import { MedicationNoteDialog } from "@/components/shared/medication-note-dialog";

interface AppHeaderProps {
  compact?: boolean;
}

export function AppHeader({ compact = false }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border",
        compact ? "mb-3 pb-2" : "mb-5 pb-3"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-foreground">
            {COPY.productName}
          </p>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              compact ? "mt-0.5 leading-snug" : "mt-1 leading-relaxed"
            )}
          >
            {COPY.tagline}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MedicationNoteDialog compact={compact} />
          <ConsultationLinksDialog compact={compact} />
        </div>
      </div>
    </header>
  );
}

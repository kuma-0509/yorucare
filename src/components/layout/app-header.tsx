import { COPY } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { AppMenu } from "@/components/layout/app-menu";

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
        <AppMenu compact={compact} />
      </div>
    </header>
  );
}

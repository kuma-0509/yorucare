import { cn } from "@/lib/utils";

interface AppHeaderProps {
  compact?: boolean;
}

export function AppHeader({ compact = false }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border",
        compact ? "mb-3 pb-2" : "mb-6 pb-4"
      )}
    >
      <p className="text-lg font-bold tracking-tight text-foreground">ヨルケア</p>
      <p
        className={cn(
          "text-sm text-muted-foreground",
          compact ? "mt-0.5 leading-snug" : "mt-1 leading-relaxed"
        )}
      >
        毎日1〜2分、自分の状態を残すセルフケア記録
      </p>
      {!compact && (
        <p className="mt-2 text-xs text-muted-foreground">
          記録はこの端末だけに保存されます（支援者へは自動では共有されません）
        </p>
      )}
    </header>
  );
}

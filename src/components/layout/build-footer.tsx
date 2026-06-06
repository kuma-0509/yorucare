export function BuildFooter() {
  const phase = process.env.NEXT_PUBLIC_APP_PHASE ?? "Phase 1";
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE;

  if (!buildDate) return null;

  return (
    <footer className="mx-auto max-w-lg px-4 pb-2 pt-4 text-center text-xs text-muted-foreground">
      ヨルケア · {phase} · 更新 {buildDate}
    </footer>
  );
}

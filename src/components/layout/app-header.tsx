export function AppHeader() {
  return (
    <header className="mb-6 border-b border-border pb-4">
      <p className="text-lg font-bold tracking-tight text-foreground">ヨルケア</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        毎日1〜2分、自分の状態を残すセルフケア記録
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        記録はこの端末だけに保存されます（支援者へは自動では共有されません）
      </p>
    </header>
  );
}

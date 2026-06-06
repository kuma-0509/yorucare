"use client";

interface StickyActionBarProps {
  children: React.ReactNode;
}

export function StickyActionBar({ children }: StickyActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-above-nav z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm pb-safe">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}

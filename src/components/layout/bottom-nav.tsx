"use client";

import { CalendarDays, ClipboardList, Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppTab } from "@/lib/types";

const TABS: { id: AppTab; label: string; icon: React.ElementType }[] = [
  { id: "today", label: "今日の記録", icon: CalendarDays },
  { id: "records", label: "記録", icon: ClipboardList },
  { id: "selfcare", label: "セルフケア", icon: Heart },
  { id: "reflection", label: "ふりかえり", icon: Sparkles },
];

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur-sm pb-safe">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-1 pt-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-xs transition-colors",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SelectionControl } from "@/components/shared/option-button";
import { COPY } from "@/lib/copy";
import { buildSelfCareSuggestions } from "@/lib/self-care";
import type { StateLevel } from "@/lib/types";

interface SelfCareSuggestionCardProps {
  /** 記録した3段階の状態。未選択の日はカード自体を出さない */
  stateLevel: StateLevel | null;
  /** 選択式のしんどさのサイン。案を絞り込むためだけに使う */
  warningTags: string[];
  /** 今日できたこととして選ばれている「できること」のタイトル */
  selectedTitles: string[];
  /** 案を押したときに「できること」へ登録し、その日の実施として選ぶ */
  onToggle: (title: string) => void;
}

export function SelfCareSuggestionCard({
  stateLevel,
  warningTags,
  selectedTitles,
  onToggle,
}: SelfCareSuggestionCardProps) {
  const suggestions = buildSelfCareSuggestions(stateLevel, warningTags);
  if (suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {COPY.selfCareSuggestion.title}
        </CardTitle>
        <CardDescription>
          {COPY.selfCareSuggestion.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <SelectionControl
              key={suggestion}
              selected={selectedTitles.includes(suggestion)}
              layout="chip"
              mode="checkbox"
              onClick={() => onToggle(suggestion)}
            >
              {suggestion}
            </SelectionControl>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {COPY.selfCareSuggestion.notice}
        </p>
      </CardContent>
    </Card>
  );
}

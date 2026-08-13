"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChipButton,
  SelectionControl,
  SelectionGroup,
} from "@/components/shared/option-button";
import { GOAL_REVIEW_OPTIONS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { buildSmallerGoalSuggestions, GOAL_HELPER_QUESTIONS } from "@/lib/goal";
import type { GoalReviewStatus } from "@/lib/types";

interface GoalReviewCardProps {
  /** 前日に決めた目標。空の日はこのカード自体を出さない */
  goal: string;
  status: GoalReviewStatus | null;
  /** 「昨日」と書けるのは対象日が今日のときだけ */
  isToday: boolean;
  /** 提案を選んだかどうかの表示に使う、現在の翌日の目標 */
  currentGoalDraft: string;
  onStatusChange: (status: GoalReviewStatus | null) => void;
  onSelectSuggestion: (suggestion: string) => void;
}

export function GoalReviewCard({
  goal,
  status,
  isToday,
  currentGoalDraft,
  onStatusChange,
  onSelectSuggestion,
}: GoalReviewCardProps) {
  // できた日に小さくする提案は出さない。未達のときだけ次の大きさを一緒に決める
  const showHelper = status === "partial" || status === "notDone";
  const suggestions = showHelper ? buildSmallerGoalSuggestions(goal) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isToday ? COPY.goal.reviewToday : COPY.goal.reviewOther}
        </CardTitle>
        <CardDescription>{COPY.goal.reviewDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-xl bg-muted px-4 py-3 text-base">{goal}</p>

        <SelectionGroup legend="ふりかえり" mode="radio">
          {GOAL_REVIEW_OPTIONS.map(({ value, label }) => (
            <SelectionControl
              key={value}
              selected={status === value}
              mode="radio"
              layout="row"
              onClick={() => onStatusChange(status === value ? null : value)}
            >
              {label}
            </SelectionControl>
          ))}
        </SelectionGroup>

        {showHelper && (
          <div className="space-y-3 border-t border-border pt-3">
            <div>
              <p className="text-sm font-medium">{COPY.goal.helperHeading}</p>
              <ul className="mt-2 space-y-1">
                {GOAL_HELPER_QUESTIONS.map((question) => (
                  <li key={question} className="text-sm text-muted-foreground">
                    {question}
                  </li>
                ))}
              </ul>
            </div>

            {suggestions.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {COPY.goal.suggestionHint}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <ChipButton
                      key={suggestion}
                      selected={currentGoalDraft === suggestion}
                      onClick={() => onSelectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </ChipButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { AccumulationCard } from "@/components/reflection/accumulation-card";
import { ReflectionTrends } from "@/components/reflection/reflection-trends";
import { WeeklySummaryCard } from "@/components/reflection/weekly-summary-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { REFLECTION_USER_FEATURES } from "@/lib/constants";
import { COPY } from "@/lib/copy";

interface ReflectionTabProps {
  refreshKey?: number;
}

export function ReflectionTab({ refreshKey = 0 }: ReflectionTabProps) {
  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">{COPY.tab.reflection}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {COPY.reflection.description}
        </p>
      </header>

      <AccumulationCard refreshKey={refreshKey} />

      <WeeklySummaryCard refreshKey={refreshKey} />

      <ReflectionTrends refreshKey={refreshKey} />

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">
            {COPY.reflection.futureTitle}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {COPY.reflection.futureDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {REFLECTION_USER_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

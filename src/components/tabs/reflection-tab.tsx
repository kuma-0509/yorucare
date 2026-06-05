"use client";

import { ReflectionTrends } from "@/components/reflection/reflection-trends";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { REFLECTION_USER_FEATURES } from "@/lib/constants";

interface ReflectionTabProps {
  refreshKey?: number;
}

export function ReflectionTab({ refreshKey = 0 }: ReflectionTabProps) {
  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">ふりかえり</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          記録を重ねた分だけ、自分の体調の波が見えてきます。
        </p>
      </header>

      <ReflectionTrends refreshKey={refreshKey} />

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">これから追加予定</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            週のまとめや、相談前の整理など、さらにふりかえりしやすくしていきます。
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

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { REFLECTION_FUTURE_FEATURES } from "@/lib/constants";
import { Sparkles } from "lucide-react";

export function ReflectionTab() {
  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">ふりかえり</h1>
      </header>

      <Card className="border-accent bg-accent/30">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white">
            <Sparkles className="h-7 w-7 text-accent-foreground" />
          </div>
          <CardTitle>準備中</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            ここに、1週間の記録から「今週のふりかえり」が出る予定です。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            今後追加予定
          </p>
          <ul className="space-y-2">
            {REFLECTION_FUTURE_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm leading-relaxed"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

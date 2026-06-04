"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { REFLECTION_USER_FEATURES } from "@/lib/constants";

export function ReflectionTab() {
  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">ふりかえり</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          1週間の記録から、今週のまとめが出る機能を準備しています。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>準備中</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            記録がたまったら、ここで「今週のふりかえり」を見られるようにします。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            予定していること
          </p>
          <ul className="space-y-2">
            {REFLECTION_USER_FEATURES.map((feature) => (
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

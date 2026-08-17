"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COPY } from "@/lib/copy";
import { selectItemsForState } from "@/lib/self-care-list";
import type { SelfCareItem, StateLevel } from "@/lib/types";

interface AvoidListCardProps {
  /** 登録簿の全項目。ここで種別と状態を絞り込む */
  items: SelfCareItem[];
  /** その日に選んだ3段階の状態 */
  stateLevel: StateLevel | null;
}

/**
 * その日に本人が控えたいと決めていることを並べるだけのカード。
 *
 * 出す・出さないの判断は本人が登録時に指定した状態だけで決め、記録の中身からは推定しない。
 * 実施の可否を選ぶ操作を置かないのは、守れなかった日を失敗として残さないため。
 * 合致する項目がない日はカード自体を出さない。
 */
export function AvoidListCard({ items, stateLevel }: AvoidListCardProps) {
  const visible = selectItemsForState(items, "avoid", stateLevel);
  if (visible.length === 0) return null;

  return (
    <Card className="border-caution-border/60 bg-caution">
      <CardHeader>
        <CardTitle className="text-base">{COPY.avoid.todayTitle}</CardTitle>
        <CardDescription>{COPY.avoid.todayDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {visible.map((item) => (
            <li
              key={item.id}
              className="rounded-xl bg-background/70 px-3 py-2 text-base leading-snug"
            >
              {item.title}
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {COPY.avoid.todayNotice}
        </p>
      </CardContent>
    </Card>
  );
}

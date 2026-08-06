"use client";

import {
  BriefcaseBusiness,
  ExternalLink,
  HeartHandshake,
  LifeBuoy,
  Phone,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SupportResourceFinder } from "@/components/support/support-resource-finder";
import {
  EMERGENCY_RESOURCES,
  IMMEDIATE_SUPPORT_RESOURCE,
  OFFICIAL_SUPPORT_LINKS,
} from "@/lib/consultation-resources";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface ConsultationLinksDialogProps {
  compact?: boolean;
  /**
   * 開くボタンの見せ方。
   * `section` は画面内に常設する導線で、ヘッダーと同じダイアログを開く。
   * 記録の内容によってこの見せ方を切り替えてはいけない。
   * 変化が多い日だけ強調することは、アプリによる危険度の推定にあたる。
   */
  placement?: "header" | "section";
  /** 開くボタンの文言。COPY から渡す */
  label?: string;
}

const externalLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

export function ConsultationLinksDialog({
  compact = false,
  placement = "header",
  label = "相談先",
}: ConsultationLinksDialogProps) {
  const isSection = placement === "section";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={isSection ? "default" : "sm"}
          className={cn(
            "border-primary/40 text-primary",
            isSection ? "w-full" : "shrink-0 px-3",
            !isSection && compact && "min-h-10"
          )}
          aria-label={`${label}を開く`}
        >
          <LifeBuoy className="h-4 w-4" aria-hidden="true" />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b px-5 pb-4 pr-14 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" aria-hidden="true" />
            困ったときの相談先
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            状況に近いものを選んでください。ヨルケアが状態を判定したり、相談内容を送信したりすることはありません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <section
            className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4"
            aria-labelledby="urgent-support-heading"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <h2 id="urgent-support-heading" className="font-semibold">
                  いま、命や身体に差し迫った危険がある
                </h2>
                {/* 入力内容をきっかけに出すのではなく、ここに常設する */}
                <h3 className="sr-only">{COPY.support.safetyHeading}</h3>
                <ul className="mt-1 space-y-1 text-sm leading-relaxed text-muted-foreground">
                  {COPY.support.safetyItems.map((item) => (
                    <li key={item} className="flex gap-1.5">
                      <span aria-hidden="true">・</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.values(EMERGENCY_RESOURCES).map((resource) => (
                <Button key={resource.href} asChild variant="destructive" className="px-2">
                  <a href={resource.href} aria-label={`${resource.label} ${resource.phoneNumber}に電話`}>
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {resource.phoneNumber}
                  </a>
                </Button>
              ))}
            </div>
          </section>

          <section
            className="rounded-2xl border bg-card p-4"
            aria-labelledby="immediate-support-heading"
          >
            <div className="flex items-start gap-3">
              <HeartHandshake
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 id="immediate-support-heading" className="font-semibold">
                  つらい気持ちを、今すぐ誰かに話したい
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  #いのちSOSは、無料で24時間相談できます。
                </p>
              </div>
            </div>
            <Button asChild className="mt-3 w-full">
              <a
                href={IMMEDIATE_SUPPORT_RESOURCE.href}
                aria-label={`${IMMEDIATE_SUPPORT_RESOURCE.label} ${IMMEDIATE_SUPPORT_RESOURCE.phoneNumber}に電話`}
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {IMMEDIATE_SUPPORT_RESOURCE.phoneNumber}に電話
              </a>
            </Button>
            <Button asChild variant="outline" className="mt-2 w-full whitespace-normal py-2 text-sm">
              <a href={OFFICIAL_SUPPORT_LINKS.mamorouyoKokoro.href} {...externalLinkProps}>
                電話・SNSなど、ほかの窓口を選ぶ
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            </Button>
          </section>

          <section
            className="rounded-2xl border bg-card p-4"
            aria-labelledby="work-support-heading"
          >
            <div className="flex items-start gap-3">
              <BriefcaseBusiness
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 id="work-support-heading" className="font-semibold">
                  仕事や復職について相談したい
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  働く人の「こころの耳」で、電話・SNS・メールから選べます。
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="mt-3 w-full whitespace-normal py-2 text-sm">
              <a href={OFFICIAL_SUPPORT_LINKS.kokoroNoMimi.href} {...externalLinkProps}>
                こころの耳の相談窓口を開く
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            </Button>
          </section>

          <section className="rounded-2xl bg-muted p-4" aria-labelledby="medical-support-heading">
            <div className="flex items-start gap-3">
              <Stethoscope
                className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <h2 id="medical-support-heading" className="font-semibold">
                  診断・治療・薬について相談したい
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  主治医や医療機関へ相談してください。ヨルケアは診断・治療・処方、危機判定、24時間監視の代わりにはなりません。
                </p>
              </div>
            </div>
          </section>

          {/* 全国の窓口（表示順1〜2位）を保ったうえで、東京都内の支援先を続けて置く */}
          <SupportResourceFinder />

          <p className="text-xs leading-relaxed text-muted-foreground">
            この画面を開いても、記録内容はどの窓口にも送られません。電話や外部サイトは、本人が選んだときだけ開きます。受付状況は各公式ページでご確認ください。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

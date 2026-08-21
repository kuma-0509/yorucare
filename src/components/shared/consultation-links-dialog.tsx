"use client";

import {
  BriefcaseBusiness,
  ExternalLink,
  HeartHandshake,
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
} from "@/components/ui/dialog";
import {
  EMERGENCY_RESOURCES,
  IMMEDIATE_SUPPORT_RESOURCE,
  OFFICIAL_SUPPORT_LINKS,
} from "@/lib/consultation-resources";

interface ConsultationLinksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const externalLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

/** 開く操作はヘッダーのメニュー（`AppMenu`）が持ち、ここは中身だけを受け持つ */
export function ConsultationLinksDialog({
  open,
  onOpenChange,
}: ConsultationLinksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  安全な場所へ移り、近くの人にも助けを求めてください。救急・消防は119、事件・事故は110です。
                </p>
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

          <p className="text-xs leading-relaxed text-muted-foreground">
            この画面を開いても、記録内容はどの窓口にも送られません。電話や外部サイトは、本人が選んだときだけ開きます。受付状況は各公式ページでご確認ください。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

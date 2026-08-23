"use client";

import { useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  HeartHandshake,
  MapPin,
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
import {
  findTokyoSupportFacilities,
  getTelephoneNumber,
  TOKYO_MUNICIPALITIES,
  TOKYO_OPEN_DATASETS,
  TOKYO_WELFARE_SURVEY_CONTEXT,
  toTelephoneHref,
} from "@/lib/tokyo-open-data";

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
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const localFacilities = findTokyoSupportFacilities(selectedMunicipality);

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

          <section
            className="rounded-2xl border bg-card p-4"
            aria-labelledby="tokyo-local-support-heading"
          >
            <div className="flex items-start gap-3">
              <MapPin
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 id="tokyo-local-support-heading" className="font-semibold">
                  東京都内で、地域の窓口を探したい
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  住まいの区市町村を選ぶと、地域の保健所・保健センターを住所と電話番号つきで表示します。
                </p>
              </div>
            </div>

            <label
              htmlFor="tokyo-municipality"
              className="mt-4 block text-sm font-medium"
            >
              区市町村
            </label>
            <select
              id="tokyo-municipality"
              value={selectedMunicipality}
              onChange={(event) => setSelectedMunicipality(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border-2 border-input bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-describedby="tokyo-municipality-note"
            >
              <option value="">選んでください</option>
              {TOKYO_MUNICIPALITIES.map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </select>
            <p
              id="tokyo-municipality-note"
              className="mt-2 text-xs leading-relaxed text-muted-foreground"
            >
              選んだ地域は保存・送信しません。現在地も取得しません。
            </p>

            {selectedMunicipality ? (
              <div className="mt-4" aria-live="polite">
                <p className="text-sm font-semibold">
                  {selectedMunicipality}の窓口（{localFacilities.length}件）
                </p>
                {localFacilities.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {localFacilities.map((facility) => {
                      const phoneNumber = getTelephoneNumber(facility.phone);

                      return (
                        <li
                          key={`${facility.name}-${facility.address}`}
                          className="rounded-xl border bg-muted/40 p-3"
                        >
                          <div className="flex items-start gap-2">
                            <Building2
                              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-relaxed">
                                {facility.name}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                〒{facility.postalCode} {facility.address}
                              </p>
                            </div>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full bg-white"
                          >
                            <a
                              href={toTelephoneHref(phoneNumber)}
                              aria-label={`${facility.name} ${phoneNumber}に電話`}
                            >
                              <Phone className="h-4 w-4" aria-hidden="true" />
                              {phoneNumber}に電話
                            </a>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    この一覧に窓口がありません。東京都の公式ページで最新情報をご確認ください。
                  </p>
                )}
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  相談できる内容や受付時間は窓口ごとに異なります。電話でご確認ください。
                </p>
              </div>
            ) : null}

            <div className="mt-4 rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">この案内の背景</p>
              <p className="mt-1">
                東京都の{TOKYO_WELFARE_SURVEY_CONTEXT.year}調査（回答者
                {TOKYO_WELFARE_SURVEY_CONTEXT.respondents.toLocaleString("ja-JP")}
                人）では、{TOKYO_WELFARE_SURVEY_CONTEXT.description}
                地域の相談先を見つけやすくする背景資料として利用しています。
              </p>
            </div>
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

          <details className="rounded-xl border px-3 py-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer py-1 font-medium text-foreground">
              利用している東京都オープンデータ（4件）
            </summary>
            <ul className="mt-2 space-y-2">
              {Object.values(TOKYO_OPEN_DATASETS).map((dataset) => (
                <li key={dataset.href}>
                  <a
                    href={dataset.href}
                    className="inline-flex items-start gap-1 underline underline-offset-2"
                    {...externalLinkProps}
                  >
                    <span>{dataset.title}</span>
                    <ExternalLink
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 leading-relaxed">
              出典：東京都（
              <a
                href="https://creativecommons.org/licenses/by/4.0/deed.ja"
                className="underline underline-offset-2"
                {...externalLinkProps}
              >
                CC BY 4.0
              </a>
              ）。施設情報はCSVの文字コードをUTF-8へ変換し、3つの一覧を統合して表示しています。内容は変更される場合があるため、利用前に公式情報をご確認ください。
            </p>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hasReviewConsent,
  installReviewConsentResetHelper,
  saveReviewConsent,
} from "@/lib/review-consent";

type ConsentState = "checking" | "needsConsent" | "consented";

const REVIEW_POINTS = [
  "入力しやすいか",
  "必要な入力項目や機能があるか",
  "不要に感じる機能や文章があるか",
  "説明が足りないところ、または説明が多すぎるところがあるか",
];

const PRIVATE_INFORMATION_EXAMPLES = [
  "本名",
  "住所",
  "電話番号",
  "勤務先名",
  "診断名",
  "詳しい服薬名",
  "その他、個人が特定される可能性のある情報",
];

export function ReviewConsentDialog() {
  const [consentState, setConsentState] =
    useState<ConsentState>("checking");

  useEffect(() => {
    installReviewConsentResetHelper();
    setConsentState(hasReviewConsent() ? "consented" : "needsConsent");
  }, []);

  const handleAgree = () => {
    saveReviewConsent();
    setConsentState("consented");
  };

  if (consentState !== "needsConsent") return null;

  return (
    <DialogPrimitive.Root open modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/45 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby="review-consent-description"
          className="fixed left-1/2 top-1/2 z-[61] flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl focus-visible:outline-none sm:w-[calc(100%-2rem)]"
          data-testid="review-consent-dialog"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-secondary p-2 text-secondary-foreground">
                <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  ヨルケアの画面レビューにご協力ください
                </DialogPrimitive.Title>
                <DialogPrimitive.Description
                  id="review-consent-description"
                  className="mt-2 text-sm leading-relaxed text-muted-foreground"
                >
                  ヨルケアは、自身の心身の体調を記録し、セルフケアをサポートすることを目的としたアプリです。
                </DialogPrimitive.Description>
              </div>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-foreground">
              <p>
                現在は、最適な画面設計を検証するためのレビュー用アプリです。
              </p>
              <section>
                <h2 className="text-base font-semibold text-foreground">
                  レビューで見てほしいこと
                </h2>
                <p className="mt-2">
                  実際に画面を触っていただき、以下の点について感じたことを教えてください。
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {REVIEW_POINTS.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-caution-border bg-caution/70 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-caution-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="font-semibold text-caution-foreground">
                      個人が特定される情報は入力しないでください
                    </h2>
                    <p className="mt-2 text-caution-foreground">
                      本アプリは検証用のため、個人情報や情報漏洩によるリスクがある情報は入力しないでください。
                    </p>
                  </div>
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-caution-foreground">
                  {PRIVATE_INFORMATION_EXAMPLES.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground">
                  保存について
                </h2>
                <p className="mt-2 text-muted-foreground">
                  入力された記録は、この端末のブラウザ内に保存されます。共有端末では、個人情報の入力にご注意ください。不要になった記録は削除できます。
                </p>
              </section>
            </div>
          </div>

          <div className="border-t border-border bg-white px-5 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-6">
            <Button
              type="button"
              className="w-full"
              data-testid="review-consent-agree"
              onClick={handleAgree}
            >
              同意してレビューを始める
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

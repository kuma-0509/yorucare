"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CollapsibleSection } from "@/components/shared/collapsible-section";
import { LiveRegion } from "@/components/shared/live-region";
import {
  buildAiShareText,
  type AiShareField,
  type AiShareTextResult,
} from "@/lib/ai-share-text";
import { detectChanges } from "@/lib/ai/detect-changes";
import { COPY } from "@/lib/copy";
import { getLast7Days, getTodayString } from "@/lib/dates";
import { createDemoTokyoAdapter } from "@/lib/support/adapter";
import type { SupportResource } from "@/lib/support/types";
import type { DailyRecord, SelfCareItem } from "@/lib/types";

interface AiSharePanelProps {
  records: DailyRecord[];
  selfCareItems: SelfCareItem[];
}

interface FieldOption {
  id: AiShareField;
  label: string;
  description: string;
  sensitive?: boolean;
}

const FIELD_OPTIONS: FieldOption[] = [
  {
    id: "mood",
    label: "気分・状態",
    description: "気分の段階と選んだ状態ラベル",
  },
  {
    id: "sleep",
    label: "睡眠",
    description: "就寝・起床時刻と睡眠時間",
  },
  {
    id: "selfCare",
    label: "セルフケア",
    description: "実施した項目名とメモ",
    sensitive: true,
  },
  {
    id: "medication",
    label: "服薬",
    description: "服薬状況",
    sensitive: true,
  },
  {
    id: "warning",
    label: "しんどさのサイン",
    description: "段階、選択項目、メモ",
    sensitive: true,
  },
  {
    id: "notes",
    label: "自由記述",
    description: "日々のメモ全文",
    sensitive: true,
  },
];

const DEFAULT_FIELDS: AiShareField[] = ["mood", "sleep"];

type Preview = Extract<AiShareTextResult, { ok: true }>;

export function AiSharePanel({
  records,
  selfCareItems,
}: AiSharePanelProps) {
  const defaultDays = getLast7Days();
  const [startDate, setStartDate] = useState(defaultDays[0]);
  const [endDate, setEndDate] = useState(defaultDays[defaultDays.length - 1]);
  const [fields, setFields] = useState<AiShareField[]>(DEFAULT_FIELDS);
  // 追加項目は初期状態でオフ。入れるかどうかは毎回本人が選ぶ
  const [includeFacts, setIncludeFacts] = useState(false);
  const [supportNames, setSupportNames] = useState<string[]>([]);
  const [supportResources, setSupportResources] = useState<SupportResource[]>(
    []
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [supportsWebShare, setSupportsWebShare] = useState(false);

  useEffect(() => {
    setSupportsWebShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    let active = true;
    void createDemoTokyoAdapter()
      .loadResources()
      .then((result) => {
        if (!active || !result.ok) return;
        setSupportResources(result.value);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPreview(null);
    setConfirmed(false);
    setMessage(null);
  }, [records, selfCareItems]);

  /** 事実が1件も作れない期間かどうか。0件を「0日」として書かないための判定 */
  const availableFactCount = useMemo(
    () => detectChanges(records, startDate, endDate).facts.length,
    [records, startDate, endDate]
  );

  const invalidatePreview = () => {
    setPreview(null);
    setConfirmed(false);
    setMessage(null);
  };

  const toggleField = (field: AiShareField) => {
    setFields((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field]
    );
    invalidatePreview();
  };

  const toggleSupportName = (name: string) => {
    setSupportNames((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
    invalidatePreview();
  };

  const handlePreview = () => {
    // 事実は選んだ期間で数える。共有する記録と数字がずれないようにする
    const facts = includeFacts
      ? detectChanges(records, startDate, endDate).facts
      : [];
    const result = buildAiShareText({
      records,
      selfCareItems,
      startDate,
      endDate,
      fields,
      changeFacts: facts.length > 0 ? facts : undefined,
      referencedSupportNames:
        supportNames.length > 0 ? supportNames : undefined,
    });
    if (!result.ok) {
      setPreview(null);
      setConfirmed(false);
      setMessage(result.message);
      return;
    }
    setPreview(result);
    setConfirmed(false);
    setMessage(
      `${result.recordCount}日分のテキストを作りました。内容を確認してください。`
    );
  };

  const handleShare = async () => {
    if (!preview || !confirmed || busy) return;
    if (typeof navigator.share !== "function") {
      setMessage(
        "このブラウザでは共有先を直接選べません。コピーまたはテキスト保存をご利用ください。"
      );
      return;
    }

    setBusy(true);
    try {
      await navigator.share({
        title: "ヨルケア 振り返り用テキスト",
        text: preview.text,
      });
      setMessage(
        "共有先へ渡しました。共有先での保存・削除・AI利用設定をご確認ください。"
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage("共有をキャンセルしました。");
      } else {
        setMessage(
          "共有先を開けませんでした。コピーまたはテキスト保存をお試しください。"
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!preview || !confirmed || busy) return;
    if (!navigator.clipboard?.writeText) {
      setMessage(
        "このブラウザではコピーできません。テキスト保存をご利用ください。"
      );
      return;
    }

    setBusy(true);
    try {
      await navigator.clipboard.writeText(preview.text);
      setMessage(
        "テキストをコピーしました。貼り付け後は、端末のクリップボードにも残る場合があります。"
      );
    } catch {
      setMessage(
        "コピーできませんでした。テキスト保存をご利用ください。"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!preview || !confirmed || busy) return;
    const blob = new Blob([preview.text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = preview.filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage(
      "テキストファイルを保存しました。不要になったファイルは端末から削除してください。"
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">生成AIなどへ共有</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            選んだ記録をこの端末内でテキストにし、スマートフォンの共有先から、ご自身が使う生成AIなどを選べます。
          </p>
          <p>
            ヨルケアのサーバーには送信しません。共有後の保存・学習利用・削除は共有先サービスの設定に従い、ヨルケアから取り消せません。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai-share-start-date">開始日</Label>
            <Input
              id="ai-share-start-date"
              type="date"
              max={getTodayString()}
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                invalidatePreview();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-share-end-date">終了日</Label>
            <Input
              id="ai-share-end-date"
              type="date"
              max={getTodayString()}
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                invalidatePreview();
              }}
            />
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          一度に共有できる期間は7日間までです。
        </p>

        <fieldset className="space-y-3">
          <legend className="text-base font-medium">共有する項目</legend>
          <div className="space-y-2">
            {FIELD_OPTIONS.map((option) => {
              const checked = fields.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-3"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                    checked={checked}
                    onChange={() => toggleField(option.id)}
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">
                      {option.label}
                      {option.sensitive && (
                        <span className="ml-2 text-xs font-normal text-caution-foreground">
                          内容をよく確認
                        </span>
                      )}
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-medium">あわせて入れる項目</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
              checked={includeFacts}
              onChange={(event) => {
                setIncludeFacts(event.target.checked);
                invalidatePreview();
              }}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                {COPY.shareExtras.factsOption}
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                {COPY.shareExtras.factsDescription}
              </span>
              {includeFacts && availableFactCount === 0 && (
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {COPY.shareExtras.noFactsAvailable}
                </span>
              )}
            </span>
          </label>

          <CollapsibleSection
            title={COPY.shareExtras.supportOption}
            description={COPY.shareExtras.supportDescription}
          >
            <div
              role="group"
              aria-label={COPY.shareExtras.supportPickerLegend}
              className="space-y-2"
            >
              {supportResources.map((resource) => (
                <label
                  key={resource.id}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-3"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                    checked={supportNames.includes(resource.name)}
                    onChange={() => toggleSupportName(resource.name)}
                  />
                  <span className="text-sm leading-relaxed">
                    {resource.name}
                  </span>
                </label>
              ))}
            </div>
          </CollapsibleSection>
        </fieldset>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handlePreview}
          disabled={fields.length === 0}
        >
          共有する全文を確認する
        </Button>

        {preview && (
          <div className="space-y-4 rounded-xl border-2 border-primary/30 bg-muted/40 p-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">共有される全文</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                氏名など、共有先へ渡したくない内容が含まれていないか確認してください。
              </p>
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs leading-relaxed">
              {preview.text}
            </pre>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-caution-border bg-caution/40 p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span className="text-sm leading-relaxed">
                共有される全文と、共有後はヨルケアから削除・取り消しできないことを確認しました。
              </span>
            </label>

            <div className="space-y-2">
              <Button
                type="button"
                className="w-full"
                disabled={!confirmed || busy || !supportsWebShare}
                onClick={() => void handleShare()}
              >
                <Share2 className="h-5 w-5" aria-hidden="true" />
                {busy ? "共有先を開いています…" : "スマホの共有先を選ぶ"}
              </Button>
              {!supportsWebShare && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  このブラウザは共有先の直接選択に対応していません。下のコピーまたはテキスト保存をご利用ください。
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!confirmed || busy}
                onClick={() => void handleCopy()}
              >
                <Copy className="h-5 w-5" aria-hidden="true" />
                テキストをコピー
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!confirmed || busy}
                onClick={handleDownload}
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                テキストファイルを保存
              </Button>
            </div>
          </div>
        )}

        {message && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        )}
        <LiveRegion message={message} />
      </CardContent>
    </Card>
  );
}

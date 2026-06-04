"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChipButton, OptionButton } from "@/components/shared/option-button";
import {
  MEDICATION_OPTIONS,
  MOOD_LABEL_NEGATIVE,
  MOOD_LABEL_NEUTRAL,
  MOOD_LABEL_POSITIVE,
  MOOD_OPTIONS,
  WARNING_LEVEL_OPTIONS,
  WARNING_TAGS_MOOD,
  WARNING_TAGS_OTHER,
  WARNING_TAGS_SLEEP,
  WARNING_TAGS_WORK,
} from "@/lib/constants";
import {
  formatDisplayDate,
  getTodayString,
  getYesterdayString,
} from "@/lib/dates";
import { buildRecordSummaryLines } from "@/lib/format";
import { calculateSleepMinutes, formatSleepDuration } from "@/lib/sleep";
import {
  addSelfCareItem,
  getAllSelfCareItems,
  getRecordByDate,
  initSelfCareIfEmpty,
  recordToFormState,
  saveRecord,
} from "@/lib/storage";
import type { AppTab } from "@/lib/types";
import type { DailyRecord, SelfCareItem } from "@/lib/types";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";

const MAX_MOOD_LABELS = 3;

type FormState = Omit<
  DailyRecord,
  "id" | "createdAt" | "updatedAt" | "sleepMinutes"
>;

interface TodayRecordTabProps {
  initialDate?: string;
  onNavigateTab: (tab: AppTab, options?: { recordDate?: string }) => void;
  refreshKey?: number;
}

export function TodayRecordTab({
  initialDate,
  onNavigateTab,
  refreshKey = 0,
}: TodayRecordTabProps) {
  const today = getTodayString();
  const yesterday = getYesterdayString();
  const allowedDates = [today, yesterday];

  const [targetDate, setTargetDate] = useState(
    initialDate && allowedDates.includes(initialDate) ? initialDate : today
  );
  const [form, setForm] = useState<FormState>(() =>
    recordToFormState(null, today)
  );
  const [selfCareItems, setSelfCareItems] = useState<SelfCareItem[]>([]);
  const [moodLimitMessage, setMoodLimitMessage] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [savedRecord, setSavedRecord] = useState<DailyRecord | null>(null);
  const [showMemo, setShowMemo] = useState(false);
  const [newSelfCareTitle, setNewSelfCareTitle] = useState("");
  const [showAddSelfCare, setShowAddSelfCare] = useState(false);

  const loadForm = useCallback((date: string) => {
    const record = getRecordByDate(date);
    setForm(recordToFormState(record, date));
    setShowSaved(false);
    setSavedRecord(null);
  }, []);

  useEffect(() => {
    initSelfCareIfEmpty();
    setSelfCareItems(getAllSelfCareItems());
  }, [refreshKey]);

  useEffect(() => {
    if (initialDate && allowedDates.includes(initialDate)) {
      setTargetDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    loadForm(targetDate);
  }, [targetDate, loadForm, refreshKey]);

  const sleepMinutes = calculateSleepMinutes(form.sleepStart, form.sleepEnd);

  const toggleMoodLabel = (label: string) => {
    setMoodLimitMessage("");
    setForm((prev) => {
      const has = prev.moodLabels.includes(label);
      if (has) {
        return {
          ...prev,
          moodLabels: prev.moodLabels.filter((l) => l !== label),
        };
      }
      if (prev.moodLabels.length >= MAX_MOOD_LABELS) {
        setMoodLimitMessage("最大3つまで選べます");
        return prev;
      }
      return { ...prev, moodLabels: [...prev.moodLabels, label] };
    });
  };

  const toggleWarningTag = (tag: string) => {
    setForm((prev) => {
      const has = prev.warningTags.includes(tag);
      const nextTags = has
        ? prev.warningTags.filter((t) => t !== tag)
        : [...prev.warningTags, tag];
      return { ...prev, warningTags: nextTags };
    });
  };

  const toggleSelfCare = (id: string) => {
    setForm((prev) => {
      const has = prev.selfCareIds.includes(id);
      return {
        ...prev,
        selfCareIds: has
          ? prev.selfCareIds.filter((sid) => sid !== id)
          : [...prev.selfCareIds, id],
      };
    });
  };

  const handleAddSelfCareInline = () => {
    const title = newSelfCareTitle.trim();
    if (!title) return;
    const item = addSelfCareItem(title);
    setSelfCareItems(getAllSelfCareItems());
    setForm((prev) => ({
      ...prev,
      selfCareIds: [...prev.selfCareIds, item.id],
    }));
    setNewSelfCareTitle("");
    setShowAddSelfCare(false);
  };

  const handleSave = () => {
    const record = saveRecord(targetDate, {
      ...form,
      id: getRecordByDate(targetDate)?.id,
    });
    setSavedRecord(record);
    setShowSaved(true);
    setSelfCareItems(getAllSelfCareItems());
  };

  const showWarningTags =
    form.warningLevel === "small" || form.warningLevel === "yes";

  if (showSaved && savedRecord) {
    const lines = buildRecordSummaryLines(savedRecord, selfCareItems);
    return (
      <div className="space-y-5 pb-4">
        <div className="rounded-2xl bg-secondary p-5 text-center">
          <p className="text-lg font-medium text-secondary-foreground">
            記録できました。
          </p>
          <p className="mt-2 text-sm leading-relaxed text-secondary-foreground opacity-90">
            今日の自分を残せたことも、セルフケアのひとつです。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {targetDate === today ? "今日の記録" : "記録のまとめ"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map(({ label, value }) => (
              <div key={label} className="text-base">
                <span className="text-muted-foreground">
                  {label}：
                </span>
                <span>{value}</span>
              </div>
            ))}
            {savedRecord.note && (
              <div className="text-base pt-1 border-t">
                <span className="text-muted-foreground">
                  特記事項：
                </span>
                <p className="mt-1 whitespace-pre-wrap">{savedRecord.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button
            variant="default"
            size="lg"
            onClick={() => {
              setShowSaved(false);
              loadForm(targetDate);
            }}
          >
            今日の記録を編集する
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => onNavigateTab("records")}
          >
            記録一覧を見る
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setShowSaved(false)}
          >
            閉じる
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">今日のセルフケア記録</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          今日のことを少しだけ残しておきましょう。
          <br />
          気分だけでも大丈夫です。
        </p>
      </header>

      <div className="flex gap-2">
        {[today, yesterday].map((d) => (
          <Button
            key={d}
            type="button"
            variant={targetDate === d ? "default" : "outline"}
            className="flex-1"
            onClick={() => setTargetDate(d)}
          >
            {d === today ? "今日" : "昨日"}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {formatDisplayDate(targetDate)}
      </p>

      {/* 気分 */}
      <Card>
        <CardHeader>
          <CardTitle>今日の気分</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">
              総合気分
            </Label>
            <div className="space-y-2">
              {MOOD_OPTIONS.map(({ score, label }) => (
                <OptionButton
                  key={score}
                  selected={form.moodScore === score}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      moodScore: prev.moodScore === score ? null : score,
                    }))
                  }
                >
                  {label}
                </OptionButton>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">
              感情タグ（最大3つ）
            </Label>
            {moodLimitMessage && (
              <p className="mb-2 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
                {moodLimitMessage}
              </p>
            )}
            <MoodLabelGroup
              title="ポジティブ"
              labels={MOOD_LABEL_POSITIVE}
              selected={form.moodLabels}
              onToggle={toggleMoodLabel}
            />
            <MoodLabelGroup
              title="中間・ゆらぎ"
              labels={MOOD_LABEL_NEUTRAL}
              selected={form.moodLabels}
              onToggle={toggleMoodLabel}
            />
            <MoodLabelGroup
              title="ネガティブ"
              labels={MOOD_LABEL_NEGATIVE}
              selected={form.moodLabels}
              onToggle={toggleMoodLabel}
            />
          </div>
        </CardContent>
      </Card>

      {/* 睡眠 */}
      <Card>
        <CardHeader>
          <CardTitle>睡眠</CardTitle>
          <CardDescription>だいたいの時間で大丈夫です。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sleep-start">寝た時間</Label>
            <Input
              id="sleep-start"
              type="time"
              className="mt-2"
              value={form.sleepStart ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  sleepStart: e.target.value || null,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="sleep-end">起きた時間</Label>
            <Input
              id="sleep-end"
              type="time"
              className="mt-2"
              value={form.sleepEnd ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  sleepEnd: e.target.value || null,
                }))
              }
            />
          </div>
          <p className="rounded-xl bg-muted px-4 py-3 text-sm">
            睡眠時間：
            <span className="font-medium">
              {form.sleepStart && form.sleepEnd
                ? formatSleepDuration(sleepMinutes)
                : "未計算"}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* 服薬 */}
      <Card>
        <CardHeader>
          <CardTitle>服薬</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {MEDICATION_OPTIONS.map(({ value, label }) => (
            <OptionButton
              key={value}
              selected={form.medication === value}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  medication: prev.medication === value ? null : value,
                }))
              }
            >
              {label}
            </OptionButton>
          ))}
        </CardContent>
      </Card>

      {/* 注意サイン */}
      <Card>
        <CardHeader>
          <CardTitle>注意サイン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {WARNING_LEVEL_OPTIONS.map(({ value, label }) => (
              <OptionButton
                key={value}
                selected={form.warningLevel === value}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    warningLevel: prev.warningLevel === value ? null : value,
                    warningTags:
                      value === "none" ? [] : prev.warningTags,
                    warningNote:
                      value === "none" ? "" : prev.warningNote,
                  }))
                }
              >
                {label}
              </OptionButton>
            ))}
          </div>

          {showWarningTags && (
            <div className="space-y-4 border-t pt-4">
              <WarningTagGroup
                title="睡眠・生活リズム"
                tags={WARNING_TAGS_SLEEP}
                selected={form.warningTags}
                onToggle={toggleWarningTag}
              />
              <WarningTagGroup
                title="気分・感情"
                tags={WARNING_TAGS_MOOD}
                selected={form.warningTags}
                onToggle={toggleWarningTag}
              />
              <WarningTagGroup
                title="仕事・外出"
                tags={WARNING_TAGS_WORK}
                selected={form.warningTags}
                onToggle={toggleWarningTag}
              />
              <WarningTagGroup
                title="その他"
                tags={WARNING_TAGS_OTHER}
                selected={form.warningTags}
                onToggle={toggleWarningTag}
              />
              {form.warningTags.includes("その他") && (
                <div>
                  <Label htmlFor="warning-note">その他の内容</Label>
                  <Textarea
                    id="warning-note"
                    className="mt-2"
                    value={form.warningNote}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        warningNote: e.target.value,
                      }))
                    }
                    placeholder="気になることを自由に書いてください"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* セルフケア */}
      <Card>
        <CardHeader>
          <CardTitle>今日できたセルフケア</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selfCareItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              セルフケアタブで登録すると、ここから選べます。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selfCareItems.map((item) => (
                <ChipButton
                  key={item.id}
                  selected={form.selfCareIds.includes(item.id)}
                  onClick={() => toggleSelfCare(item.id)}
                >
                  {item.title}
                </ChipButton>
              ))}
            </div>
          )}

          {showAddSelfCare ? (
            <div className="space-y-2 rounded-xl border-2 border-dashed p-4">
              <Input
                value={newSelfCareTitle}
                onChange={(e) => setNewSelfCareTitle(e.target.value)}
                placeholder="新しいセルフケアの名前"
              />
              <div className="flex gap-2">
                <Button type="button" className="flex-1" onClick={handleAddSelfCareInline}>
                  追加する
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddSelfCare(false)}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="soft"
              className="w-full"
              onClick={() => setShowAddSelfCare(true)}
            >
              <Plus className="h-4 w-4" />
              今日できたセルフケアを追加
            </Button>
          )}

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm text-primary"
            onClick={() => setShowMemo(!showMemo)}
          >
            <span>＋ メモを書く</span>
            {showMemo ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showMemo && (
            <div>
              <Label htmlFor="selfcare-memo">
                今日のセルフケアについて、少し残したいこと
              </Label>
              <Textarea
                id="selfcare-memo"
                className="mt-2"
                value={form.selfCareMemo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    selfCareMemo: e.target.value,
                  }))
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 特記事項 */}
      <Card>
        <CardHeader>
          <CardTitle>特記事項</CardTitle>
          <CardDescription>
            今日のことで、少し残しておきたいことがあれば書いてください。
            空欄でも大丈夫です。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.note}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, note: e.target.value }))
            }
            placeholder={
              "例：仕事後に疲れて、帰宅後は動けなかった。\n例：朝はしんどかったけど、夜は少し落ち着いた。\n例：散歩したら少し気分が切り替わった。"
            }
          />
        </CardContent>
      </Card>

      <Button type="button" size="lg" className="w-full" onClick={handleSave}>
        記録を保存する
      </Button>
    </div>
  );
}

function MoodLabelGroup({
  title,
  labels,
  selected,
  onToggle,
}: {
  title: string;
  labels: readonly string[];
  selected: string[];
  onToggle: (label: string) => void;
}) {
  return (
    <div className="mb-3">
      <p className="mb-2 text-xs text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <ChipButton
            key={label}
            selected={selected.includes(label)}
            onClick={() => onToggle(label)}
          >
            {label}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}

function WarningTagGroup({
  title,
  tags,
  selected,
  onToggle,
}: {
  title: string;
  tags: readonly string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <ChipButton
            key={tag}
            selected={selected.includes(tag)}
            onClick={() => onToggle(tag)}
          >
            {tag}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}

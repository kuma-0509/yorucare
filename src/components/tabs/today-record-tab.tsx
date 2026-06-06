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
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { CollapsibleSection } from "@/components/shared/collapsible-section";
import { LiveRegion } from "@/components/shared/live-region";
import {
  ChipButton,
  SelectionControl,
  SelectionGroup,
} from "@/components/shared/option-button";
import { SaveRecordButton } from "@/components/shared/save-record-button";
import { trackRecordSaved } from "@/lib/analytics";
import { COPY } from "@/lib/copy";
import { storageErrorMessage } from "@/lib/result";
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
  formatDatePickerLabel,
  formatDisplayDate,
  getLast7Days,
  getTodayString,
  isWithinLast7Days,
} from "@/lib/dates";
import { buildRecordSummaryLines } from "@/lib/format";
import { calculateSleepMinutes, formatSleepDuration } from "@/lib/sleep";
import {
  addSelfCareItem,
  getAllRecords,
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
const MAX_NOTE_LENGTH = 2000;
const MAX_SELF_CARE_TITLE_LENGTH = 100;

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
  const weekDates = [...getLast7Days()].reverse();

  const [targetDate, setTargetDate] = useState(
    initialDate && isWithinLast7Days(initialDate) ? initialDate : today
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
  const [saving, setSaving] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

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
    if (initialDate && isWithinLast7Days(initialDate)) {
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
    const result = addSelfCareItem(title);
    if (!result.ok) {
      setLiveMessage(storageErrorMessage(result.error));
      return;
    }
    setSelfCareItems(getAllSelfCareItems());
    setForm((prev) => ({
      ...prev,
      selfCareIds: [...prev.selfCareIds, result.value.id],
    }));
    setNewSelfCareTitle("");
    setShowAddSelfCare(false);
  };

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    const hadRecordsBefore = getAllRecords().length > 0;
    const result = saveRecord(targetDate, {
      ...form,
      id: getRecordByDate(targetDate)?.id,
    });
    setSaving(false);
    if (!result.ok) {
      setLiveMessage(storageErrorMessage(result.error));
      return;
    }
    trackRecordSaved(targetDate, !hadRecordsBefore);
    setSavedRecord(result.value);
    setShowSaved(true);
    setLiveMessage("記録できました。");
    setSelfCareItems(getAllSelfCareItems());
  };

  const recordTitle =
    targetDate === today
      ? "今日の記録"
      : `${formatDisplayDate(targetDate)}の記録`;

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
          <p className="mt-3 text-xs leading-relaxed text-secondary-foreground/80">
            記録はこの端末のブラウザだけに残ります。別のスマホやブラウザでは見えません。
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
                  {COPY.memo}：
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
            {targetDate === today
              ? "今日の記録を編集する"
              : `${formatDisplayDate(targetDate)}の記録を編集する`}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => onNavigateTab("records")}
          >
            これまでの記録を見る
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
    <>
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{recordTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {targetDate === today ? (
            <>
              今日のことを少しだけ残しておきましょう。
              <br />
              無理なく記録できればOKです。気分だけ選んで保存しても構いません。
            </>
          ) : (
            <>
              直近1週間の記録を、あとから残したり直したりできます。
              <br />
              気分だけ選んで保存しても構いません。
            </>
          )}
        </p>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {weekDates.map((d) => (
          <Button
            key={d}
            type="button"
            variant={targetDate === d ? "default" : "outline"}
            className="h-auto min-w-[4.25rem] shrink-0 py-2"
            onClick={() => setTargetDate(d)}
          >
            {formatDatePickerLabel(d)}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {formatDisplayDate(targetDate)}
      </p>

      {/* 気分（最短ルート） */}
      <Card>
        <CardHeader>
          <CardTitle>
            {targetDate === today ? "今日の気分" : "気分"}
          </CardTitle>
          <CardDescription>
            今の状態に近いものを選んでください。総合気分だけでも保存できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SelectionGroup legend="総合気分" mode="radio">
            {MOOD_OPTIONS.map(({ score, label }) => (
              <SelectionControl
                key={score}
                selected={form.moodScore === score}
                mode="radio"
                layout="row"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    moodScore: prev.moodScore === score ? null : score,
                  }))
                }
              >
                {label}
              </SelectionControl>
            ))}
          </SelectionGroup>
        </CardContent>
      </Card>

      <CollapsibleSection
        title="くわしく書く（任意）"
        description="気持ち、睡眠、お薬の記録"
      >
        <div>
          <Label className="mb-2 block text-sm text-muted-foreground">
            気持ち（最大3つ）
          </Label>
          {moodLimitMessage && (
            <p className="mb-2 rounded-lg bg-caution px-3 py-2 text-sm text-caution-foreground">
              {moodLimitMessage}
            </p>
          )}
          <MoodLabelGroup
            title="よかった気持ち"
            labels={MOOD_LABEL_POSITIVE}
            selected={form.moodLabels}
            onToggle={toggleMoodLabel}
          />
          <MoodLabelGroup
            title="どちらでもない・ゆらぎ"
            labels={MOOD_LABEL_NEUTRAL}
            selected={form.moodLabels}
            onToggle={toggleMoodLabel}
          />
          <MoodLabelGroup
            title="しんどい気持ち"
            labels={MOOD_LABEL_NEGATIVE}
            selected={form.moodLabels}
            onToggle={toggleMoodLabel}
          />
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <p className="text-base font-semibold">睡眠</p>
            <p className="mt-1 text-sm text-muted-foreground">
              おおよその時間で構いません。書ける範囲で入力してください。
            </p>
          </div>
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
                : COPY.sleepNotEntered}
            </span>
          </p>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div>
            <p className="text-base font-semibold">お薬</p>
            <p className="mt-1 text-sm text-muted-foreground">
              処方など、お薬の記録です。該当がなければ「{COPY.medicationNone}」を選んでください。
            </p>
          </div>
          <SelectionGroup legend="お薬" mode="radio">
            {MEDICATION_OPTIONS.map(({ value, label }) => (
              <SelectionControl
                key={value}
                selected={form.medication === value}
                mode="radio"
                layout="row"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    medication: prev.medication === value ? null : value,
                  }))
                }
              >
                {label}
              </SelectionControl>
            ))}
          </SelectionGroup>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title={`${COPY.warningSign}（任意）`}
        description="いつもと違うしんどさがあれば選んでください。気になることがなければ、選ばなくても構いません。"
        variant="caution"
      >
        <SelectionGroup legend={COPY.warningSign} mode="radio">
          {WARNING_LEVEL_OPTIONS.map(({ value, label }) => (
            <SelectionControl
              key={value}
              selected={form.warningLevel === value}
              mode="radio"
              layout="row"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  warningLevel: prev.warningLevel === value ? null : value,
                  warningTags: value === "none" ? [] : prev.warningTags,
                  warningNote: value === "none" ? "" : prev.warningNote,
                }))
              }
            >
              {label}
            </SelectionControl>
          ))}
        </SelectionGroup>

        {showWarningTags && (
          <div className="space-y-4 border-t border-border pt-4">
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
                  maxLength={MAX_NOTE_LENGTH}
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
      </CollapsibleSection>

      <Card>
        <CardHeader>
          <CardTitle>
            {targetDate === today ? COPY.doneTodayToday : COPY.doneToday}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selfCareItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              「{COPY.tab.selfCare}」タブで登録すると、ここから選べます。
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
                maxLength={MAX_SELF_CARE_TITLE_LENGTH}
                placeholder="新しいできることの名前"
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
              {targetDate === today
                ? `${COPY.doneTodayToday}を追加`
                : `${COPY.doneToday}を追加`}
            </Button>
          )}

          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setShowMemo(!showMemo)}
          >
            <span>＋ {COPY.selfCareAction}のメモを書く</span>
            {showMemo ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showMemo && (
            <div>
              <Label htmlFor="selfcare-memo">
                {targetDate === today
                  ? `今日の${COPY.selfCareAction}について、少し残したいこと`
                  : `${COPY.selfCareAction}について、少し残したいこと`}
              </Label>
              <Textarea
                id="selfcare-memo"
                className="mt-2"
                maxLength={MAX_NOTE_LENGTH}
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

      <Card>
        <CardHeader>
          <CardTitle>{COPY.memoOptional}</CardTitle>
          <CardDescription>
            思いついたこと、体調の変化など、自由に残せます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="record-note" className="sr-only">
            {COPY.memoOptional}
          </Label>
          <Textarea
            id="record-note"
            maxLength={MAX_NOTE_LENGTH}
            value={form.note}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, note: e.target.value }))
            }
            placeholder="気になったこと、体調の変化、明日気をつけたいことなどがあれば入力してください"
          />
        </CardContent>
      </Card>
    </div>

    <StickyActionBar>
      <SaveRecordButton onClick={handleSave} saving={saving} />
    </StickyActionBar>
    <LiveRegion message={liveMessage} />
    </>
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

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
import { MoodCategoryDialog } from "@/components/mood/mood-category-dialog";
import { trackRecordSaved } from "@/lib/analytics";
import { COPY } from "@/lib/copy";
import { storageErrorMessage } from "@/lib/result";
import {
  MAX_NOTE_LENGTH,
  MAX_SELF_CARE_TITLE_LENGTH,
  MAX_MOOD_LABEL_LENGTH,
} from "@/lib/schemas";
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
  createCustomMoodLabel,
  createPredefinedMoodLabel,
  getMoodCategoryDotClass,
  isDuplicateMoodLabel,
  isMoodLabelSelected,
} from "@/lib/mood-labels";
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
import type { DailyRecord, MoodLabelCategory, MoodLabelEntry, SelfCareItem } from "@/lib/types";
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
  onSavedViewChange?: (showing: boolean) => void;
}

export function TodayRecordTab({
  initialDate,
  onNavigateTab,
  refreshKey = 0,
  onSavedViewChange,
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
  const [customMoodInput, setCustomMoodInput] = useState("");
  const [customMoodError, setCustomMoodError] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingCustomLabel, setPendingCustomLabel] = useState("");
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
    setCustomMoodInput("");
    setCustomMoodError("");
    setMoodLimitMessage("");
    setShowCategoryModal(false);
    setPendingCustomLabel("");
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

  useEffect(() => {
    onSavedViewChange?.(showSaved);
    return () => onSavedViewChange?.(false);
  }, [showSaved, onSavedViewChange]);

  const sleepMinutes = calculateSleepMinutes(form.sleepStart, form.sleepEnd);

  const toggleMoodLabel = (label: string) => {
    setMoodLimitMessage("");
    setCustomMoodError("");
    setForm((prev) => {
      const has = isMoodLabelSelected(prev.moodLabels, label);
      if (has) {
        return {
          ...prev,
          moodLabels: prev.moodLabels.filter((entry) => entry.label !== label),
        };
      }
      if (prev.moodLabels.length >= MAX_MOOD_LABELS) {
        setMoodLimitMessage("気持ちは3つまで選べます");
        return prev;
      }
      const entry = createPredefinedMoodLabel(label);
      if (!entry) return prev;
      return { ...prev, moodLabels: [...prev.moodLabels, entry] };
    });
  };

  const toggleCustomMoodLabel = (entry: MoodLabelEntry) => {
    setMoodLimitMessage("");
    setCustomMoodError("");
    setForm((prev) => {
      const has = isMoodLabelSelected(prev.moodLabels, entry.label);
      if (has) {
        return {
          ...prev,
          moodLabels: prev.moodLabels.filter(
            (item) => item.label !== entry.label
          ),
        };
      }
      if (prev.moodLabels.length >= MAX_MOOD_LABELS) {
        setMoodLimitMessage("気持ちは3つまで選べます");
        return prev;
      }
      return { ...prev, moodLabels: [...prev.moodLabels, entry] };
    });
  };

  const handleCustomMoodAddClick = () => {
    setCustomMoodError("");
    setMoodLimitMessage("");

    const trimmed = customMoodInput.trim();
    if (!trimmed) {
      setCustomMoodError("気持ちを入力してください");
      return;
    }
    if (trimmed.length > MAX_MOOD_LABEL_LENGTH) {
      setCustomMoodError("10文字以内で入力してください");
      return;
    }
    if (isDuplicateMoodLabel(form.moodLabels, trimmed)) {
      setCustomMoodError("同じ気持ちはすでに追加されています");
      return;
    }
    if (form.moodLabels.length >= MAX_MOOD_LABELS) {
      setMoodLimitMessage("気持ちは3つまで選べます");
      return;
    }

    setPendingCustomLabel(trimmed);
    setShowCategoryModal(true);
  };

  const handleCategorySelect = (category: MoodLabelCategory) => {
    const entry = createCustomMoodLabel(pendingCustomLabel, category);
    setForm((prev) => ({
      ...prev,
      moodLabels: [...prev.moodLabels, entry],
    }));
    setCustomMoodInput("");
    setPendingCustomLabel("");
    setShowCategoryModal(false);
    setCustomMoodError("");
  };

  const customMoodEntries = form.moodLabels.filter((entry) => entry.isCustom);

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
      <div className="flex flex-col gap-3">
        <div className="shrink-0 rounded-xl bg-secondary px-3 py-3 text-center">
          <p className="text-base font-medium text-secondary-foreground">
            記録できました。
          </p>
          <p className="mt-0.5 text-sm leading-snug text-secondary-foreground/90">
            今日の自分を残せたことも、セルフケアのひとつです。
          </p>
        </div>

        <Card className="min-h-0">
          <CardHeader className="gap-0 p-3 pb-1">
            <CardTitle className="text-base">
              {targetDate === today ? "今日の記録" : "記録のまとめ"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-3 pb-3 pt-0">
            {lines.map(({ label, value }) => (
              <div key={label} className="text-sm leading-snug">
                <span className="text-muted-foreground">{label}：</span>
                <span>{value}</span>
              </div>
            ))}
            {savedRecord.note && (
              <div className="border-t pt-1.5 text-sm leading-snug">
                <span className="text-muted-foreground">{COPY.memo}：</span>
                <p className="mt-0.5 max-h-14 overflow-y-auto whitespace-pre-wrap">
                  {savedRecord.note}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex shrink-0 flex-col gap-2">
          <Button
            variant="default"
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
            onClick={() => onNavigateTab("records")}
          >
            これまでの記録を見る
          </Button>
          <Button variant="ghost" onClick={() => setShowSaved(false)}>
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
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          気分だけ選んで保存してもOKです。
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

      {/* 気分＝この画面の主役。視覚的な重みで序列を表す */}
      <Card className="border-primary/30 shadow-md ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-xl">
            {targetDate === today ? "今日の気分はどうですか？" : "気分はどうでしたか？"}
          </CardTitle>
          <CardDescription>
            近いものを1つ選んでください。これだけでも保存できます。
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

          {customMoodEntries.length > 0 && (
            <CustomMoodLabelGroup
              entries={customMoodEntries}
              selected={form.moodLabels}
              onToggle={toggleCustomMoodLabel}
            />
          )}

          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              選択肢にない気持ちは、自分の言葉で追加できます
            </p>
            <div className="flex gap-2">
              <Input
                value={customMoodInput}
                onChange={(e) => {
                  setCustomMoodInput(e.target.value);
                  setCustomMoodError("");
                }}
                maxLength={MAX_MOOD_LABEL_LENGTH}
                placeholder="気持ちを追加"
                aria-label="気持ちを追加"
                className="min-h-11 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCustomMoodAddClick();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 shrink-0 px-4"
                onClick={handleCustomMoodAddClick}
              >
                {COPY.add}
              </Button>
            </div>
            {customMoodError && (
              <p className="rounded-lg bg-caution px-3 py-2 text-sm text-caution-foreground">
                {customMoodError}
              </p>
            )}
          </div>
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
    <MoodCategoryDialog
      open={showCategoryModal}
      onOpenChange={setShowCategoryModal}
      onSelect={handleCategorySelect}
    />
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
  selected: MoodLabelEntry[];
  onToggle: (label: string) => void;
}) {
  return (
    <div className="mb-3">
      <p className="mb-2 text-xs text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <ChipButton
            key={label}
            selected={isMoodLabelSelected(selected, label)}
            onClick={() => onToggle(label)}
          >
            {label}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}

function CustomMoodLabelGroup({
  entries,
  selected,
  onToggle,
}: {
  entries: MoodLabelEntry[];
  selected: MoodLabelEntry[];
  onToggle: (entry: MoodLabelEntry) => void;
}) {
  return (
    <div className="mb-3">
      <p className="mb-2 text-xs text-muted-foreground">自分で追加した気持ち</p>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <CustomMoodChip
            key={entry.label}
            entry={entry}
            selected={isMoodLabelSelected(selected, entry.label)}
            onClick={() => onToggle(entry)}
          />
        ))}
      </div>
    </div>
  );
}

function CustomMoodChip({
  entry,
  selected,
  onClick,
}: {
  entry: MoodLabelEntry;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <SelectionControl
      selected={selected}
      layout="chip"
      mode="checkbox"
      accentDotClass={getMoodCategoryDotClass(entry.category)}
      onClick={onClick}
    >
      {entry.label}
    </SelectionControl>
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

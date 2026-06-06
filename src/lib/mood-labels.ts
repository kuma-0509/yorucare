import {
  MOOD_LABEL_NEGATIVE,
  MOOD_LABEL_NEUTRAL,
  MOOD_LABEL_POSITIVE,
} from "./constants";
import type { MoodLabelCategory, MoodLabelEntry } from "./types";

export const MAX_CUSTOM_MOOD_LABEL_LENGTH = 10;

export const MOOD_CATEGORY_OPTIONS: {
  value: MoodLabelCategory;
  label: string;
  chipClass: string;
  chipSelectedClass: string;
  dotClass: string;
}[] = [
  {
    value: "ポジティブ",
    label: "ポジティブ",
    chipClass: "border-[#e8b89a] bg-[#fceee6] text-[#5c4030]",
    chipSelectedClass: "border-[#d9956f] bg-[#f5d0bc] ring-2 ring-[#d9956f]/30",
    dotClass: "bg-[#e8956a]",
  },
  {
    value: "ややポジティブ",
    label: "ややポジティブ",
    chipClass: "border-[#e8d48a] bg-[#fdf6e3] text-[#5c5030]",
    chipSelectedClass: "border-[#d4bc5c] bg-[#f7e8a8] ring-2 ring-[#d4bc5c]/30",
    dotClass: "bg-[#e8c85a]",
  },
  {
    value: "普通",
    label: "普通",
    chipClass: "border-[#c5d9a8] bg-[#f0f6e8] text-[#3d5030]",
    chipSelectedClass: "border-[#a8c488] bg-[#dcebc8] ring-2 ring-[#a8c488]/30",
    dotClass: "bg-[#b8d088]",
  },
  {
    value: "ややネガティブ",
    label: "ややネガティブ",
    chipClass: "border-[#a8cfc0] bg-[#eaf4f0] text-[#2d5048]",
    chipSelectedClass: "border-[#88b8a8] bg-[#cce4dc] ring-2 ring-[#88b8a8]/30",
    dotClass: "bg-[#8fb9a8]",
  },
  {
    value: "ネガティブ",
    label: "ネガティブ",
    chipClass: "border-[#9ebfd4] bg-[#e8f0f6] text-[#2d4558]",
    chipSelectedClass: "border-[#7a9fbf] bg-[#c8dce8] ring-2 ring-[#7a9fbf]/30",
    dotClass: "bg-[#6d92ab]",
  },
];

const ALL_PREDEFINED_LABELS = [
  ...MOOD_LABEL_POSITIVE,
  ...MOOD_LABEL_NEUTRAL,
  ...MOOD_LABEL_NEGATIVE,
] as const;

const LEGACY_CATEGORY_MAP: Record<string, MoodLabelCategory> = {
  positive: "ポジティブ",
  slightly_positive: "ややポジティブ",
  neutral: "普通",
  slightly_negative: "ややネガティブ",
  negative: "ネガティブ",
};

export function getPredefinedCategory(
  label: string
): MoodLabelCategory | null {
  if ((MOOD_LABEL_POSITIVE as readonly string[]).includes(label)) {
    return "ポジティブ";
  }
  if ((MOOD_LABEL_NEUTRAL as readonly string[]).includes(label)) {
    return "普通";
  }
  if ((MOOD_LABEL_NEGATIVE as readonly string[]).includes(label)) {
    return "ネガティブ";
  }
  return null;
}

export function createPredefinedMoodLabel(label: string): MoodLabelEntry | null {
  const category = getPredefinedCategory(label);
  if (!category) return null;
  return { label, category, isCustom: false };
}

export function createCustomMoodLabel(
  label: string,
  category: MoodLabelCategory
): MoodLabelEntry {
  return { label, category, isCustom: true };
}

function normalizeCategory(raw: unknown, label: string): MoodLabelCategory {
  if (typeof raw === "string") {
    if (isMoodLabelCategory(raw)) return raw;
    if (raw in LEGACY_CATEGORY_MAP) {
      return LEGACY_CATEGORY_MAP[raw];
    }
  }
  return getPredefinedCategory(label) ?? "普通";
}

export function normalizeMoodLabel(raw: unknown): MoodLabelEntry | null {
  if (typeof raw === "string") {
    const label = raw.trim();
    if (!label) return null;
    const predefined = createPredefinedMoodLabel(label);
    if (predefined) return predefined;
    return { label, category: "普通", isCustom: true };
  }

  if (
    raw &&
    typeof raw === "object" &&
    "label" in raw &&
    typeof raw.label === "string"
  ) {
    const label = raw.label.trim();
    if (!label) return null;

    const category = normalizeCategory(
      "category" in raw ? raw.category : undefined,
      label
    );

    const isCustom =
      "isCustom" in raw && typeof raw.isCustom === "boolean"
        ? raw.isCustom
        : getPredefinedCategory(label) === null;

    return { label, category, isCustom };
  }

  return null;
}

export function normalizeMoodLabels(raw: unknown): MoodLabelEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: MoodLabelEntry[] = [];

  for (const item of raw) {
    const entry = normalizeMoodLabel(item);
    if (!entry || seen.has(entry.label)) continue;
    seen.add(entry.label);
    result.push(entry);
    if (result.length >= 3) break;
  }

  return result;
}

function isMoodLabelCategory(value: string): value is MoodLabelCategory {
  return MOOD_CATEGORY_OPTIONS.some((option) => option.value === value);
}

export function isMoodLabelSelected(
  entries: MoodLabelEntry[],
  label: string
): boolean {
  return entries.some((entry) => entry.label === label);
}

export function isDuplicateMoodLabel(
  entries: MoodLabelEntry[],
  label: string
): boolean {
  if (isMoodLabelSelected(entries, label)) return true;
  return (ALL_PREDEFINED_LABELS as readonly string[]).includes(label);
}

export function formatMoodLabelsDisplay(entries: MoodLabelEntry[]): string {
  return entries.map((entry) => entry.label).join("、");
}

export function getMoodCategoryStyles(category: MoodLabelCategory): {
  chipClass: string;
  chipSelectedClass: string;
} {
  const option = MOOD_CATEGORY_OPTIONS.find((item) => item.value === category);
  return {
    chipClass: option?.chipClass ?? MOOD_CATEGORY_OPTIONS[2].chipClass,
    chipSelectedClass:
      option?.chipSelectedClass ?? MOOD_CATEGORY_OPTIONS[2].chipSelectedClass,
  };
}

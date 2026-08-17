import { z } from "zod";
import { normalizeMoodLabels } from "./mood-labels";

/**
 * 2: `tomorrowGoal` と `goalReviewStatus` を追加。
 * 3: `selfCareFeeling` を追加。
 * 4: 登録簿へ `kind` と `stateLevels` を追加。
 * いずれも既定値を持つため、前の版の保存データはそのまま読める。
 */
export const STORAGE_SCHEMA_VERSION = 4;
/**
 * 取り込み側は `z.literal` で版を照合するため、既存の書き出しを読めなくしないよう据え置く。
 * 追加フィールドは既定値を持ち、版1の書き出しからも復元できる。
 */
export const EXPORT_VERSION = 1;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_MEDICATION_NOTE_LENGTH = 1000;
export const MAX_GOAL_LENGTH = 100;
export const MAX_SELF_CARE_TITLE_LENGTH = 100;
export const MAX_MOOD_LABEL_LENGTH = 10;
export const MAX_IMPORT_RECORDS = 5000;
export const MAX_IMPORT_SELF_CARE = 1000;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .nullable();
const timestampSchema = z.string().min(1).max(40);
const memoSchema = z.string().max(MAX_NOTE_LENGTH);
const medicationNoteSchema = z.string().max(MAX_MEDICATION_NOTE_LENGTH);
const idSchema = z.string().min(1).max(80);

const moodScoreSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const medicationStatusSchema = z.enum(["done", "partial", "forgot", "none"]);
const warningLevelSchema = z.enum(["none", "small", "yes"]);
const goalReviewStatusSchema = z.enum(["done", "partial", "notDone"]);
const selfCareFeelingSchema = z.enum(["good", "neutral", "notFit"]);
const selfCareItemKindSchema = z.enum(["care", "avoid"]);
const stateLevelSchema = z.enum(["good", "normal", "hard"]);

const moodLabelCategorySchema = z.enum([
  "ポジティブ",
  "ややポジティブ",
  "普通",
  "ややネガティブ",
  "ネガティブ",
]);

const moodLabelEntrySchema = z.object({
  label: z.string().trim().min(1).max(MAX_MOOD_LABEL_LENGTH),
  category: moodLabelCategorySchema,
  isCustom: z.boolean(),
});

const legacyOrMoodLabelSchema = z.union([
  z.string().min(1).max(40),
  moodLabelEntrySchema,
]);

const moodLabelsSchema = z
  .array(legacyOrMoodLabelSchema)
  .max(3)
  .transform((items) => normalizeMoodLabels(items));

export const dailyRecordSchema = z.object({
  id: idSchema,
  date: dateSchema,
  moodScore: moodScoreSchema.nullable(),
  moodLabels: moodLabelsSchema,
  sleepStart: timeSchema,
  sleepEnd: timeSchema,
  sleepMinutes: z.number().int().min(0).max(24 * 60).nullable(),
  medication: medicationStatusSchema.nullable(),
  warningLevel: warningLevelSchema.nullable(),
  warningTags: z.array(z.string().min(1).max(60)).max(20),
  warningNote: memoSchema,
  selfCareIds: z.array(idSchema).max(100),
  selfCareMemo: memoSchema,
  // 既定値を持たせ、フィールドがない版2以前の保存データも読めるようにする
  selfCareFeeling: selfCareFeelingSchema.nullable().default(null),
  note: memoSchema,
  // 既定値を持たせ、フィールドがない版1の保存データも読めるようにする
  tomorrowGoal: z.string().max(MAX_GOAL_LENGTH).default(""),
  goalReviewStatus: goalReviewStatusSchema.nullable().default(null),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const selfCareItemSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(MAX_SELF_CARE_TITLE_LENGTH),
  // 既定値を持たせ、フィールドがない版3以前の保存データも読めるようにする。
  // 既存の登録はすべて「できること」として扱う。
  kind: selfCareItemKindSchema.default("care"),
  // 空配列は「状態を問わず出す」。版3以前の保存データはこの既定になる。
  stateLevels: z
    .array(stateLevelSchema)
    .max(3)
    .transform((levels) => [...new Set(levels)])
    .default([]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const exportPayloadSchema = z.object({
  version: z.literal(EXPORT_VERSION),
  exportedAt: timestampSchema,
  /**
   * 積み重ねの起点として本人が設定した復職日。未設定なら null。
   * 既定値を持たせ、フィールドがない既存の書き出しもそのまま読めるようにする。
   * 追加しても取り込み互換が壊れないため EXPORT_VERSION は据え置く。
   */
  returnDate: dateSchema.nullable().default(null),
  /**
   * 必要なときに自分で見せるためのお薬の覚え書き。未入力なら空文字。
   * 既定値を持たせ、フィールドがない既存の書き出しもそのまま読めるようにする。
   * 追加しても取り込み互換が壊れないため EXPORT_VERSION は据え置く。
   */
  medicationNote: medicationNoteSchema.default(""),
  records: z.array(dailyRecordSchema).max(MAX_IMPORT_RECORDS),
  selfCareItems: z.array(selfCareItemSchema).max(MAX_IMPORT_SELF_CARE),
});

export type ExportPayload = z.infer<typeof exportPayloadSchema>;

export function parseRecordsJson(raw: unknown): z.ZodSafeParseResult<z.infer<typeof dailyRecordSchema>[]> {
  return z.array(dailyRecordSchema).safeParse(raw);
}

export function parseSelfCareJson(raw: unknown): z.ZodSafeParseResult<z.infer<typeof selfCareItemSchema>[]> {
  return z.array(selfCareItemSchema).safeParse(raw);
}

/**
 * 保存済みの復職日を読む。形式が違えば未設定として扱う。
 * 表示の起点にすぎず、壊れていても記録の読み書きを止める理由にはならないため、
 * エラーにせず既定（最初の記録日）へ落とす。
 */
export function parseReturnDate(raw: unknown): string | null {
  const parsed = dateSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * 保存済みのお薬の覚え書きを読む。
 * 上限を超えていれば切り詰めず未入力として扱い、壊れた値をそのまま画面へ出さない。
 */
export function parseMedicationNote(raw: unknown): string {
  const parsed = medicationNoteSchema.safeParse(raw);
  return parsed.success ? parsed.data : "";
}

export function parseExportPayload(
  raw: unknown
): { ok: true; data: ExportPayload } | { ok: false; message: string } {
  const parsed = exportPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "ファイルの形式が正しくありません。",
    };
  }
  if (parsed.data.records.length > MAX_IMPORT_RECORDS) {
    return {
      ok: false,
      message: "データ量が大きすぎるため読み込めませんでした",
    };
  }
  if (parsed.data.selfCareItems.length > MAX_IMPORT_SELF_CARE) {
    return {
      ok: false,
      message: "データ量が大きすぎるため読み込めませんでした",
    };
  }
  return { ok: true, data: parsed.data };
}

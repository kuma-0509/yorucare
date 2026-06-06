import { z } from "zod";

export const STORAGE_SCHEMA_VERSION = 1;
export const EXPORT_VERSION = 1;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_SELF_CARE_TITLE_LENGTH = 100;
export const MAX_IMPORT_RECORDS = 5000;
export const MAX_IMPORT_SELF_CARE = 1000;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .nullable();
const timestampSchema = z.string().min(1).max(40);
const memoSchema = z.string().max(MAX_NOTE_LENGTH);
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

export const dailyRecordSchema = z.object({
  id: idSchema,
  date: dateSchema,
  moodScore: moodScoreSchema.nullable(),
  moodLabels: z.array(z.string().min(1).max(40)).max(3),
  sleepStart: timeSchema,
  sleepEnd: timeSchema,
  sleepMinutes: z.number().int().min(0).max(24 * 60).nullable(),
  medication: medicationStatusSchema.nullable(),
  warningLevel: warningLevelSchema.nullable(),
  warningTags: z.array(z.string().min(1).max(60)).max(20),
  warningNote: memoSchema,
  selfCareIds: z.array(idSchema).max(100),
  selfCareMemo: memoSchema,
  note: memoSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const selfCareItemSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(MAX_SELF_CARE_TITLE_LENGTH),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const exportPayloadSchema = z.object({
  version: z.literal(EXPORT_VERSION),
  exportedAt: timestampSchema,
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

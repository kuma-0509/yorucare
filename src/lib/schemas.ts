import { z } from "zod";

export const STORAGE_SCHEMA_VERSION = 1;
export const EXPORT_VERSION = 1;

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
  id: z.string().min(1),
  date: z.string().min(1),
  moodScore: moodScoreSchema.nullable(),
  moodLabels: z.array(z.string()),
  sleepStart: z.string().nullable(),
  sleepEnd: z.string().nullable(),
  sleepMinutes: z.number().nullable(),
  medication: medicationStatusSchema.nullable(),
  warningLevel: warningLevelSchema.nullable(),
  warningTags: z.array(z.string()),
  warningNote: z.string(),
  selfCareIds: z.array(z.string()),
  selfCareMemo: z.string(),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const selfCareItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const exportPayloadSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string(),
  records: z.array(dailyRecordSchema),
  selfCareItems: z.array(selfCareItemSchema),
});

export type ExportPayload = z.infer<typeof exportPayloadSchema>;

const MAX_IMPORT_RECORDS = 5000;
const MAX_IMPORT_SELF_CARE = 1000;

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

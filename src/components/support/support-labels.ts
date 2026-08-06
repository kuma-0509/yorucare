import { COPY } from "@/lib/copy";
import type { SupportAvailability } from "@/lib/support/availability";
import type {
  ConsultationMethod,
  SupportCategory,
  SupportUrgency,
} from "@/lib/support/types";

/** 表示に使う語はすべて COPY を参照する。ここで新しい文言を作らない */

export const SUPPORT_CATEGORY_LABEL: Record<SupportCategory, string> = {
  emergency: COPY.support.categoryEmergency,
  nightConsultation: COPY.support.categoryNightConsultation,
  mentalHealth: COPY.support.categoryMentalHealth,
  medical: COPY.support.categoryMedical,
  welfare: COPY.support.categoryWelfare,
  employment: COPY.support.categoryEmployment,
  developmentalDisability: COPY.support.categoryDevelopmentalDisability,
};

/** 本人が選べる相談内容。緊急の通報は上部の常設案内で扱うため出さない */
export const SELECTABLE_CATEGORIES: SupportCategory[] = [
  "mentalHealth",
  "medical",
  "employment",
  "developmentalDisability",
  "welfare",
];

export const CONSULTATION_METHOD_LABEL: Record<ConsultationMethod, string> = {
  phone: COPY.support.methodLabelPhone,
  online: COPY.support.methodLabelOnline,
  inPerson: COPY.support.methodLabelInPerson,
};

export const CONSULTATION_METHODS: ConsultationMethod[] = [
  "phone",
  "online",
  "inPerson",
];

export const SUPPORT_URGENCY_LABEL: Record<SupportUrgency, string> = {
  now: COPY.support.urgencyNow,
  today: COPY.support.urgencyToday,
  withinDays: COPY.support.urgencyWithinDays,
};

export const SUPPORT_URGENCIES: SupportUrgency[] = ["now", "today", "withinDays"];

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function availabilityLabel(availability: SupportAvailability): string {
  switch (availability.status) {
    case "open24Hours":
      return COPY.support.statusOpen24Hours;
    case "open":
      return COPY.support.statusOpen;
    case "beforeOpening":
      return COPY.support.statusBeforeOpening;
    case "closedToday":
      return COPY.support.statusClosedToday;
    case "closedByDay":
      return COPY.support.statusClosedByDay;
    case "unknown":
      return COPY.support.statusUnknown;
  }
}

/** 次回受付日時。「今日」「明日」も曜日つきで示し、読み違いを減らす */
export function nextOpeningLabel(
  availability: SupportAvailability
): string | null {
  const next = availability.nextOpening;
  if (!next) return null;
  const [, month, day] = next.date.split("-");
  const weekday = WEEKDAY_LABELS[next.weekday];
  return `${COPY.support.nextOpeningLabel}: ${Number(month)}月${Number(
    day
  )}日（${weekday}）${next.openingTime}`;
}

import { countDaysInRange } from "./ai/range";
import { COPY } from "./copy";

/**
 * 復職日を 1 日目として、対象日が復職後何日目かを返す。
 *
 * ふりかえりの「復職からの日数」は起点当日を 0 と数える経過日数だが、
 * 「○日目」は序数なので復職当日を 1 日目にする。
 * 復職日が未設定、対象日が復職日前、日付が不正なら null（表示しない）。
 */
export function daysSinceReturn(
  returnDate: string | null,
  onDate: string
): number | null {
  if (returnDate === null) return null;
  const days = countDaysInRange(returnDate, onDate);
  return days === 0 ? null : days;
}

export function formatReturnAfterWorkLabel(day: number): string {
  return COPY.returnAfterWork.label.replace("{n}", String(day));
}

export function returnAfterWorkLabel(
  returnDate: string | null,
  onDate: string
): string | null {
  const day = daysSinceReturn(returnDate, onDate);
  return day === null ? null : formatReturnAfterWorkLabel(day);
}

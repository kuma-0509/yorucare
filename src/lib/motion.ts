/**
 * 動きを控える設定の判定。
 *
 * 記録完了演出は「どの端末でも同じ長さで動く」ことを前提にしない。
 * 判定できない環境（サーバー側、matchMedia を持たない環境）では、
 * 動かさない側ではなく「設定なし」として扱い、演出の有無は呼び出し側で決める。
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

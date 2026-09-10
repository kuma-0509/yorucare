/**
 * クラウドログインのコード送信が失敗した理由を、画面向けに分ける。
 *
 * 許可リストに無い場合と、通信・送信の失敗とを同じ案内にすると、
 * 打ち間違えた本人が待ち続けてしまう。判定は HTTP 403 そのものではなく、
 * アプリが付けた誤りコードだけを見る。認証基盤や CSRF の 403 を
 * 「送れないメールアドレス」と誤認しないため。
 *
 * メールアドレスそのものはここへ渡さず、判定結果だけを返す。
 */

export const EMAIL_NOT_ALLOWED_CODE = "email_not_allowed";

export type CloudLoginSendFailure = "not_allowed" | "unavailable";

export function cloudLoginSendFailureReason(
  error: unknown
): CloudLoginSendFailure {
  return hasEmailNotAllowedCode(error) ? "not_allowed" : "unavailable";
}

function hasEmailNotAllowedCode(value: unknown, depth = 0): boolean {
  if (depth > 3 || value == null || typeof value !== "object") return false;
  const record = value as { code?: unknown; error?: unknown };
  if (record.code === EMAIL_NOT_ALLOWED_CODE) return true;
  return hasEmailNotAllowedCode(record.error, depth + 1);
}

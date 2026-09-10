import { COPY } from "./copy";

/**
 * 許可リスト拒否を画面へ伝えるための安定トークン。
 *
 * Managed Better Auth のクライアントは HTTP 403 の `code` を
 * `feature_not_supported` など別の値へ置き換える。本文の `message` は
 * 残るので、同じトークンを `code` と `message` の両方に載せる。
 * 画面には出さず、判定にだけ使う。メールアドレスは含めない。
 */
export const EMAIL_NOT_ALLOWED_CODE = "email_not_allowed";

function readStringField(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null) return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : null;
}

/**
 * 認証クライアントや fetch が返す失敗が、許可リスト拒否かどうかを判定する。
 * 汎用の 403 や通信失敗とは区別し、メールアドレスの有無では判断しない。
 */
export function isEmailNotAllowedAuthError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === "string") return error === EMAIL_NOT_ALLOWED_CODE;

  const code = readStringField(error, "code");
  const message = readStringField(error, "message");
  if (code === EMAIL_NOT_ALLOWED_CODE || message === EMAIL_NOT_ALLOWED_CODE) {
    return true;
  }

  const body =
    typeof error === "object" ? (error as { body?: unknown }).body : undefined;
  if (readStringField(body, "code") === EMAIL_NOT_ALLOWED_CODE) return true;
  if (readStringField(body, "message") === EMAIL_NOT_ALLOWED_CODE) return true;

  const nested =
    typeof error === "object" ? (error as { error?: unknown }).error : undefined;
  if (nested && nested !== error) return isEmailNotAllowedAuthError(nested);

  return false;
}

/** コード送信の失敗に出す案内。許可リスト拒否と、それ以外を分ける。 */
export function cloudLoginSendErrorMessage(error: unknown): string {
  return isEmailNotAllowedAuthError(error)
    ? COPY.cloudLogin.emailNotAllowed
    : COPY.cloudLogin.sendFailed;
}

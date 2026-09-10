import { describe, expect, it } from "vitest";
import { COPY } from "./copy";
import {
  EMAIL_NOT_ALLOWED_CODE,
  cloudLoginSendErrorMessage,
  isEmailNotAllowedAuthError,
} from "./cloud-login-errors";

describe("isEmailNotAllowedAuthError", () => {
  it("安定トークンそのものを許可リスト拒否と判定する", () => {
    expect(isEmailNotAllowedAuthError(EMAIL_NOT_ALLOWED_CODE)).toBe(true);
  });

  it("クライアントが message に残したトークンを許可リスト拒否と判定する", () => {
    expect(
      isEmailNotAllowedAuthError({
        status: 403,
        code: "feature_not_supported",
        message: EMAIL_NOT_ALLOWED_CODE,
      })
    ).toBe(true);
  });

  it("code にトークンが残っている場合も許可リスト拒否と判定する", () => {
    expect(
      isEmailNotAllowedAuthError({
        status: 403,
        code: EMAIL_NOT_ALLOWED_CODE,
      })
    ).toBe(true);
  });

  it("入れ子の error や body からも判定する", () => {
    expect(
      isEmailNotAllowedAuthError({
        error: { body: { code: EMAIL_NOT_ALLOWED_CODE } },
      })
    ).toBe(true);
  });

  it("汎用の403や通信失敗は許可リスト拒否にしない", () => {
    expect(isEmailNotAllowedAuthError({ status: 403, message: "Forbidden" })).toBe(
      false
    );
    expect(
      isEmailNotAllowedAuthError({
        status: 403,
        code: "feature_not_supported",
      })
    ).toBe(false);
    expect(isEmailNotAllowedAuthError({ status: 500 })).toBe(false);
    expect(isEmailNotAllowedAuthError(new Error("Failed to fetch"))).toBe(false);
    expect(isEmailNotAllowedAuthError(null)).toBe(false);
  });
});

describe("cloudLoginSendErrorMessage", () => {
  it("許可リスト拒否と送信失敗で案内を分ける", () => {
    expect(
      cloudLoginSendErrorMessage({ message: EMAIL_NOT_ALLOWED_CODE })
    ).toBe(COPY.cloudLogin.emailNotAllowed);
    expect(cloudLoginSendErrorMessage({ status: 503 })).toBe(
      COPY.cloudLogin.sendFailed
    );
  });

  it("許可リスト拒否の案内は待ちを求めず、問い合わせ先も出さない", () => {
    const message = COPY.cloudLogin.emailNotAllowed;
    expect(message).not.toMatch(/時間をおいて/);
    expect(message).not.toMatch(/許可リスト|問い合わせ|運営/);
    expect(COPY.cloudLogin.sendFailed).toMatch(/時間をおいて/);
  });
});

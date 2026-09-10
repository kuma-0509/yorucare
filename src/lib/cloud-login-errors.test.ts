import { describe, expect, it } from "vitest";
import {
  EMAIL_NOT_ALLOWED_CODE,
  cloudLoginSendFailureReason,
} from "./cloud-login-errors";

describe("cloudLoginSendFailureReason", () => {
  it("アプリが付けた誤りコードだけを許可リスト拒否とみなす", () => {
    expect(
      cloudLoginSendFailureReason({ code: EMAIL_NOT_ALLOWED_CODE })
    ).toBe("not_allowed");
    expect(
      cloudLoginSendFailureReason({
        status: 403,
        error: { ok: false, code: EMAIL_NOT_ALLOWED_CODE },
      })
    ).toBe("not_allowed");
  });

  it("HTTP 403 だけでは許可リスト拒否とみなさない", () => {
    expect(cloudLoginSendFailureReason({ status: 403 })).toBe("unavailable");
    expect(
      cloudLoginSendFailureReason({ status: 403, statusText: "Forbidden" })
    ).toBe("unavailable");
  });

  it("通信失敗や不明な誤りは待ち案内側にする", () => {
    expect(cloudLoginSendFailureReason(null)).toBe("unavailable");
    expect(cloudLoginSendFailureReason(new Error("network"))).toBe(
      "unavailable"
    );
    expect(cloudLoginSendFailureReason({ status: 500 })).toBe("unavailable");
  });
});

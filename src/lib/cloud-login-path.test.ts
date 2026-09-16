import { describe, expect, it } from "vitest";
import {
  CLOUD_LOGIN_PATH,
  CLOUD_LOGIN_REAUTH_PATH,
  isCloudLoginReauthSearch,
} from "./cloud-login-path";

describe("isCloudLoginReauthSearch", () => {
  it("reauth=1 のときだけ真", () => {
    expect(isCloudLoginReauthSearch("?reauth=1")).toBe(true);
    expect(isCloudLoginReauthSearch("reauth=1")).toBe(true);
    expect(isCloudLoginReauthSearch("?reauth=1&other=x")).toBe(true);
  });

  it("無い・空・別の値は通常のログイン", () => {
    expect(isCloudLoginReauthSearch("")).toBe(false);
    expect(isCloudLoginReauthSearch("?")).toBe(false);
    expect(isCloudLoginReauthSearch("?reauth=")).toBe(false);
    expect(isCloudLoginReauthSearch("?reauth=true")).toBe(false);
    expect(isCloudLoginReauthSearch("?next=/")).toBe(false);
  });

  it("再認証の経路は通常のログイン確認画面を土台にする", () => {
    expect(CLOUD_LOGIN_REAUTH_PATH.startsWith(CLOUD_LOGIN_PATH)).toBe(true);
    expect(isCloudLoginReauthSearch(CLOUD_LOGIN_REAUTH_PATH.split("?")[1] ?? "")).toBe(
      true
    );
  });
});

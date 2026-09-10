// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { COPY } from "@/lib/copy";
import { EMAIL_NOT_ALLOWED_CODE } from "@/lib/cloud-login-errors";

const getSession = vi.hoisted(() => vi.fn());
const sendVerificationOtp = vi.hoisted(() => vi.fn());
const signInEmailOtp = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cloud-auth-client", () => ({
  cloudAuthClient: {
    getSession: (...args: unknown[]) => getSession(...args),
    emailOtp: {
      sendVerificationOtp: (...args: unknown[]) => sendVerificationOtp(...args),
    },
    signIn: {
      emailOtp: (...args: unknown[]) => signInEmailOtp(...args),
    },
    signOut: (...args: unknown[]) => signOut(...args),
  },
}));

const { default: CloudLoginPage } = await import("./page");

const UNKNOWN_EMAIL = "shiranai@example.com";

afterEach(() => {
  cleanup();
});

describe("クラウドログインのコード送信案内", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: null });
  });

  it("許可リストに無いときは待ち案内ではなく、入力確認を出す", async () => {
    sendVerificationOtp.mockResolvedValue({
      error: {
        status: 403,
        error: { ok: false, code: EMAIL_NOT_ALLOWED_CODE },
      },
    });

    render(<CloudLoginPage />);
    await waitFor(() => {
      expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: UNKNOWN_EMAIL },
    });
    fireEvent.click(screen.getByRole("button", { name: "コードを送る" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(COPY.cloudLogin.sendNotAllowed);
    expect(alert.textContent).not.toContain(UNKNOWN_EMAIL);
    expect(alert.textContent).not.toBe(COPY.cloudLogin.sendFailed);
  });

  it("403だけでも許可リスト拒否のコードが無ければ待ち案内にする", async () => {
    sendVerificationOtp.mockResolvedValue({
      error: { status: 403, statusText: "Forbidden" },
    });

    render(<CloudLoginPage />);
    await waitFor(() => {
      expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "sanka@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "コードを送る" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(COPY.cloudLogin.sendFailed);
  });

  it("通信や送信の失敗では、時間をおいてもう一度と案内する", async () => {
    sendVerificationOtp.mockResolvedValue({
      error: { status: 500, message: "upstream" },
    });

    render(<CloudLoginPage />);
    await waitFor(() => {
      expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "sanka@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "コードを送る" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(COPY.cloudLogin.sendFailed);
  });
});

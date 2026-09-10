// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CloudLoginPage from "./page";
import { COPY } from "@/lib/copy";
import { EMAIL_NOT_ALLOWED_CODE } from "@/lib/cloud-login-errors";

const getSession = vi.fn();
const sendVerificationOtp = vi.fn();
const signInEmailOtp = vi.fn();
const signOut = vi.fn();

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

async function fillEmailAndSubmit(email: string) {
  await waitFor(() => {
    expect(screen.getByLabelText(COPY.cloudLogin.emailLabel)).toBeTruthy();
  });
  fireEvent.change(screen.getByLabelText(COPY.cloudLogin.emailLabel), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: COPY.cloudLogin.sendCodeAction }));
}

describe("クラウド保存のログイン確認", () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: null });
    sendVerificationOtp.mockReset();
    signInEmailOtp.mockReset();
    signOut.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("許可リストに無いときは待ちを求めず、打ち間違いに気づける案内を出す", async () => {
    sendVerificationOtp.mockResolvedValue({
      error: {
        status: 403,
        code: "feature_not_supported",
        message: EMAIL_NOT_ALLOWED_CODE,
      },
    });

    render(<CloudLoginPage />);
    await fillEmailAndSubmit("sanka@example.com");

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        COPY.cloudLogin.emailNotAllowed
      );
    });
    expect(screen.queryByText(COPY.cloudLogin.sendFailed)).toBeNull();
    expect(screen.queryByText(EMAIL_NOT_ALLOWED_CODE)).toBeNull();
    expect(screen.queryByText("sanka@example.com")).toBeNull();
  });

  it("通信や送信の失敗では時間をおいてもう一度と案内する", async () => {
    sendVerificationOtp.mockResolvedValue({
      error: { status: 503, message: "service unavailable" },
    });

    render(<CloudLoginPage />);
    await fillEmailAndSubmit("sanka@example.com");

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(COPY.cloudLogin.sendFailed);
    });
    expect(screen.queryByText(COPY.cloudLogin.emailNotAllowed)).toBeNull();
  });

  it("送信例外でも許可リスト拒否と通信失敗を同じ規則で分ける", async () => {
    sendVerificationOtp.mockRejectedValue({
      message: EMAIL_NOT_ALLOWED_CODE,
      status: 403,
    });

    const { unmount } = render(<CloudLoginPage />);
    await fillEmailAndSubmit("sanka@example.com");
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        COPY.cloudLogin.emailNotAllowed
      );
    });
    unmount();

    sendVerificationOtp.mockRejectedValue(new Error("Failed to fetch"));
    render(<CloudLoginPage />);
    await fillEmailAndSubmit("sanka@example.com");
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(COPY.cloudLogin.sendFailed);
    });
  });
});

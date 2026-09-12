// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendVerificationOtp = vi.hoisted(() => vi.fn());
const signInEmailOtp = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
// 旧実装（getSession()でセッション有無だけを見る版）との回帰確認用。
// 新実装はこれを呼ばないが、旧実装との比較のために用意してある。
const getSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cloud-auth-client", () => ({
  cloudAuthClient: {
    emailOtp: { sendVerificationOtp },
    signIn: { emailOtp: signInEmailOtp },
    signOut,
    getSession,
  },
}));

const CloudLoginPage = (await import("./page")).default;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("CloudLoginPage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    sendVerificationOtp.mockReset();
    signInEmailOtp.mockReset();
    signOut.mockReset();
    getSession.mockReset();
    getSession.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("確認中は「確認しています…」を出し、未ログインならメール入力へ進む", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { ok: false, reason: "unauthenticated" }));

    render(<CloudLoginPage />);
    expect(screen.getByText("確認しています…")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
    });
  });

  it("サーバーが許可済みと答えたときだけ「ログイン済みです」を出す", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    render(<CloudLoginPage />);

    await waitFor(() => {
      expect(screen.getByText("ログイン済みです。")).toBeTruthy();
    });
  });

  it("Better Authのセッションはあるが許可リスト外のときは、専用の案内を出す", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(403, { ok: false, reason: "not_allowed" })
    );

    render(<CloudLoginPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "このメールアドレスはクラウド保存の利用対象に登録されていません。記録の保存や復元は行えません。"
        )
      ).toBeTruthy();
    });
    // 「ログイン済みです」という誤解を招く表示は出さない
    expect(screen.queryByText("ログイン済みです。")).toBeNull();
  });

  it("通信できないときは、待たされたままにせず未ログイン扱いで進める", async () => {
    fetchMock.mockRejectedValue(new TypeError("network error"));

    render(<CloudLoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
    });
  });

  it("コード検証後は、サーバーの判定を取り直してから表示を決める", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { ok: false, reason: "unauthenticated" }))
      .mockResolvedValueOnce(jsonResponse(403, { ok: false, reason: "not_allowed" }));
    sendVerificationOtp.mockResolvedValue({ data: {}, error: null });
    signInEmailOtp.mockResolvedValue({ data: {}, error: null });

    render(<CloudLoginPage />);
    await waitFor(() => screen.getByLabelText("メールアドレス"));

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "sanka@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "コードを送る" }));

    await waitFor(() => screen.getByLabelText("6桁のコード"));
    fireEvent.change(screen.getByLabelText("6桁のコード"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログインする" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "このメールアドレスはクラウド保存の利用対象に登録されていません。記録の保存や復元は行えません。"
        )
      ).toBeTruthy();
    });
  });

  describe("ログアウト", () => {
    it("成功したときだけ未ログイン表示へ切り替える", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
      signOut.mockResolvedValue({ data: {}, error: null });

      render(<CloudLoginPage />);
      await waitFor(() => screen.getByText("ログイン済みです。"));

      fireEvent.click(screen.getByRole("button", { name: "ログアウトする" }));

      await waitFor(() => {
        expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
      });
    });

    it("サーバーがエラーを返したときは、未ログイン表示へ切り替えない", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
      signOut.mockResolvedValue({
        data: null,
        error: { message: "Invalid origin", status: 403, code: "INVALID_ORIGIN" },
      });

      render(<CloudLoginPage />);
      await waitFor(() => screen.getByText("ログイン済みです。"));

      fireEvent.click(screen.getByRole("button", { name: "ログアウトする" }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "ログアウトできませんでした。時間をおいてもう一度お試しください。"
          )
        ).toBeTruthy();
      });
      // 失敗したのに「ログイン済みです」が消えて未ログイン表示に化けていないか
      expect(screen.getByText("ログイン済みです。")).toBeTruthy();
      expect(screen.queryByLabelText("メールアドレス")).toBeNull();
    });

    it("例外が起きたときも、未ログイン表示へ切り替えない", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
      signOut.mockRejectedValue(new TypeError("network error"));

      render(<CloudLoginPage />);
      await waitFor(() => screen.getByText("ログイン済みです。"));

      fireEvent.click(screen.getByRole("button", { name: "ログアウトする" }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "ログアウトできませんでした。時間をおいてもう一度お試しください。"
          )
        ).toBeTruthy();
      });
      expect(screen.getByText("ログイン済みです。")).toBeTruthy();
    });

    it("許可リスト外の案内画面からも、失敗時は表示を保つ", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(403, { ok: false, reason: "not_allowed" })
      );
      signOut.mockResolvedValue({
        data: null,
        error: { message: "Invalid origin", status: 403, code: "INVALID_ORIGIN" },
      });

      render(<CloudLoginPage />);
      await waitFor(() =>
        screen.getByText(
          "このメールアドレスはクラウド保存の利用対象に登録されていません。記録の保存や復元は行えません。"
        )
      );

      fireEvent.click(screen.getByRole("button", { name: "ログアウトする" }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "ログアウトできませんでした。時間をおいてもう一度お試しください。"
          )
        ).toBeTruthy();
      });
      expect(
        screen.getByText(
          "このメールアドレスはクラウド保存の利用対象に登録されていません。記録の保存や復元は行えません。"
        )
      ).toBeTruthy();
    });
  });
});

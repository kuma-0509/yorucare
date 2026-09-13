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
  /** `/api/cloud/session` への呼び出しだけを受け持つ差し替え */
  const sessionFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    sessionFetch.mockReset();
    // 検証用の状態確認（`/api/cloud/diagnostics`）は、本番と同じく404にしておく。
    // 画面はこの経路が404なら何も出さない
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/cloud/diagnostics")) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      return sessionFetch(url);
    });
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
    sessionFetch.mockResolvedValue(jsonResponse(401, { ok: false, reason: "unauthenticated" }));

    render(<CloudLoginPage />);
    expect(screen.getByText("確認しています…")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
    });
  });

  it("サーバーが許可済みと答えたときだけ「ログイン済みです」を出す", async () => {
    sessionFetch.mockResolvedValue(jsonResponse(200, { ok: true }));

    render(<CloudLoginPage />);

    await waitFor(() => {
      expect(screen.getByText("ログイン済みです。")).toBeTruthy();
    });
  });

  it("Preview用の固定IDで通っているときは、その旨をはっきり出す", async () => {
    // これが出ていないと、固定IDで通っただけの画面を「本物のログインが
    // できている」「許可リストが効いている」と読み違えてしまう
    sessionFetch.mockResolvedValue(jsonResponse(200, { ok: true, devOwner: true }));

    render(<CloudLoginPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/検証用の固定IDで表示しています/)
      ).toBeTruthy();
    });
  });

  it("本物のログインで通っているときは、固定IDの断りを出さない", async () => {
    sessionFetch.mockResolvedValue(jsonResponse(200, { ok: true }));

    render(<CloudLoginPage />);

    await waitFor(() => screen.getByText("ログイン済みです。"));
    expect(screen.queryByText(/検証用の固定IDで表示しています/)).toBeNull();
  });

  it("検証用の情報が読めるときは、どのコミットで動いているかを画面に出す", async () => {
    // 環境変数を直したのに画面が変わらないとき、古いデプロイのURLを開いた
    // ままなのかどうかを、開発者ツールなしで見分けられるようにする
    sessionFetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/cloud/diagnostics")) {
        return Promise.resolve(
          jsonResponse(200, {
            vercelEnv: "preview",
            commit: "abcdef1",
            branch: "claude/example",
            cloudBackupEnabled: true,
            allowedEmailCount: 0,
            devOwnerConfigured: false,
            authBaseUrlConfigured: true,
            authBaseUrlValid: true,
            authBaseHost: "auth.example.neon.tech",
            cookieSecretConfigured: true,
            session: "ok",
            devOwnerInUse: false,
            upstream: { reachable: true, status: 200 },
          })
        );
      }
      return sessionFetch(url);
    });

    render(<CloudLoginPage />);

    await waitFor(() => {
      expect(screen.getByText("abcdef1（claude/example）")).toBeTruthy();
    });
    expect(screen.getByText("0件")).toBeTruthy();
  });

  it("ログインの状態が変わったら、検証用の情報も取り直す", async () => {
    // 取り直さないと、ログイン後も「unauthenticated」を出し続けてしまい、
    // 原因の切り分けに使うための欄が逆に人を迷わせる
    const diagnostics = (session: string) => ({
      vercelEnv: "preview",
      commit: "abcdef1",
      branch: "claude/example",
      cloudBackupEnabled: true,
      allowedEmailCount: 1,
      devOwnerConfigured: false,
      authBaseUrlConfigured: true,
      authBaseUrlValid: true,
      authBaseHost: "auth.example.neon.tech",
      cookieSecretConfigured: true,
      session,
      devOwnerInUse: false,
      upstream: { reachable: true, status: 200 },
    });

    let loggedIn = false;
    sessionFetch.mockImplementation(() =>
      Promise.resolve(
        loggedIn
          ? jsonResponse(200, { ok: true })
          : jsonResponse(401, { ok: false, reason: "unauthenticated" })
      )
    );
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/cloud/diagnostics")) {
        return Promise.resolve(
          jsonResponse(200, diagnostics(loggedIn ? "ok" : "unauthenticated"))
        );
      }
      return sessionFetch(url);
    });
    sendVerificationOtp.mockResolvedValue({ data: {}, error: null });
    signInEmailOtp.mockImplementation(() => {
      loggedIn = true;
      return Promise.resolve({ data: {}, error: null });
    });

    render(<CloudLoginPage />);
    await waitFor(() => screen.getByLabelText("メールアドレス"));
    expect(screen.getByText("unauthenticated")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "sanka@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "コードを送る" }));

    await waitFor(() => screen.getByLabelText("6桁のコード"));
    fireEvent.change(screen.getByLabelText("6桁のコード"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログインする" }));

    await waitFor(() => screen.getByText("ログイン済みです。"));
    await waitFor(() => {
      expect(screen.getByText("ok")).toBeTruthy();
    });
    expect(screen.queryByText("unauthenticated")).toBeNull();
  });

  it("検証用の情報が読めないとき（本番）は、その欄を出さない", async () => {
    sessionFetch.mockResolvedValue(jsonResponse(200, { ok: true }));

    render(<CloudLoginPage />);

    await waitFor(() => screen.getByText("ログイン済みです。"));
    expect(screen.queryByText(/検証用の情報/)).toBeNull();
  });

  it("Better Authのセッションはあるが許可リスト外のときは、専用の案内を出す", async () => {
    sessionFetch.mockResolvedValue(
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
    sessionFetch.mockRejectedValue(new TypeError("network error"));

    render(<CloudLoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
    });
  });

  it("コード検証後は、サーバーの判定を取り直してから表示を決める", async () => {
    sessionFetch
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

  it("コード検証は成功したのに状態確認が通信できないときは、未ログイン表示へ倒さない", async () => {
    sessionFetch
      .mockResolvedValueOnce(jsonResponse(401, { ok: false, reason: "unauthenticated" }))
      .mockRejectedValueOnce(new TypeError("network error"));
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
          "ログインはできましたが、利用できる状態かの確認が今は行えません。時間をおいてもう一度確認してください。"
        )
      ).toBeTruthy();
    });
    // Cookieはすでに有効なのに、メール入力へ戻ってしまっていないか
    expect(screen.queryByLabelText("メールアドレス")).toBeNull();
  });

  it("状態確認が401（未認証）を明確に返したときだけ、コード検証後もメール入力へ戻す", async () => {
    sessionFetch
      .mockResolvedValueOnce(jsonResponse(401, { ok: false, reason: "unauthenticated" }))
      .mockResolvedValueOnce(jsonResponse(401, { ok: false, reason: "unauthenticated" }));
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
      expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
    });
  });

  it("「もう一度確認する」で確認し直し、成功すればログイン済み表示になる", async () => {
    sessionFetch
      .mockResolvedValueOnce(jsonResponse(401, { ok: false, reason: "unauthenticated" }))
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
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

    await waitFor(() => screen.getByRole("button", { name: "もう一度確認する" }));
    fireEvent.click(screen.getByRole("button", { name: "もう一度確認する" }));

    await waitFor(() => {
      expect(screen.getByText("ログイン済みです。")).toBeTruthy();
    });
  });

  describe("ログアウト", () => {
    it("成功したときだけ未ログイン表示へ切り替える", async () => {
      sessionFetch.mockResolvedValue(jsonResponse(200, { ok: true }));
      signOut.mockResolvedValue({ data: {}, error: null });

      render(<CloudLoginPage />);
      await waitFor(() => screen.getByText("ログイン済みです。"));

      fireEvent.click(screen.getByRole("button", { name: "ログアウトする" }));

      await waitFor(() => {
        expect(screen.getByLabelText("メールアドレス")).toBeTruthy();
      });
    });

    it("サーバーがエラーを返したときは、未ログイン表示へ切り替えない", async () => {
      sessionFetch.mockResolvedValue(jsonResponse(200, { ok: true }));
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
            "ログアウトできませんでした。時間をおいてもう一度お試しください。（詳細: 403 INVALID_ORIGIN）"
          )
        ).toBeTruthy();
      });
      // 失敗したのに「ログイン済みです」が消えて未ログイン表示に化けていないか
      expect(screen.getByText("ログイン済みです。")).toBeTruthy();
      expect(screen.queryByLabelText("メールアドレス")).toBeNull();
    });

    it("例外が起きたときも、未ログイン表示へ切り替えない", async () => {
      sessionFetch.mockResolvedValue(jsonResponse(200, { ok: true }));
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
      sessionFetch.mockResolvedValue(
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
            "ログアウトできませんでした。時間をおいてもう一度お試しください。（詳細: 403 INVALID_ORIGIN）"
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

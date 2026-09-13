"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cloudAuthClient } from "@/lib/cloud-auth-client";
import { cloudLoginSendFailureReason } from "@/lib/cloud-login-errors";
import { COPY } from "@/lib/copy";

/**
 * クラウドバックアップの本人確認が動くかどうかだけを確かめる、最小限の画面。
 *
 * メールアドレスを入れる→届いた6桁コードを入れる→ログイン、および
 * ログアウトだけを行う。クラウド保存の設定・復元はここでは扱わない
 * （別タスク）。
 *
 * メールアドレスと6桁コードは、送信・検証のためだけに使い、この画面の外
 * （ログ・エラー画面）へは出さない。
 */

type Phase =
  | { step: "checking" }
  | { step: "signed_in" }
  | { step: "not_allowed" }
  | { step: "check_failed" }
  | { step: "enter_email" }
  | { step: "enter_code" };

function sendCodeErrorMessage(error: unknown): string {
  return cloudLoginSendFailureReason(error) === "not_allowed"
    ? COPY.cloudLogin.sendNotAllowed
    : COPY.cloudLogin.sendFailed;
}

/**
 * `/api/cloud/session` の結果を4値に正規化する。
 *
 * サーバー側の判定（`getCloudAuthStatus`）だけを正とする。Better Authの
 * セッション有無を画面が自分で判断すると、許可リストに無いメール
 * アドレスでも「ログイン済みです」と表示してしまう（記録APIは401で
 * 拒否するが、画面の表示だけが食い違う）。
 *
 * `unknown`（通信できない・想定外の応答）は「未認証」ではない。呼び出し
 * 側が状況に応じて扱いを決める。マウント時のように何も分かっていない
 * 場面では未ログインへ倒してよいが、6桁コードの検証に成功した直後に
 * `unknown` が返った場合は、Cookieはすでに有効なはずなので未ログイン
 * 表示へ倒さない（`check_failed` として区別する）。
 */
async function fetchCloudAuthOutcome(): Promise<
  "ok" | "not_allowed" | "unauthenticated" | "unknown"
> {
  try {
    const response = await fetch("/api/cloud/session", { method: "GET" });
    if (response.status === 200) return "ok";
    if (response.status === 401) return "unauthenticated";
    if (response.status === 403) {
      const body = (await response.json().catch(() => null)) as {
        reason?: unknown;
      } | null;
      if (body?.reason === "not_allowed") return "not_allowed";
    }
  } catch {
    // 通信できない場合は判定不能として扱う
  }
  return "unknown";
}

export default function CloudLoginPage() {
  const [phase, setPhase] = useState<Phase>({ step: "checking" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCloudAuthOutcome().then((outcome) => {
      if (cancelled) return;
      // マウント時点では何も分かっていないため、判定不能（unknown）も
      // 未認証と同じくメール入力から始めさせてよい
      if (outcome === "ok") setPhase({ step: "signed_in" });
      else if (outcome === "not_allowed") setPhase({ step: "not_allowed" });
      else setPhase({ step: "enter_email" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSendCode(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: sendError } = await cloudAuthClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (sendError) {
        setError(sendCodeErrorMessage(sendError));
        return;
      }
      setCode("");
      setPhase({ step: "enter_code" });
    } catch (sendException) {
      setError(sendCodeErrorMessage(sendException));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: verifyError } = await cloudAuthClient.signIn.emailOtp({
        email,
        otp: code,
      });
      if (verifyError) {
        setError("コードが違うか、期限が切れています。もう一度お試しください。");
        return;
      }
      setCode("");
      // ここまで来ればCookieはすでに有効なので、次の確認が失敗しても
      // 「未ログイン」へは倒さない（recheckAfterSignIn が判断する）
      await recheckAfterSignIn();
    } catch {
      setError("コードが違うか、期限が切れています。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  /**
   * サインインが成立した後（またはその確認をやり直すとき）に使う。
   *
   * `unknown`（通信できない・想定外の応答）は「未認証」ではないため、
   * ここでは未ログイン表示へ倒さず、もう一度確認できる `check_failed` を
   * 出す。確定した401（`unauthenticated`）のときだけメール入力へ戻す。
   */
  async function recheckAfterSignIn() {
    const outcome = await fetchCloudAuthOutcome();
    if (outcome === "ok") setPhase({ step: "signed_in" });
    else if (outcome === "not_allowed") setPhase({ step: "not_allowed" });
    else if (outcome === "unauthenticated") setPhase({ step: "enter_email" });
    else setPhase({ step: "check_failed" });
  }

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      const { error: signOutError } = await cloudAuthClient.signOut();
      if (signOutError) {
        // 失敗したのに「ログアウトした」表示へ切り替えない。サーバー側の
        // セッションが生きたままなのに未ログイン表示になると、共有端末で
        // 「ログアウトしたつもり」が成立してしまう
        setError(
          "ログアウトできませんでした。時間をおいてもう一度お試しください。"
        );
        return;
      }
    } catch {
      setError(
        "ログアウトできませんでした。時間をおいてもう一度お試しください。"
      );
      return;
    } finally {
      setBusy(false);
    }
    setEmail("");
    setCode("");
    setPhase({ step: "enter_email" });
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg space-y-6 px-4 py-8 pb-safe">
      <div>
        <h1 className="text-xl font-medium text-foreground">
          クラウド保存のログイン確認
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          本人確認だけを確かめる検証用の画面です。記録の保存や復元はここでは
          行いません。
        </p>
      </div>

      {phase.step === "checking" && (
        <p className="text-sm text-muted-foreground">確認しています…</p>
      )}

      {phase.step === "signed_in" && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            ログイン済みです。
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleSignOut}
            disabled={busy}
          >
            ログアウトする
          </Button>
        </div>
      )}

      {phase.step === "not_allowed" && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            このメールアドレスはクラウド保存の利用対象に登録されていません。記録の保存や復元は行えません。
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleSignOut}
            disabled={busy}
          >
            ログアウトする
          </Button>
        </div>
      )}

      {phase.step === "check_failed" && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            ログインはできましたが、利用できる状態かの確認が今は行えません。時間をおいてもう一度確認してください。
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await recheckAfterSignIn();
              } finally {
                setBusy(false);
              }
            }}
          >
            もう一度確認する
          </Button>
        </div>
      )}

      {phase.step === "enter_email" && (
        <form className="space-y-4" onSubmit={handleSendCode}>
          <div className="space-y-2">
            <Label htmlFor="cloud-login-email">メールアドレス</Label>
            <Input
              id="cloud-login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(changeEvent) => setEmail(changeEvent.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy || !email}>
            コードを送る
          </Button>
        </form>
      )}

      {phase.step === "enter_code" && (
        <form className="space-y-4" onSubmit={handleVerifyCode}>
          <p className="text-sm leading-relaxed text-muted-foreground">
            入力したメールアドレス宛に6桁のコードを送りました。
          </p>
          <div className="space-y-2">
            <Label htmlFor="cloud-login-code">6桁のコード</Label>
            <Input
              id="cloud-login-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(changeEvent) => setCode(changeEvent.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={busy || code.length === 0}>
              ログインする
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setCode("");
                setError(null);
                setPhase({ step: "enter_email" });
              }}
            >
              やり直す
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </main>
  );
}

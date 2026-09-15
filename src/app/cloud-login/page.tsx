"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cloudAuthClient } from "@/lib/cloud-auth-client";
import {
  describeAuthError,
  fetchCloudAuthState,
  hintForSignOutError,
} from "@/lib/cloud-auth-status";
import {
  describeDiagnostics,
  fetchCloudDiagnostics,
  type CloudDiagnostics,
} from "@/lib/cloud-diagnostics";
import { cloudLoginSendFailureReason } from "@/lib/cloud-login-errors";
import { isCloudLoginReauthSearch } from "@/lib/cloud-login-path";
import { COPY } from "@/lib/copy";

/**
 * クラウドバックアップの本人確認が動くかどうかだけを確かめる、最小限の画面。
 *
 * メールアドレスを入れる→届いた6桁コードを入れる→ログイン、および
 * ログアウトを行う。ログイン済みのときは、ログアウトせずに6桁コードだけ
 * やり直す再認証もできる。クラウド保存の設定・復元はここでは扱わない。
 *
 * メールアドレスと6桁コードは、送信・検証のためだけに使い、この画面の外
 * （ログ・エラー画面）へは出さない。
 */

const LOGIN = COPY.cloudLogin;

type Phase =
  | { step: "checking" }
  | { step: "signed_in" }
  | { step: "not_allowed" }
  | { step: "check_failed" }
  | { step: "enter_email" }
  | { step: "enter_code" }
  | { step: "reauth_done" };

type Purpose = "login" | "reauth";

function sendCodeErrorMessage(error: unknown): string {
  return cloudLoginSendFailureReason(error) === "not_allowed"
    ? LOGIN.sendNotAllowed
    : LOGIN.sendFailed;
}

function wantsReauthNow(): boolean {
  if (typeof window === "undefined") return false;
  return isCloudLoginReauthSearch(window.location.search);
}

export default function CloudLoginPage() {
  const [phase, setPhase] = useState<Phase>({ step: "checking" });
  const [purpose, setPurpose] = useState<Purpose>("login");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOwner, setDevOwner] = useState(false);
  const [diagnostics, setDiagnostics] = useState<CloudDiagnostics | null>(null);

  // 検証用の状態確認。本番では経路が404になるため、何も出ない。
  // 表示が変わるたびに取り直す。ログイン・ログアウトの後も古い判定を出し
  // 続けると、原因の切り分けに使うための欄が逆に人を迷わせてしまう
  useEffect(() => {
    let cancelled = false;
    fetchCloudDiagnostics().then((result) => {
      if (!cancelled) setDiagnostics(result);
    });
    return () => {
      cancelled = true;
    };
  }, [phase.step]);

  useEffect(() => {
    let cancelled = false;
    fetchCloudAuthState().then(({ outcome, devOwner: isDevOwner }) => {
      if (cancelled) return;
      setDevOwner(isDevOwner);
      // マウント時点では何も分かっていないため、判定不能（unknown）も
      // 未認証と同じくメール入力から始めさせてよい
      if (outcome === "ok") {
        // ログイン済みでも、設定画面から再認証で来たときは6桁コードの入力へ
        // 進む。「ログイン済みです」だけだと、消す操作が止まってしまう
        if (wantsReauthNow()) {
          setPurpose("reauth");
          setPhase({ step: "enter_email" });
          return;
        }
        setPhase({ step: "signed_in" });
        return;
      }
      if (outcome === "not_allowed") setPhase({ step: "not_allowed" });
      else setPhase({ step: "enter_email" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function startReauth() {
    setError(null);
    setEmail("");
    setCode("");
    setPurpose("reauth");
    setPhase({ step: "enter_email" });
  }

  function cancelReauth() {
    setError(null);
    setEmail("");
    setCode("");
    setPurpose("login");
    setPhase({ step: "signed_in" });
  }

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
    const { outcome, devOwner: isDevOwner } = await fetchCloudAuthState();
    setDevOwner(isDevOwner);
    if (outcome === "ok") {
      setPhase(purpose === "reauth" ? { step: "reauth_done" } : { step: "signed_in" });
      return;
    }
    if (outcome === "not_allowed") setPhase({ step: "not_allowed" });
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
        // 「ログアウトしたつもり」が成立してしまう。
        // 併せて、原因の切り分けに要る最低限（状態番号）を画面に出す
        setError(
          `ログアウトできませんでした。時間をおいてもう一度お試しください。${describeAuthError(signOutError)}${hintForSignOutError(signOutError)}`
        );
        return;
      }
    } catch (caught) {
      setError(
        `ログアウトできませんでした。時間をおいてもう一度お試しください。${describeAuthError(caught)}`
      );
      return;
    } finally {
      setBusy(false);
    }
    setEmail("");
    setCode("");
    setPurpose("login");
    setPhase({ step: "enter_email" });
  }

  const reauth = purpose === "reauth";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg space-y-6 px-4 py-8 pb-safe">
      <div>
        <h1 className="text-xl font-medium text-foreground">
          {reauth ? LOGIN.reauthHeading : "クラウド保存のログイン確認"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {reauth
            ? LOGIN.reauthBody
            : "本人確認だけを確かめる検証用の画面です。記録の保存や復元はここでは行いません。"}
        </p>
      </div>

      {devOwner && (
        <p
          role="status"
          className="rounded-xl bg-muted px-3 py-2 text-sm leading-relaxed text-foreground"
        >
          検証用の固定IDで表示しています（USER_DATA_DEV_OWNER_ID
          が設定されています）。この状態では、実際のログイン結果や許可リストの
          判定を確かめられません。確かめたいときは、この環境変数を外してから
          もう一度お試しください。
        </p>
      )}

      {phase.step === "checking" && (
        <p className="text-sm text-muted-foreground">確認しています…</p>
      )}

      {phase.step === "signed_in" && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            ログイン済みです。
          </p>
          <Button type="button" variant="outline" onClick={startReauth} disabled={busy}>
            {LOGIN.reauthStartAction}
          </Button>
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

      {phase.step === "reauth_done" && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground" role="status">
            {LOGIN.reauthDone}
          </p>
          <Button asChild>
            <Link href="/">{LOGIN.reauthBackAction}</Link>
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
          {reauth && (
            <Button type="button" variant="ghost" disabled={busy} onClick={cancelReauth}>
              {LOGIN.reauthCancelAction}
            </Button>
          )}
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
              {reauth ? LOGIN.reauthVerifyAction : "ログインする"}
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

      {diagnostics && (
        <details className="rounded-xl border border-border px-3 py-2">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            検証用の情報（この画面がどの設定で動いているか）
          </summary>
          <dl className="mt-2 space-y-1">
            {describeDiagnostics(diagnostics).map((row) => (
              <div key={row.label} className="flex gap-2 text-xs">
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                <dd className="break-all text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            環境変数を直したのに変わらないときは、「いま動いているコミット」を
            確かめてください。Vercelはデプロイのたびに新しいURLを作り、環境変数は
            デプロイごとに焼き付くため、古いURLを開いたままだと何も変わりません。
          </p>
        </details>
      )}
    </main>
  );
}

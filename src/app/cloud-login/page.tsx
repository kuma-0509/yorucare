"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cloudAuthClient } from "@/lib/cloud-auth-client";

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
  | { step: "enter_email" }
  | { step: "enter_code" };

export default function CloudLoginPage() {
  const [phase, setPhase] = useState<Phase>({ step: "checking" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cloudAuthClient
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setPhase(data?.user ? { step: "signed_in" } : { step: "enter_email" });
      })
      .catch(() => {
        if (!cancelled) setPhase({ step: "enter_email" });
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
        setError("コードを送れませんでした。時間をおいてもう一度お試しください。");
        return;
      }
      setCode("");
      setPhase({ step: "enter_code" });
    } catch {
      setError("コードを送れませんでした。時間をおいてもう一度お試しください。");
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
      setPhase({ step: "signed_in" });
    } catch {
      setError("コードが違うか、期限が切れています。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await cloudAuthClient.signOut();
    } catch {
      // サインアウトの失敗も、内容を出さず一般的な案内にとどめる
    } finally {
      setEmail("");
      setCode("");
      setBusy(false);
      setPhase({ step: "enter_email" });
    }
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

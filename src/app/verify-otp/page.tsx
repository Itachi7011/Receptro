"use client";

import { Suspense } from "react";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Card, Alert } from "@/components/ui/Card";
import { useLocale } from "@/context/LocaleContext";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}

function VerifyOtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const { t } = useLocale();

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [otp, setOtp] = useState(params.get("devOtp") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    params.get("devOtp")
      ? "Dev mode: SendGrid isn't configured, so we've pre-filled the code from the console fallback."
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (params.get("email")) setEmail(params.get("email")!);
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const data = await apiFetch<{ message: string; devOtp?: string }>("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setInfo(data.devOtp ? `${data.message} Dev code: ${data.devOtp}` : data.message);
      if (data.devOtp) setOtp(data.devOtp);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="font-display text-2xl text-primary">
            Receptro
          </Link>
        </div>
        <Card>
          <h1 className="font-display ledger-heading mb-2 text-xl">{t.auth.verifyEmail}</h1>
          <p className="mb-6 text-sm text-ink-soft">
            {t.auth.verifyEmailHint} <span className="font-medium text-ink">{email || "your email"}</span>.
          </p>
          {error && (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          )}
          {info && (
            <div className="mb-4">
              <Alert tone="info">{info}</Alert>
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{t.common.email}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="otp">{t.auth.verificationCode}</Label>
              <Input
                id="otp"
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="font-ledger text-center text-lg tracking-[0.5em]"
                placeholder="000000"
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              {t.auth.verifyAndContinue}
            </Button>
          </form>
          <button
            onClick={onResend}
            disabled={resending}
            className="mt-4 w-full text-center text-sm text-primary hover:underline disabled:opacity-50"
          >
            {resending ? t.auth.sending : t.auth.resendCode}
          </button>
        </Card>
      </div>
    </main>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Field";
import { Card, Alert } from "@/components/ui/Card";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { useLocale } from "@/context/LocaleContext";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const data = await apiFetch<{ email: string; devOtp?: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const qs = new URLSearchParams({ email: data.email, ...(data.devOtp ? { devOtp: data.devOtp } : {}) });
      router.push(`/verify-otp?${qs.toString()}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.details && typeof err.details === "object") {
          setFieldErrors(err.details as Record<string, string[]>);
        }
      } else {
        setError(t.common.somethingWentWrong);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl text-primary">
            Receptro
          </Link>
          <LanguageSwitcher />
        </div>
        <Card>
          <h1 className="font-display ledger-heading mb-6 text-xl">{t.auth.register}</h1>
          {error && (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t.auth.yourName}</Label>
              <Input id="name" required value={form.name} onChange={update("name")} placeholder="Ramesh Kumar" />
              <FieldError>{fieldErrors.name?.[0]}</FieldError>
            </div>
            <div>
              <Label htmlFor="companyName">{t.auth.businessName}</Label>
              <Input
                id="companyName"
                required
                value={form.companyName}
                onChange={update("companyName")}
                placeholder="Kumar Distributors"
              />
              <FieldError>{fieldErrors.companyName?.[0]}</FieldError>
            </div>
            <div>
              <Label htmlFor="email">{t.common.email}</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                placeholder="you@business.com"
              />
              <FieldError>{fieldErrors.email?.[0]}</FieldError>
            </div>
            <div>
              <Label htmlFor="phone">{t.common.phone} (optional)</Label>
              <Input id="phone" value={form.phone} onChange={update("phone")} placeholder="98765 43210" />
            </div>
            <div>
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={update("password")}
                placeholder="At least 8 characters"
              />
              <FieldError>{fieldErrors.password?.[0]}</FieldError>
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              {t.auth.createAccount}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-soft">
          {t.auth.alreadyHaveAccount}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t.auth.logIn}
          </Link>
        </p>
      </div>
    </main>
  );
}

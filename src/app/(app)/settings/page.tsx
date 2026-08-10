"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/Field";
import { ThemeSwitcher } from "@/components/settings/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { useLocale } from "@/context/LocaleContext";
import { useAuth } from "@/context/AuthContext";

interface Business {
  id: string;
  name: string;
  gstNumber: string | null;
  address: string | null;
}

export default function SettingsPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState({ name: "", gstNumber: "", address: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = user?.role === "OWNER" || user?.role === "ADMIN";

  useEffect(() => {
    apiFetch<{ business: Business }>("/api/settings").then((data) => {
      setBusiness(data.business);
      setForm({
        name: data.business.name,
        gstNumber: data.business.gstNumber ?? "",
        address: data.business.address ?? "",
      });
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaved(false);
    setLoading(true);
    try {
      const data = await apiFetch<{ business: Business }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setBusiness(data.business);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.details && typeof err.details === "object") setFieldErrors(err.details as Record<string, string[]>);
      } else {
        setError(t.common.somethingWentWrong);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display ledger-heading text-2xl">{t.settings.title}</h1>

      <Card>
        <h2 className="font-display ledger-heading mb-4 text-lg">{t.settings.appearance}</h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <Label htmlFor="theme-select">{t.settings.theme}</Label>
            <ThemeSwitcher />
          </div>
          <div>
            <Label htmlFor="lang-select">{t.settings.language}</Label>
            <LanguageSwitcher />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display ledger-heading mb-4 text-lg">{t.settings.businessDetails}</h2>
        {!business ? (
          <p className="text-sm text-ink-soft">{t.common.loading}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <Alert>{error}</Alert>}
            {saved && <Alert tone="success">{t.common.save} ✓</Alert>}
            <div>
              <Label htmlFor="name">{t.settings.businessName}</Label>
              <Input
                id="name"
                required
                disabled={!canEdit}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <FieldError>{fieldErrors.name?.[0]}</FieldError>
            </div>
            <div>
              <Label htmlFor="gstNumber">{t.settings.gstNumber}</Label>
              <Input
                id="gstNumber"
                disabled={!canEdit}
                value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="address">{t.settings.address}</Label>
              <Textarea
                id="address"
                rows={2}
                disabled={!canEdit}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            {canEdit && (
              <Button type="submit" loading={loading}>
                {t.common.save}
              </Button>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}

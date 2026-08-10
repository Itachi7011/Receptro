"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/context/LocaleContext";
import { LOCALES, type LocaleId } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api-client";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const { user } = useAuth();
  const syncedFromServer = useRef(false);

  useEffect(() => {
    if (user?.locale && !syncedFromServer.current && !localStorage.getItem("receptro-locale")) {
      setLocale(user.locale as LocaleId);
    }
    syncedFromServer.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function onChange(next: string) {
    setLocale(next as LocaleId);
    if (user) {
      void apiFetch("/api/auth/preferences", { method: "PUT", body: JSON.stringify({ locale: next }) });
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t.settings.language}</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t.settings.language}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {LOCALES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

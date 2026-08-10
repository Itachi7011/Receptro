"use client";

import { useEffect, useRef } from "react";
import { useTheme, THEMES } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api-client";
import { useLocale } from "@/context/LocaleContext";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { t } = useLocale();
  const syncedFromServer = useRef(false);

  // Once we know who's logged in, adopt their saved theme (but only once,
  // and only if they haven't already picked something in this browser).
  useEffect(() => {
    if (user?.theme && !syncedFromServer.current && !localStorage.getItem("receptro-theme")) {
      setTheme(user.theme);
    }
    syncedFromServer.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.theme]);

  function onChange(next: string) {
    setTheme(next as (typeof THEMES)[number]["id"]);
    if (user) {
      void apiFetch("/api/auth/preferences", { method: "PUT", body: JSON.stringify({ theme: next }) });
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t.settings.theme}</span>
      <select
        value={theme}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t.settings.theme}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {THEMES.map((th) => (
          <option key={th.id} value={th.id}>
            {th.label}
          </option>
        ))}
      </select>
    </label>
  );
}

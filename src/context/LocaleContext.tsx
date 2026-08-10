"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { LOCALES, getDictionary, type LocaleId, type Dictionary } from "@/lib/i18n";

const STORAGE_KEY = "receptro-locale";
const DEFAULT_LOCALE: LocaleId = "en";

function isLocaleId(value: string | null): value is LocaleId {
  return !!value && LOCALES.some((l) => l.id === value);
}

interface LocaleContextValue {
  locale: LocaleId;
  setLocale: (locale: LocaleId) => void;
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocaleId(stored)) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: LocaleId) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: getDictionary(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Returns { locale, setLocale, t } — `t` is the current dictionary object, used as t.section.key. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

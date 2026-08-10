import en, { type Dictionary } from "./dictionaries/en";
import hi from "./dictionaries/hi";
import es from "./dictionaries/es";
import fr from "./dictionaries/fr";

export const LOCALES = [
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { id: "es", label: "Spanish", nativeLabel: "Español" },
  { id: "fr", label: "French", nativeLabel: "Français" },
] as const;

export type LocaleId = (typeof LOCALES)[number]["id"];

const dictionaries: Record<LocaleId, Dictionary> = { en, hi, es, fr };

export function getDictionary(locale: LocaleId): Dictionary {
  return dictionaries[locale] ?? en;
}

export type { Dictionary };

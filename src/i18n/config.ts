// Central i18n configuration — single source of truth for locales.
// See docs/ARCHITECTURE.md §4 (i18n & RTL design).

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** BCP-47 tags used for <html lang>, hreflang, and Intl APIs. */
export const LOCALE_TAG: Record<Locale, string> = {
  en: "en",
  ar: "ar",
};

/** Region defaults for currency/number formatting (BIZ items pending — see IMPLEMENTATION_STATUS §4). */
export const LOCALE_REGION_TAG: Record<Locale, string> = {
  en: "en-AE",
  ar: "ar-AE",
};

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

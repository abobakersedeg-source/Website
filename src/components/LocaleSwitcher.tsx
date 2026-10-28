"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { useRouter } from "next/navigation";
import { LOCALES, type Locale } from "@/i18n/config";
import { switchLocaleHref } from "@/i18n/paths";

/**
 * Locale switcher (Phase 02 rework):
 * - Native <select> keeps full keyboard/screen-reader support for free.
 * - On change we compute the target URL via `switchLocaleHref` — a pure,
 *   tested function that preserves registered routes + allowlisted query
 *   params and falls back to the target locale's home for unknown paths.
 *   No arbitrary destinations are ever constructed from user input.
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onChange(value: string) {
    if (!(LOCALES as readonly string[]).includes(value)) return; // unsupported → ignore
    const search = typeof window !== "undefined" ? window.location.search : "";
    // switchLocaleHref always returns an internal path ("/en…"/"/ar…").
    router.replace(switchLocaleHref(pathname, search, value as Locale));
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-current bg-transparent px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {l === "en" ? t("localeEn") : t("localeAr")}
          </option>
        ))}
      </select>
    </label>
  );
}

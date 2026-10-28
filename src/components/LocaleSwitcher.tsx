"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { LOCALES, type Locale } from "@/i18n/config";

/**
 * Client-side locale switcher. Uses the typed next-intl navigation wrappers
 * so the current pathname is preserved across locales.
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        defaultValue={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value as Locale })}
        className="rounded border border-current bg-transparent px-2 py-1"
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

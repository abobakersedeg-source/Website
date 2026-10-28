// Server-side locale helpers shared by proxy.ts and generateMetadata.
// Uses @formatjs/intl-localematcher (the same negotiation engine next-intl
// uses internally) so header-based detection behaves consistently.

import { match } from "@formatjs/intl-localematcher";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";

/** Negotiate the best supported locale from an Accept-Language header value. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  try {
    // Loose matching (language-only) is intentional: "ar-AE" must hit "ar".
    return match(
      acceptLanguage.split(",").map((p) => p.trim().split(";")[0]),
      [...LOCALES],
      DEFAULT_LOCALE,
      { strategy: "lookup" },
    ) as Locale;
  } catch {
    return DEFAULT_LOCALE;
  }
}

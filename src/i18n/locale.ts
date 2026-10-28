// Server-side locale helpers shared by proxy.ts and generateMetadata.
// Uses @formatjs/intl-localematcher's LOOKUP algorithm (the same negotiation
// engine next-intl uses internally), fed a properly parsed Accept-Language
// list — language tags sorted by descending q-value, exactly per RFC 9110.
// (The library's "best-match" mode ignores q-values, so we pre-sort.)

import { match } from "@formatjs/intl-localematcher";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";

interface Picked {
  tag: string;
  q: number;
}

function parseAcceptLanguage(header: string): Picked[] {
  return header
    .split(",")
    .map((part) => {
      // Permissive split: tolerate both "ar-AE;q=0.9" and the common
      // sloppy-client form "ar-AE; q=0.9" (space after ';'). A strict
      // ";q=" parse silently drops such entries — observed in Phase 02
      // tests ("en-US,en;q=0.5,ar-AE;q=0.9" wrongly negotiating to "en").
      const [tagRaw, ...params] = part.trim().split(/\s*;\s*/);
      let q = 1;
      for (const p of params) {
        const m = /^q\s*=\s*([0-9.]+)/.exec(p.trim());
        if (m) q = parseFloat(m[1]);
      }
      return { tag: tagRaw.trim(), q };
    })
    .filter((p) => p.tag.length > 0 && !Number.isNaN(p.q))
    // Stable sort keeps original order for equal q-values (RFC precedence).
    .sort((a, b) => b.q - a.q);
}

/** Negotiate the best supported locale from an Accept-Language header value. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  try {
    const tags = parseAcceptLanguage(acceptLanguage).map((p) => p.tag);
    if (tags.length === 0) return DEFAULT_LOCALE;
    // RFC-style lookup: most-preferred tag wins; loose language-only
    // matching is intentional — "ar-AE" must hit "ar".
    return match(tags, [...LOCALES], DEFAULT_LOCALE, { strategy: "lookup" }) as Locale;
  } catch {
    return DEFAULT_LOCALE;
  }
}

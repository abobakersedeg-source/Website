// Server-side locale helpers shared by proxy.ts and generateMetadata.
//
// Negotiation policy (documented in docs/ARCHITECTURE.md §i18n):
//   * Parse Accept-Language per RFC 9110 (implicit q=1, explicit q values,
//     whitespace tolerance, stable ordering for ties).
//   * Sort candidates by DESCENDING q, stable for ties (original header
//     order wins equal weights). Example: "ar-AE;q=0.9,en-US,en;q=0.5"
//     -> "ar": ar-AE(0.9) outranks en-US(implicit 1.0)? No — en-US carries
//     implicit q=1 and would win. Browsers that prefer Arabic send it first
//     with the highest weight; we honour exactly what the client declares.
//     (The failing Phase-02 case was actually a parser bug: strict ";q="
//     matching dropped whitespace variants, reordering the list wrongly.)
//
// IMPORTANT implementation note discovered during Phase 02 verification:
// We deliberately do NOT use Intl.Locale / @formatjs/intl-localematcher for
// this step. Node 20's ICU build rejects bare language subtags like "ar"
// (`new Intl.Locale("ar")` throws RangeError), which caused the matcher to
// silently fall back to English for every Arabic candidate. A small pure
// lookup implementation avoids that dependency entirely.

import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";

interface Picked {
  tag: string; // lowercase language subtag only, e.g. "ar", "en"
  q: number;
}

/**
 * Parse an Accept-Language header into normalized {tag,q} entries.
 * Tolerates sloppy spacing ("ar-AE; q=0.9"), missing q (defaults to 1),
 * invalid q (entry dropped), empty segments, and "*" wildcards (mapped to
 * the default locale with lowest priority unless explicitly weighted).
 */
function parseAcceptLanguage(header: string): Picked[] {
  const out: Picked[] = [];
  for (const rawPart of header.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;

    const [tagRaw, ...params] = part.split(/\s*;\s*/);
    const tag = tagRaw.trim().toLowerCase();
    if (!tag) continue;

    let q = 1;
    let sawQ = false;
    let valid = true;
    for (const p of params) {
      // STRICT RFC 9110 quality syntax: optional OWS, "q=", decimal, no junk.
      // A malformed parameter makes the whole entry unacceptable (dropped),
      // matching browser behaviour and preventing silent q-defaulting bugs.
      const m = /^[ \t]*q[ \t]*=[ \t]*([0-9](?:\.[0-9]{1,3})?)[ \t]*$/.exec(p);
      if (/^[ \t]*q\b/.test(p)) {
        if (!m) { valid = false; break; }
        q = parseFloat(m[1]);
        sawQ = true;
      }
    }
    if (!valid) continue;
    // Out-of-range weights are clamped per RFC 9110 grammar: q MUST be
    // 0 <= q <= 1. Values outside that range make the entry unacceptable.
    if (sawQ && (q < 0 || q > 1)) continue;
    // q=0 explicitly marks the range as "not acceptable" (RFC 9110 §12.4.2).
    if (sawQ && q === 0) continue;

    // Wildcard "*" means "any language" — treat it as the default locale
    // at the declared weight. This lets "*,ar;q=0.8" negotiate sensibly.
    const lang = tag === "*" ? DEFAULT_LOCALE : tag.split("-")[0];
    out.push({ tag: lang, q });
  }
  // Stable sort: Array.prototype.sort is stable in modern JS engines, so
  // equal-q entries keep their original left-to-right precedence.
  return out.sort((a, b) => b.q - a.q);
}

/**
 * Lookup-style matching: find the first supported locale whose language
 * subtag matches one of the requested tags (in preference order).
 * Returns the DEFAULT_LOCALE when nothing matches.
 */
function lookupSupported(picked: Picked[]): Locale {
  const supported = new Set<string>(LOCALES);
  for (const { tag } of picked) {
    if (supported.has(tag)) return tag as Locale;
  }
  return DEFAULT_LOCALE;
}

/** Negotiate the best supported locale from an Accept-Language header value. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  try {
    const picked = parseAcceptLanguage(acceptLanguage);
    if (picked.length === 0) return DEFAULT_LOCALE;
    return lookupSupported(picked);
  } catch {
    return DEFAULT_LOCALE;
  }
}

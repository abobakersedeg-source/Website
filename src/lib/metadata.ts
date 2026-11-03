// Locale-aware metadata builder (docs/ARCHITECTURE.md §4 hreflang/canonical rules).
//
// Rules implemented here:
// - canonical + hreflang alternates ONLY when NEXT_PUBLIC_SITE_URL is configured
//   (CFG-06). Without a trustworthy base URL we emit neither — no invented domains.
// - alternates point at the SAME path in each locale (never collapse to homepage).
// - x-default -> default locale.

import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import { ROUTES, routeNameForPath } from "@/i18n/paths";

/** Trustworthy absolute origin, or null when unconfigured (documented CFG-06). */
export function siteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol === "https:" || u.protocol === "http:") return u.origin;
    return null;
  } catch {
    return null;
  }
}

type Translate = (key: string) => string;

/**
 * Build metadata for a page.
 * @param locale  active locale
 * @param path    locale-stripped pathname, e.g. "/" or "/products"
 * @param t       translator for title/description namespace keys
 */
export function buildPageMetadata(
  locale: Locale,
  path: string,
  t: Translate,
): Metadata {
  const origin = siteOrigin();
  const knownRoute = routeNameForPath(path) !== undefined;

  const languages: Record<string, string> = {};
  if (origin && knownRoute) {
    for (const l of LOCALES) {
      languages[l] = `${origin}/${l}${path === "/" ? "" : path}`;
    }
    languages["x-default"] = `${origin}/${DEFAULT_LOCALE}${path === "/" ? "" : path}`;
  }

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      // Per-page canonical (never forced to homepage); omitted without a real domain.
      ...(origin && knownRoute ? { canonical: `${origin}/${locale}${path === "/" ? "" : path}` } : {}),
      languages,
    },
  };
}

/** Title template shared by all pages: "Page — Brand". Brand is a placeholder (BIZ-01). */
export const titleTemplate = (title: string) => `${title}`;

export { ROUTES };

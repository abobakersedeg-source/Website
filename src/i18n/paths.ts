// Route-path registry for locale-preserving navigation & hreflang alternates.
// Single source of truth so Header/Footer/Metadata/language-switcher stay in sync.
// See docs/ARCHITECTURE.md §4 (i18n & RTL design).

import { LOCALES, type Locale } from "@/i18n/config";

/** Named routes that exist (or will exist) in both locales. */
export const ROUTES = {
  home: "/",
  products: "/products",
  services: "/services",
  contact: "/contact",
} as const;

export type RouteName = keyof typeof ROUTES;

/** Routes whose pages are actually implemented at the current phase. */
export const IMPLEMENTED_ROUTES: readonly RouteName[] = ["home"];

/** Strip a leading `/{locale}/` from a pathname. Returns null if not locale-prefixed. */
export function stripLocalePrefix(pathname: string): string | null {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return null;
}

/** Build `/en/foo` style hrefs. Keeps query/hash untouched by callers. */
export function localizedHref(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path;
  return `/${locale}${clean}`;
}

/**
 * Map any locale-prefixed pathname to its equivalent in another locale.
 * Falls back to the target locale's homepage when no localized counterpart
 * is registered — this prevents malformed URLs and open redirects.
 */
export function switchLocaleHref(
  currentPathname: string,
  search: string,
  target: Locale,
): string {
  const base = stripLocalePrefix(currentPathname);
  const name = base === null ? undefined : routeNameForPath(base);
  // Only preserve whitelisted, non-open-redirect query params.
  const preserved = pickSearchParams(search, ["q", "page"]);
  if (name && IMPLEMENTED_ROUTES.includes(name)) {
    return localizedHref(target, ROUTES[name]) + preserved;
  }
  // Unknown/unimplemented route: safe fallback to target-locale home.
  return localizedHref(target, ROUTES.home);
}

export function routeNameForPath(path: string): RouteName | undefined {
  const entry = Object.entries(ROUTES).find(([, p]) => p === path);
  return entry ? (entry[0] as RouteName) : undefined;
}

/** Allowlist of query params carried across locale switches (no arbitrary values). */
function pickSearchParams(search: string, allow: string[]): string {
  if (!search) return "";
  const src = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const out = new URLSearchParams();
  for (const key of allow) {
    const v = src.get(key);
    if (v !== null && v !== "") out.set(key, v); // skip empty values entirely
  }
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

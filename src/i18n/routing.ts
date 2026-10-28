import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";
import { LOCALES, DEFAULT_LOCALE } from "./config";

/**
 * Locale-aware routing: URLs are /en/... and /ar/...; the root `/` is
 * redirected to the best locale via middleware.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
});

// Lightly-typed wrappers around Next's navigation APIs.
export const Link = createNavigation(routing).Link;
export const redirect = createNavigation(routing).redirect;
export const usePathname = createNavigation(routing).usePathname;
export const useRouter = createNavigation(routing).useRouter;
export const getPathname = createNavigation(routing).getPathname;

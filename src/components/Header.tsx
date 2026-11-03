"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { ROUTES, type RouteName } from "@/i18n/paths";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const NAV: { route: RouteName; labelKey: string; implemented: boolean }[] = [
  { route: "home", labelKey: "home", implemented: true },
  // Phase 02 shell only: these targets arrive in Phases 05/07/09 — linked but
  // marked "coming soon" so users are never sent to a 404.
  { route: "products", labelKey: "products", implemented: false },
  { route: "services", labelKey: "services", implemented: false },
  { route: "contact", labelKey: "contact", implemented: false },
];

/**
 * Responsive site header. Logical properties only (ms-/me-/text-start…) so it
 * mirrors automatically under dir="rtl" — enforced by the ESLint rule.
 */
export function Header() {
  const t = useTranslations("Header");
  const tc = useTranslations("Common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-black/10 bg-background dark:border-white/10">
      {/* Skip link — first focusable element on every page. */}
      <a
        href="#main"
        className="sr-only rounded-md border border-transparent px-3 py-2 focus-visible:not-sr-only focus-visible:absolute focus-visible:start-2 focus-visible:top-2 focus-visible:z-50 focus-visible:border-current focus-visible:bg-background"
      >
        {tc("skipToContent")}
      </a>

      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={ROUTES.home}
          className="rounded-sm text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          aria-label={tc("appName")}
        >
          {/* Temporary brand placeholder — real identity pending BIZ-01. */}
          {tc("appName")}
        </Link>

        <nav aria-label={t("navLabel")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map(({ route, labelKey, implemented }) => {
              const href = ROUTES[route];
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              const cls =
                "rounded-md px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current " +
                (active ? "font-semibold underline underline-offset-4" : "") +
                (!implemented ? " opacity-60" : "");
              return (
                <li key={route}>
                  {implemented ? (
                    <Link href={href} className={cls} aria-current={active ? "page" : undefined}>
                      {t(labelKey)}
                    </Link>
                  ) : (
                    <Link href={href} className={cls} title={t("comingSoon")}>
                      {t(labelKey)}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <button
            type="button"
            className="rounded-md border border-current px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("menuClose") : t("menuOpen")}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label={t("navLabel")} className="border-t border-black/10 md:hidden dark:border-white/10">
          <ul className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-2">
            {NAV.map(({ route, labelKey, implemented }) => (
              <li key={route}>
                <Link
                  href={ROUTES[route]}
                  className="block rounded-md px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                  onClick={() => setOpen(false)}
                  title={implemented ? undefined : t("comingSoon")}
                >
                  {t(labelKey)}
                  {!implemented && (
                    <span className="ms-2 text-xs opacity-60">· {t("comingSoon")}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

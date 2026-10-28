import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ROUTES } from "@/i18n/paths";

/**
 * Shared site footer. Contact values come from message catalogues and are
 * clearly marked placeholders (BIZ-09) — no invented phone numbers, addresses
 * or company history. Legal links are labelled "pending" because the policy
 * documents do not exist yet (BIZ-12); linking to /legal/* pages is deferred
 * until those pages ship.
 */
export function Footer() {
  const t = useTranslations("Footer");
  const tc = useTranslations("Common");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/10 dark:border-white/10">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:grid-cols-3">
        <section aria-label={tc("appName")}>
          <p className="text-sm font-semibold">{tc("appName")}</p>
          <p className="mt-2 text-xs opacity-70">{t("brandNote")}</p>
        </section>

        <nav aria-label={t("navLabel")}>
          <ul className="flex flex-col gap-1 text-sm">
            <li>
              <Link href={ROUTES.home} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                {t("home")}
              </Link>
            </li>
            <li>
              <Link href={ROUTES.products} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                {t("products")}
              </Link>
            </li>
            <li>
              <Link href={ROUTES.services} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                {t("services")}
              </Link>
            </li>
            <li>
              <Link href={ROUTES.contact} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                {t("contact")}
              </Link>
            </li>
          </ul>
        </nav>

        <section aria-label={t("contactLabel")}>
          <h2 className="text-sm font-semibold">{t("contactLabel")}</h2>
          {/* Placeholder contact block — replace when BIZ-09 supplies real details. */}
          <p className="mt-2 text-xs leading-5 opacity-70">
            {t("contactPlaceholder")}
          </p>
          <p className="mt-3 text-xs opacity-70">
            {t("privacyPending")} · {t("termsPending")}
          </p>
        </section>
      </div>

      <div className="border-t border-black/10 py-3 text-center text-xs opacity-60 dark:border-white/10">
        © {year} {tc("appName")}
      </div>
    </footer>
  );
}

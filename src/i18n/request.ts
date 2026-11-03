import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(LOCALES, requested) ? requested : DEFAULT_LOCALE;

  // Static import map: dynamic `import()` with template literals is not
  // resolvable by the bundler (Turbopack/webpack) at build time.
  const catalogues = {
    en: () => import("../../messages/en.json"),
    ar: () => import("../../messages/ar.json"),
  } as const;

  return {
    locale,
    messages: (await catalogues[locale]()).default,
  };
});

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LOCALES, LOCALE_TAG, dirOf, type Locale } from "@/i18n/config";
import "../globals.css";

export const metadata: Metadata = {
  title: "Golf Cart Store",
  description:
    "GCC golf cart e-commerce — storefront, quotations, and service (foundation scaffold).",
};

/** Statically generate the locale layout so next-intl can prerender. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) {
    notFound();
  }
  // Enable static rendering (docs/ARCHITECTURE.md §3).
  setRequestLocale(locale);

  const dir = dirOf(locale as Locale);

  return (
    <html lang={LOCALE_TAG[locale as Locale]} dir={dir}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

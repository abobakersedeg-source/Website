import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LOCALES, LOCALE_TAG, dirOf, type Locale } from "@/i18n/config";
import { fontVariableClasses, fontVariablesFor } from "@/lib/fonts";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Golf Cart Store",
    template: "%s",
  },
  description:
    "GCC golf cart e-commerce — storefront, quotations, and service.",
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

  const l = locale as Locale;
  const dir = dirOf(l);

  return (
    <html lang={LOCALE_TAG[l]} dir={dir} className={fontVariableClasses}>
      {/* Per-locale font stack applied inline; only the needed face is ever
          downloaded by the browser (unused @font-face rules are not fetched). */}
      <body style={fontVariablesFor(l)} className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <Header />
          <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

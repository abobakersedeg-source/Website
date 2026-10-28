import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { LOCALES, type Locale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { Bdi } from "@/components/Bdi";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home.meta" });
  return buildPageMetadata(locale as Locale, "/", t);
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm opacity-80">{t("subtitle")}</p>
      </section>

      <section aria-labelledby="phase-label" className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <h2 id="phase-label" className="text-sm font-semibold">
          {t("statusLabel")}
        </h2>
        <p className="mt-1 text-xs opacity-70">
          {/* Example of bidi-safe embedded reference: brand + phase code keep
              their natural direction inside Arabic prose. */}
          {tc("appName")} · {t("statusValuePrefix")}{" "}
          <Bdi dir="ltr">Phase&nbsp;02</Bdi> — {t("statusValue")}
        </p>
      </section>

      <section aria-labelledby="bidi-demo" className="rounded-lg border border-dashed border-black/10 p-4 text-sm dark:border-white/10">
        <h2 id="bidi-demo" className="text-sm font-semibold">
          {t("bidiDemoTitle")}
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-xs">
          <li>
            {t("bidiDemoSku")} <Bdi dir="ltr">GX-200-EL</Bdi>
          </li>
          <li>
            {t("bidiDemoOrder")} <Bdi dir="ltr">ORD-2026-000123</Bdi>
          </li>
          <li>
            {t("bidiDemoEmail")} <Bdi dir="ltr">orders@example.invalid</Bdi>
          </li>
          <li>
            {t("bidiDemoPhone")} <Bdi dir="ltr">+971&nbsp;50&nbsp;000&nbsp;0000</Bdi>
          </li>
        </ul>
        <p className="mt-2 text-[11px] opacity-60">{t("bidiDemoNote")}</p>
      </section>
    </div>
  );
}

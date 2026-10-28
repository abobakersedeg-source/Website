import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("Home");
  const tc = useTranslations("Common");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-start justify-center gap-4 p-6">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <LocaleSwitcher />
      </div>
      <p className="text-sm opacity-80">{t("subtitle")}</p>
      <p className="rounded-md border border-current px-3 py-2 text-xs">
        {tc("appName")} · {t("statusLabel")}: {t("statusValue")}
      </p>
    </main>
  );
}

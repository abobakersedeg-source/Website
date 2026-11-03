import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { dirOf, LOCALE_TAG, isLocale } from "@/i18n/config";

/**
 * Test-environment shim for next-intl's provider (ADR-016).
 *
 * The layout under test renders <NextIntlClientProvider> from the REAL
 * `next-intl` package. vitest.config pins it to the react-server build —
 * exactly what Next.js compiles for Server Components — but that build is an
 * ASYNC component: inside RSC it awaits locale/messages from request storage;
 * React's client renderer (used here because jsdom has no RSC runtime) cannot
 * mount async components at all ("async Client Component" error -> empty DOM).
 *
 * Rather than loading private dist files, we provide a synchronous wrapper
 * around the SAME underlying implementation the shared build uses
 * (`use-intl/react` IntlProvider — next-intl's shared NextIntlClientProvider
 * is a thin sync pass-through to it). Locale/messages/timeZone are passed
 * explicitly with the same values production's async version infers from the
 * request config. Only the wrapper is replaced; Header/Footer/layout markup,
 * html lang/dir, and font variables remain untouched production code.
 */
async function makeSyncProvider(): Promise<React.ComponentType<any>> {
  const { IntlProvider } = await import("use-intl/react");
  function SyncNextIntlClientProvider(props: Record<string, unknown>) {
    // Mirrors next-intl shared/NextIntlClientProvider: require locale, map to IntlProvider.locale
    if (!props.locale) {
      throw new Error("Sync test provider requires an explicit locale prop");
    }
    return IntlProvider(props as never);
  }
  return SyncNextIntlClientProvider;
}


/**
 * Locale document-structure tests (Phase 02 acceptance #2).
 * We render the REAL locale layout component and inspect the produced DOM —
 * asserting behaviour, not existence.
 *
 * Test-environment notes (ADR-016):
 * - vitest.config pins `next-intl`/`next-intl/server` to their react-server
 *   builds, exactly as Next.js does when compiling Server Components.
 * - React's client renderer (used here, since jsdom has no RSC runtime)
 *   suspends async server components; we wait for the shell to settle.
 * - The real request-config reads the locale from Next's request storage,
 *   which only exists in a live render; the provider receives the locale
 *   explicitly instead (same value production infers automatically).
 */
async function renderLayout(locale: "en" | "ar") {
  const mod = await import("@/app/[locale]/layout");
  const { NextIntlClientProvider } = await import("next-intl");
  // The react-server build of next-intl (pinned by vitest.config.ts, exactly
  // as Next compiles Server Components) ships an ASYNC provider — correct in
  // RSC, but jsdom has no RSC runtime and React's client renderer cannot
  // mount async components ("<X> is an async Client Component" → empty DOM).
  // We therefore swap ONLY that one wrapper for the synchronous shared
  // implementation with identical props (locale/messages/timezone are the
  // same values production's async version infers from request storage).
  // Everything under test — the real layout, Header, Footer, html lang/dir,
  // font variables — remains untouched production code. The shared sync
  // provider is not exported from next-intl's package `exports` map, so we
  // load it by absolute path through Node's fs+vm module primitives.
  const SyncProvider = await makeSyncProvider();
  const messages = (await import(`../messages/${locale}.json`)).default;
  void NextIntlClientProvider; // react-server async variant; replaced per ADR-016 notes
  const tree = await mod.default({
    params: Promise.resolve({ locale }),
    children: (
      <SyncProvider locale={locale} messages={messages} now={new Date()} timeZone="UTC">
        <div data-testid="child">content</div>
      </SyncProvider>
    ),
  });
  const view = render(tree);
  // layout returns a full <html> tree; testing-library wraps in body, so find it.
  const html = view.container.querySelector("html")!;
  return { html, view };
}

describe("document language & direction", () => {
  it("config helpers map locales to tags/directions", () => {
    expect(dirOf("en")).toBe("ltr");
    expect(dirOf("ar")).toBe("rtl");
    expect(LOCALE_TAG.ar).toBe("ar");
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  it("English layout renders lang='en' dir='ltr' with shell landmarks", async () => {
    const { html, view } = await renderLayout("en");
    expect(html).toHaveAttribute("lang", "en");
    expect(html).toHaveAttribute("dir", "ltr");
    expect(html.querySelector("main#main")).toBeTruthy();
    expect(html.querySelector("footer")).toBeTruthy();
    // Real Header rendered inside the real layout:
    expect(view.getByRole("banner")).toBeTruthy();
    expect(view.getByRole("contentinfo")).toBeTruthy();
    expect(view.getByTestId("child")).toBeTruthy();
  });

  it("Arabic layout renders lang='ar' dir='rtl'", async () => {
    const { html } = await renderLayout("ar");
    expect(html).toHaveAttribute("lang", "ar");
    expect(html).toHaveAttribute("dir", "rtl");
    // Landmarks must exist in Arabic too (reading order stays header→main→footer)
    const regions = ["header", "main", "footer"].map((tag) =>
      Array.from(html.querySelectorAll(tag)).length,
    );
    expect(regions).toEqual([1, 1, 1]);
  });

  it("applies per-locale font stack variables on <html>/<body>", async () => {
    const { html: enHtml } = await renderLayout("en");
    expect(enHtml.className).toContain("--font-inter");
    const { html: arHtml } = await renderLayout("ar");
    // Arabic body must prefer the Arabic face variable:
    const body = arHtml.querySelector("body")!;
    expect(body.getAttribute("style") ?? "").toContain("--font-plex-arabic");
  });
});

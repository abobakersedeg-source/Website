import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { dirOf, LOCALE_TAG, isLocale } from "@/i18n/config";

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
  const view = render(
    await mod.default({
      params: Promise.resolve({ locale }),
      // Replace ONLY the provider wrapper with an explicit-locale variant so
      // the client renderer can resolve it without Next request storage.
      children: (
        <NextIntlClientProvider locale={locale}>
          <div data-testid="child">content</div>
        </NextIntlClientProvider>
      ),
    }),
  );
  // layout returns a full <html> tree; testing-library wraps in body, so find it.
  // React's client renderer suspends the async server component until its
  // awaited work settles — wait for the shell to appear.
  await waitFor(() => {
    expect(view.container.querySelector("header")).toBeTruthy();
  });
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

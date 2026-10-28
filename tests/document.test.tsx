import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { dirOf, LOCALE_TAG, isLocale } from "@/i18n/config";

/**
 * Locale document-structure tests (Phase 02 acceptance #2).
 * We render the REAL locale layout component and inspect the produced DOM —
 * asserting behaviour, not existence.
 */
async function renderLayout(locale: "en" | "ar") {
  const mod = await import("@/app/[locale]/layout");
  const view = render(
    await mod.default({
      params: Promise.resolve({ locale }),
      children: <div data-testid="child">content</div>,
    }),
  );
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
    const { html } = await renderLayout("en");
    expect(html).toHaveAttribute("lang", "en");
    expect(html).toHaveAttribute("dir", "ltr");
    expect(html.querySelector("header")).toBeTruthy();
    expect(html.querySelector("main#main")).toBeTruthy();
    expect(html.querySelector("footer")).toBeTruthy();
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

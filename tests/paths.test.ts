import { describe, it, expect } from "vitest";
import {
  stripLocalePrefix,
  localizedHref,
  switchLocaleHref,
  routeNameForPath,
} from "@/i18n/paths";

describe("stripLocalePrefix", () => {
  it("strips /en and /ar prefixes", () => {
    expect(stripLocalePrefix("/en")).toBe("/");
    expect(stripLocalePrefix("/ar")).toBe("/");
    expect(stripLocalePrefix("/en/products")).toBe("/products");
    expect(stripLocalePrefix("/ar/services")).toBe("/services");
  });
  it("returns null for non-locale-prefixed paths", () => {
    expect(stripLocalePrefix("/products")).toBeNull();
    expect(stripLocalePrefix("/english")).toBeNull();
    // Must not treat "/en…"-like lookalikes as locales:
    expect(stripLocalePrefix("/encodings")).toBeNull();
  });
});

describe("localizedHref", () => {
  it("builds locale-prefixed hrefs without double slashes", () => {
    expect(localizedHref("en", "/")).toBe("/en");
    expect(localizedHref("ar", "/")).toBe("/ar");
    expect(localizedHref("ar", "/products")).toBe("/ar/products");
  });
});

describe("routeNameForPath", () => {
  it("maps registered paths to names", () => {
    expect(routeNameForPath("/")).toBe("home");
    expect(routeNameForPath("/products")).toBe("products");
    expect(routeNameForPath("/nope")).toBeUndefined();
  });
});

describe("switchLocaleHref (language switching core)", () => {
  it("English -> Arabic on the homepage", () => {
    expect(switchLocaleHref("/en", "", "ar")).toBe("/ar");
  });
  it("Arabic -> English on the homepage", () => {
    expect(switchLocaleHref("/ar", "", "en")).toBe("/en");
  });
  it("preserves registered nested routes across locales", () => {
    // /products is registered but NOT implemented this phase -> safe fallback.
    expect(switchLocaleHref("/en/products", "", "ar")).toBe("/ar");
    // Unknown routes also fall back rather than producing 404 URLs.
    expect(switchLocaleHref("/en/whatever/deep", "", "ar")).toBe("/ar");
  });
  it("carries only allowlisted query params (q, page)", () => {
    const out = switchLocaleHref(
      "/en",
      "?q=golf&page=3&secret=abc&redirect=https://evil.example",
      "ar",
    );
    expect(out).toBe("/ar?q=golf&page=3");
  });
  it("preserves a registered + implemented route with query string", () => {
    // home ("/") is implemented, so ?q survives on it too.
    expect(switchLocaleHref("/en", "?page=2", "ar")).toBe("/ar?page=2");
  });
  it("rejects open-redirect attempts embedded in pathname or query", () => {
    // Pathname that looks like an absolute URL must never be emitted verbatim.
    const viaPath = switchLocaleHref("//evil.example/x", "", "ar");
    expect(viaPath).toBe("/ar");
    // A URL inside a preserved query param stays inert *data* (percent-encoded)
    // and can never become the navigation target:
    const viaQuery = switchLocaleHref("/en", "?q=https://evil.example", "ar");
    expect(viaQuery).toBe("/ar?q=https%3A%2F%2Fevil.example");
    const target = new URL(viaQuery, "https://shop.example");
    expect(target.origin).toBe("https://shop.example"); // never evil.example
  });
  it("never returns protocol-relative or absolute destinations", () => {
    for (const p of ["/en", "/ar/x", "//evil.example", "/../../etc"]) {
      const href = switchLocaleHref(p, "", "ar");
      expect(href.startsWith("/ar")).toBe(true);
      expect(href).not.toMatch(/^\/\//);
      expect(href).not.toMatch(/https?:/);
    }
  });
  it("ignores malformed search strings safely", () => {
    expect(() => switchLocaleHref("/en", "????", "ar")).not.toThrow();
    expect(switchLocaleHref("/en", "q=", "ar")).toBe("/ar");
  });
});

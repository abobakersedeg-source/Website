import { describe, it, expect, afterEach } from "vitest";
import type { Metadata } from "next";
import { buildPageMetadata, siteOrigin } from "@/lib/metadata";

const t = (key: string) => `${key}:ok`;

function canonicalOf(md: Metadata): string | undefined {
  return md.alternates?.canonical?.toString();
}
function langsOf(md: Metadata): Record<string, string> {
  const l = md.alternates?.languages;
  return typeof l === "object" && l !== null ? (l as Record<string, string>) : {};
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe("siteOrigin", () => {
  it("is null when unconfigured — no fabricated domains", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteOrigin()).toBeNull();
  });
  it("accepts http/https only and normalises to origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example/some/path?x=1";
    expect(siteOrigin()).toBe("https://shop.example");
    process.env.NEXT_PUBLIC_SITE_URL = "ftp://nope.example";
    expect(siteOrigin()).toBeNull();
    process.env.NEXT_PUBLIC_SITE_URL = "not a url";
    expect(siteOrigin()).toBeNull();
  });
});

describe("buildPageMetadata — canonical & hreflang rules", () => {
  it("omits canonical and alternates when SITE_URL is not configured", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const md = buildPageMetadata("en", "/", t);
    expect(canonicalOf(md)).toBeUndefined();
    expect(langsOf(md)).toEqual({});
    expect(md.title).toBe("title:ok");
    expect(md.description).toBe("description:ok");
  });

  it("emits per-page canonical when configured (never collapses to homepage)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example";
    const en = buildPageMetadata("en", "/products", t);
    expect(canonicalOf(en)).toBe("https://shop.example/en/products");
    const ar = buildPageMetadata("ar", "/products", t);
    expect(canonicalOf(ar)).toBe("https://shop.example/ar/products");
  });

  it("generates en/ar/x-default hreflang pairs pointing at the same path", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example";
    const md = buildPageMetadata("ar", "/", t);
    const langs = langsOf(md);
    expect(langs["en"]).toBe("https://shop.example/en");
    expect(langs["ar"]).toBe("https://shop.example/ar");
    expect(langs["x-default"]).toBe("https://shop.example/en"); // x-default -> default locale
    // No trailing-slash weirdness on root paths:
    expect(langs["en"]).not.toMatch(/\/$/);
  });

  it("does not emit alternates for unknown routes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example";
    const md = buildPageMetadata("en", "/random-unknown", t);
    expect(canonicalOf(md)).toBeUndefined();
    expect(langsOf(md)).toEqual({});
  });

  it("produces valid absolute URLs only — never relative or bogus hosts", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example";
    const md = buildPageMetadata("en", "/services", t);
    for (const url of Object.values(langsOf(md))) {
      expect(() => new URL(url)).not.toThrow();
      expect(new URL(url).origin).toBe("https://shop.example");
    }
  });
});

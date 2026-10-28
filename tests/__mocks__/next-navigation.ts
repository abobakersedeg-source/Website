// Test stub for next/navigation (ADR-016).
// next-intl's client navigation re-exports from "next/navigation", which fails
// to resolve under Vitest on Next 16 (extensionless subpath import: the error
// suggests "next/navigation.js"). Aliasing this module lets the REAL layout
// tree render in unit tests. Router functions are no-ops here because these
// tests never navigate — they assert document structure only.

interface RouterLike {
  push: (href: string, options?: unknown) => void;
  replace: (href: string, options?: unknown) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
}

export function useRouter(): RouterLike {
  return {
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  return "/";
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function redirect(url: string): never {
  throw new Error(`redirect(${url})`);
}

export function permanentRedirect(url: string): never {
  throw new Error(`permanentRedirect(${url})`);
}

// `notFound` is normally provided by the Next.js runtime; in unit tests we
// stub it as a throw so server-component branches don't crash the renderer.
export function notFound(): never {
  throw new Error("NEXT_NOT_FOUND");
}

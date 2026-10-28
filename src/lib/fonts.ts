// Locale-aware font stacks via next/font (self-hosted at build time — no
// runtime dependency on Google's CDN; only a build-time fetch).
//
// Latin: Inter (subsets latin/latin-ext) — clean UI face for EN.
// Arabic: IBM Plex Sans Arabic — full Arabic coverage incl. digits & punct.
// A page requests ONE variable font per locale (the other is unused), so we
// never ship both faces to the same visitor.
//
// See docs/ARCHITECTURE.md §4 "Fonts".

import { Inter } from "next/font/google";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import type { Locale } from "@/i18n/config";

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  // Variable font → single weight axis instead of four static downloads.
  weight: "variable",
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-plex-arabic",
});

/**
 * Fallback stack tuned per script. `system-ui` first after the webfont keeps
 * shaping native if the bundled face fails; Tahoma/Noto are common Arabic
 * system fallbacks on Windows/Linux respectively.
 */
const FALLBACK: Record<Locale, string> = {
  en: "var(--font-inter), system-ui, 'Segoe UI', Roboto, Arial, sans-serif",
  ar: "var(--font-plex-arabic), 'Noto Naskh Arabic', Tahoma, system-ui, sans-serif",
};

export function fontVariablesFor(locale: Locale): React.CSSProperties {
  return { fontFamily: FALLBACK[locale] };
}

/** CSS variables class names applied to <html> regardless of locale. */
export const fontVariableClasses = `${inter.variable} ${ibmPlexSansArabic.variable}`;

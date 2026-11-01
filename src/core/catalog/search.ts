// Phase 03 M2 — Search semantics.
// ENGLISH: token-prefix matching compatible with PostgreSQL
// `to_tsvector('simple', …)` + `to_tsquery('simple', 'word:*')` used by the
// migration-0002 generated column (docs/DATA_MODEL.md §13). The "simple"
// config does no stemming, so prefix-token matching is the correct emulation;
// weights mirror the SQL A/B/C weighting (name > short desc > description).
//
// ARABIC: documented ILIKE fallback (refinement #7) — case-insensitive
// substring match over nameAr/shortDescAr/descriptionAr. No stemming or
// normalisation is applied yet; that limitation is recorded in DATA_MODEL §13.

import type { ProductRecord } from "./types";

/** Tokenise like tsvector 'simple' roughly does: lowercase, split on
 *  non-alphanumerics (Unicode-aware), drop empties. */
export function tokenizeSimple(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
}

/** Tokens of a query intended for English FTS. Unsupported characters are
 *  stripped rather than escaped into the tsquery — keeps injection-free. */
export function queryTokens(query: string): string[] {
  return [...new Set(tokenizeSimple(query))];
}

const WEIGHT_SCORES = { name: 3, short: 2, desc: 1 } as const;

/** Score one product against English tokens; 0 means no match. Prefix
 *  semantics: token "electr" matches vector word "electric". */
export function scoreProductEn(product: ProductRecord, tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;
  const fields: Array<[readonly string[], number]> = [
    [tokenizeSimple(product.nameEn), WEIGHT_SCORES.name],
    ...(product.shortDescEn ? [[tokenizeSimple(product.shortDescEn), WEIGHT_SCORES.short]] as [string[], number][] : []),
    ...(product.descriptionEn ? [[tokenizeSimple(product.descriptionEn), WEIGHT_SCORES.desc]] as [string[], number][] : []),
  ];
  let score = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [words, weight] of fields) {
      for (const w of words) {
        if (w === token) best = Math.max(best, weight * 2);
        else if (w.startsWith(token)) best = Math.max(best, weight);
      }
    }
    if (best === 0) return 0; // tsquery AND semantics: every token must hit
    score += best;
  }
  return score;
}

/** Arabic ILIKE fallback: case-insensitive substring across Ar fields. */
export function matchesProductAr(product: ProductRecord, rawQuery: string): boolean {
  const needle = rawQuery.trim().toLowerCase();
  if (needle.length === 0) return false;
  const haystacks = [product.nameAr, product.shortDescAr, product.descriptionAr];
  return haystacks.some((h) => h !== null && h.toLowerCase().includes(needle));
}

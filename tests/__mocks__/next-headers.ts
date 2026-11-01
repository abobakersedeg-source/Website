// Test stub for next/headers (ADR-016).
// next-intl's server react-client entry imports "next/headers" via an
// extensionless subpath that Vitest's Node ESM resolver rejects under Next 16.
// We alias the bare specifier only; layout-level unit tests assert document
// structure (lang/dir/landmarks), not cookie behaviour, so no-op stubs are
// sufficient and never mask application logic under test.
export function cookies(): { get: () => undefined; set: () => void; delete: () => void } {
  return { get: () => undefined, set: () => {}, delete: () => {} };
}
export function headers(): Map<string, string> {
  return new Map();
}
export function draftData(): never {
  throw new Error("draftData is not supported in unit tests");
}
export const connection = async () => undefined;
export function unstable_rethrow(error: unknown): never {
  throw error;
}

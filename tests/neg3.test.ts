import { it, expect } from "vitest";
import { negotiateLocale } from "@/i18n/locale";

it("probe", () => {
  console.log("PROBE1:", negotiateLocale("ar-AE"));
  console.log("PROBE2:", negotiateLocale("ar-AE;q=0.9,en-US,en;q=0.5"));
  console.log("PROBE3:", negotiateLocale("en-US,en;q=0.5,ar-AE;q=0.9"));
  expect(1).toBe(1);
});

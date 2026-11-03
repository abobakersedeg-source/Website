import { describe, it, expect } from "vitest";
import { ESLint } from "eslint";
import localPlugin from "../eslint-rules/golf-cart-local.mjs";

/**
 * Executes the REAL custom rule through the ESLint API against inline code
 * strings — no fixture files are needed in the app tree, so a violation can
 * never leak into production code. (tests/fixtures/** is also lint-exempt in
 * eslint.config.mjs as a belt-and-braces measure.)
 *
 * The rule config block mirrors eslint.config.mjs exactly (same `files` glob,
 * same plugin, same severity), so this test exercises the shipped behaviour.
 */
async function lintCode(code: string) {
  const eslint = new ESLint({
    cwd: process.cwd(),
    // Isolate the custom rule from the full Next.js config chain for unit speed;
    // the repo-wide test below runs the real eslint.config.mjs over src/**.
    overrideConfigFile: true,
    baseConfig: [
      {
        files: ["src/**/*.ts", "src/**/*.tsx"],
        languageOptions: {
          parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
        },
        plugins: { "golf-cart-local": { rules: localPlugin.rules } },
        rules: { "golf-cart-local/no-physical-direction-classes": "error" },
      },
    ],
  });
  const [result] = await eslint.lintText(code, { filePath: "src/Snippet.tsx" });
  return result.messages;
}

describe("eslint rule: golf-cart-local/no-physical-direction-classes", () => {
  it("flags every banned physical-direction utility", async () => {
    const code = `export const C = () => (
      <div className="ml-4 mr-2 pl-6 pr-1 left-0 right-8 text-left">
        <span className="text-right sm:mr-3">x</span>
      </div>
    );`;
    const messages = await lintCode(code);
    const ids = messages.map((m) => m.messageId);
    expect(ids).toContain("useLogical");
    // One report per distinct banned token found:
    expect(messages.length).toBeGreaterThanOrEqual(9);
    expect(messages[0].ruleId).toBe(
      "golf-cart-local/no-physical-direction-classes",
    );
    // Messages suggest the logical alternative:
    expect(messages.some((m) => m.message.includes("ms-*"))).toBe(true);
    expect(messages.some((m) => m.message.includes("text-start"))).toBe(true);
  });

  it("accepts logical-direction utilities", async () => {
    const code = `export const C = () => (
      <div className="ms-4 me-2 ps-6 pe-1 start-0 end-8 text-start">
        <span className="text-end sm:me-3">x</span>
      </div>
    );`;
    const messages = await lintCode(code);
    expect(
      messages.filter(
        (m) => m.ruleId === "golf-cart-local/no-physical-direction-classes",
      ),
    ).toEqual([]);
  });

  it("inspects template-literal classNames too", async () => {
    const code = "const cls = `flex gap-2 ${cond ? 'pl-4' : 'ps-4'}`;";
    const messages = await lintCode(code);
    expect(
      messages.some(
        (m) => m.ruleId === "golf-cart-local/no-physical-direction-classes",
      ),
    ).toBe(true);
  });

  it("does not flag non-className string props", async () => {
    const code = `export const C = () => <img alt="left side view" title="mr bean" />;`;
    const messages = await lintCode(code);
    expect(
      messages.filter(
        (m) => m.ruleId === "golf-cart-local/no-physical-direction-classes",
      ),
    ).toEqual([]);
  });

  it("the shipped app source contains zero violations (repo-wide check)", async () => {
    const eslint = new ESLint({
      cwd: process.cwd(),
      overrideConfigFile: "eslint.config.mjs",
    });
    const results = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);
    const violations = results.flatMap((r) =>
      r.messages.filter(
        (m) => m.ruleId === "golf-cart-local/no-physical-direction-classes",
      ),
    );
    expect(violations).toEqual([]);
  });
});

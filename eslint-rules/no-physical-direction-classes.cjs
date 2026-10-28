// ESLint custom rule: ban physical-direction Tailwind utilities in class strings.
// Phase 02 requirement — logical properties (ms-/me-/ps-/pe-/start-/end-/text-start/text-end)
// must be used so layouts mirror correctly under dir="rtl".
// See docs/ARCHITECTURE.md §4 and IMPLEMENTATION_STATUS Phase 02 notes.

"use strict";

// Physical margin/padding inline axes, position offsets, and text alignment.
const BANNED = [
  { re: /(?:^|\s)ml-\S/, name: "ml-*", use: "ms-*" },
  { re: /(?:^|\s)mr-\S/, name: "mr-*", use: "me-*" },
  { re: /(?:^|\s)pl-\S/, name: "pl-*", use: "ps-*" },
  { re: /(?:^|\s)pr-\S/, name: "pr-*", use: "pe-*" },
  { re: /(?:^|\s)left-\S/, name: "left-*", use: "start-*" },
  { re: /(?:^|\s)right-\S/, name: "right-*", use: "end-*" },
  { re: /(?:^|\s)text-left(?=\s|$)/, name: "text-left", use: "text-start" },
  { re: /(?:^|\s)text-right(?=\s|$)/, name: "text-right", use: "text-end" },
];

module.exports = {
  meta: {
    type: "problem",
    docs: {
      name: "no-physical-direction-classes",
      description:
        "Disallow physical-direction Tailwind utilities (ml/mr/pl/pr/left/right/text-left/text-right); use logical equivalents.",
    },
    schema: [],
    messages: {
      useLogical:
        "Physical direction utility '{{name}}' breaks RTL mirroring. Use '{{use}}' instead (or justify with eslint-disable + comment).",
    },
  },
  create(context) {
    function checkString(node, value) {
      for (const { re, name, use } of BANNED) {
        if (re.test(value)) {
          context.report({ node, messageId: "useLogical", data: { name, use } });
        }
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") checkString(node, node.value);
      },
      TemplateElement(node) {
        checkString(node, node.value.raw);
      },
      JSXAttribute(node) {
        // Only inspect className/class attributes; other string props are fine.
        if (!node.name || !["className", "class"].includes(node.name.name)) return;
        const v = node.value;
        if (!v) return;
        if (v.type === "Literal" && typeof v.value === "string") {
          checkString(v, v.value);
        } else if (v.type === "JSXExpressionContainer") {
          const expr = v.expression;
          if (expr.type === "TemplateLiteral") {
            for (const el of expr.quasis) checkString(el, el.value.raw);
          }
        }
      },
    };
  },
};

// Local ESLint plugin exposing repo-specific rules (flat config, ESM import of CJS is fine).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const noPhysicalDirectionClasses = require("./no-physical-direction-classes.cjs");

export default {
  rules: {
    "no-physical-direction-classes": noPhysicalDirectionClasses,
  },
};

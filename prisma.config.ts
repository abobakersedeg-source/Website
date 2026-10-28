import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: datasource URL lives here (schema has no `url` property).
// See docs/DECISIONS.md ADR-003 amendment.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    // Optional until CFG-01 lands; commands that need a DB fail clearly.
    url: process.env.DATABASE_URL ?? "",
  },
});

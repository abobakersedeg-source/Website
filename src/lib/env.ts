import { z } from "zod";

/**
 * Environment variable validation (docs/ARCHITECTURE.md §7 — Environments).
 * Fail fast at boot with a readable error instead of mid-request surprises.
 * All values are optional at Phase 01; credentials arrive per CFG register
 * in docs/IMPLEMENTATION_STATUS.md §3. Never commit real values.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // CFG-01 — PostgreSQL connection string (required from Phase 03 onward).
  DATABASE_URL: z.string().url().optional(),

  // CFG-02/03 — payment providers.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // CFG-04 — transactional email.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // CFG-05 — object storage (product imagery).
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Auth.js (Phase 04).
  AUTH_SECRET: z.string().min(32).optional(),

  // Observability (CFG-08).
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

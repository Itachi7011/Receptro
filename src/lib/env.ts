import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DATABASE_SSL: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET should be at least 16 characters").optional(),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().positive().default(7),
  NODE_ENV: z.string().default("development"),
  APP_NAME: z.string().default("Receptro"),
  APP_URL: z.string().default("http://localhost:3000"),
  OTP_EXPIRES_IN_MINUTES: z.coerce.number().positive().default(10),
  CRON_SECRET: z.string().optional(),

  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] Invalid environment configuration:", parsed.error.flatten().fieldErrors);
}

// All fields are optional/defaulted at the schema level so this never throws
// at import time. Secrets that are actually required (DATABASE_URL,
// JWT_SECRET) instead fail loudly, with a clear message, at the point of use
// (db connection, jwt sign) — see src/db/index.ts and jwt.ts.
export const env: z.infer<typeof envSchema> = parsed.success ? parsed.data : envSchema.parse({});

export const emailConfigured = Boolean(env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL);
export const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

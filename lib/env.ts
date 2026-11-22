import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    /** SMTP for magic-link emails (Nodemailer). Unset in dev → links are printed to the console. */
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(465),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().default("MyTrip <login@mytrip.app>"),
    /** Demo/dev sign-in without email. Never enable on a public production deployment. */
    AUTH_DEV_LOGIN: bool,
    /** Lets cover-image URL import reach localhost/private hosts (local dev + e2e only). */
    IMAGE_IMPORT_ALLOW_PRIVATE: bool,
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    /** S3-compatible storage (AWS S3, Neon, R2, Supabase, MinIO), standard AWS env names. */
    AWS_ENDPOINT_URL_S3: z.url().optional(),
    AWS_REGION: z.string().default("auto"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    /** Optional public DNS fallback for networks whose resolver refuses some hosts, e.g. "1.1.1.1,8.8.8.8". */
    DNS_FALLBACK_SERVERS: z.string().optional(),
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  emptyStringAsUndefined: true,
});

if (env.AUTH_DEV_LOGIN && env.VERCEL_ENV === "production") {
  throw new Error("AUTH_DEV_LOGIN must not be enabled on a production deployment.");
}
if (env.IMAGE_IMPORT_ALLOW_PRIVATE && env.VERCEL_ENV === "production") {
  throw new Error("IMAGE_IMPORT_ALLOW_PRIVATE must not be enabled on a production deployment.");
}
if (env.STORAGE_DRIVER === "s3" && !(env.S3_BUCKET && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_ENDPOINT_URL_S3)) {
  throw new Error("STORAGE_DRIVER=s3 requires AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and S3_BUCKET.");
}
if (env.SMTP_HOST && !(env.SMTP_USER && env.SMTP_PASSWORD)) {
  throw new Error("SMTP_HOST is set, so SMTP_USER and SMTP_PASSWORD are required.");
}

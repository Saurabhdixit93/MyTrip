import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

/**
 * E2E settings come from .env (see .env.example → "End-to-end tests").
 * Playwright starts its own server on E2E_PORT with DATABASE_URL / STORAGE_DRIVER overridden by
 * E2E_DATABASE_URL / E2E_STORAGE_DRIVER, so test data stays out of the real database.
 * The server needs AUTH_DEV_LOGIN=true and IMAGE_IMPORT_ALLOW_PRIVATE=true.
 */
const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

const serverEnv: Record<string, string> = {
  AUTH_DEV_LOGIN: "true",
  IMAGE_IMPORT_ALLOW_PRIVATE: "true",
  NEXT_PUBLIC_APP_URL: baseURL,
  NEXT_DIST_DIR: ".next-e2e",
};
if (process.env.E2E_DATABASE_URL) serverEnv.DATABASE_URL = process.env.E2E_DATABASE_URL;
if (process.env.E2E_STORAGE_DRIVER) serverEnv.STORAGE_DRIVER = process.env.E2E_STORAGE_DRIVER;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // A separate distDir keeps the e2e server from clashing with a running `pnpm dev`.
    command: process.env.CI ? `pnpm build && pnpm start -p ${PORT}` : `pnpm dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: serverEnv,
  },
});

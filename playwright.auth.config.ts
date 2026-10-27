import { defineConfig, devices } from "@playwright/test";

/**
 * Auth end-to-end tests against a REAL Supabase project (the one in .env.local).
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY, migrations
 * applied, and a production build (`npm run build`). Test users are created through the admin API
 * (no emails are sent) and deleted afterwards. Never point this at a project with real users you care about.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // env may come from the shell instead
}

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/auth.spec.ts"],
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  use: { baseURL, trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npm run start -- -p ${PORT}`, url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});

import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, E2E_DATABASE_URL, E2E_PORT } from "./e2e/env";

const MOCK = "http://localhost:4010";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node e2e/mock-server.mjs", url: `${MOCK}/health`, reuseExistingServer: !process.env.CI, ignoreHTTPSErrors: true, timeout: 30_000 },
    {
      // Runs the production build (run `npm run build` first).
      command: `npx next start -p ${E2E_PORT}`,
      url: `${BASE_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        AUTH_SECRET: "e2e-secret",
        AUTH_URL: BASE_URL,
        AUTH_TRUST_HOST: "true",
        AUTH_GITHUB_ID: "e2e",
        AUTH_GITHUB_SECRET: "e2e",
        ANTHROPIC_API_KEY: "e2e",
        ANTHROPIC_BASE_URL: MOCK,
        ANTHROPIC_MODEL: "claude-opus-5-5",
        GITHUB_API_URL: MOCK,
        FREE_TASKS_PER_MONTH: "20",
      },
    },
  ],
});

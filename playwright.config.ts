import { defineConfig, devices } from "@playwright/test";

const frontendPort = process.env.PLAYWRIGHT_FRONTEND_PORT || "3000";
const backendPort = process.env.PLAYWRIGHT_BACKEND_PORT || "5000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${frontendPort}`;
const apiURL = process.env.PLAYWRIGHT_API_URL || `http://127.0.0.1:${backendPort}/api`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    extraHTTPHeaders: {
      "x-playwright-api-url": apiURL,
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: ".",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      cwd: "../backend",
      url: `http://127.0.0.1:${backendPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

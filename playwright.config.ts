import { defineConfig } from "@playwright/test";
const FIXTURE_PORT = "3101";
export default defineConfig({
  testDir: "./tests",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: process.env.CI ? "chromium" : "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/fixtures/siteServer.mjs",
      env: { PORT: FIXTURE_PORT },
      port: Number(FIXTURE_PORT),
      reuseExistingServer: false,
    },
    {
      command:
        "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
      // Lets the scanner reach the fixture server on loopback.
      env: { AUTOPSY_E2E: "1", AUTOPSY_SCAN_FIXTURE_PORT: FIXTURE_PORT },
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

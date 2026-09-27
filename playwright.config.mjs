import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:8173",
    ...devices["Pixel 7"],
    locale: "nb-NO",
    timezoneId: "Europe/Oslo",
    ...(process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {})
  },
  webServer: {
    command: "python3 -m http.server 8173",
    port: 8173,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "ignore"
  }
});

import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration Playwright pour les tests e2e + accessibilité.
 *
 * - Cible par défaut : http://localhost:3000 (dev local). Override possible
 *   avec PLAYWRIGHT_BASE_URL pour pointer sur un environnement de staging.
 * - Pas de webServer auto : on suppose que `bun dev` ou `bun start` tourne
 *   en parallèle, ou que la cible est distante. Évite les soucis de DB
 *   en CI quand on n'a pas Postgres.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "fr-FR",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
});

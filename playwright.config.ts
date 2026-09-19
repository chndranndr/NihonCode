import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke evaluation over the representative acceptance path that exists today:
 * the production bundle boots, the shell renders at desktop and mobile
 * viewports, and the structured startup signal is observable. Phase 1 tasks
 * 4-6 extend this suite to the drill -> persist -> review journey
 * (docs/quality.md tracks that gap).
 *
 * Isolation: the port comes from E2E_PORT (set by scripts/run-e2e.mjs from a
 * free-port derivation), so concurrent eval runs cannot collide; each test
 * gets a fresh browser context (own localStorage). reuseExistingServer is off:
 * testing a stale server from another run is worse than failing. The webServer
 * gives deterministic start and teardown (build once, kill after the run).
 */
const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // 390px is the mandated mobile width (DEVELOPMENT_PROMPT.md section 8);
      // Pixel 7's UA/touch profile with the contract's breakpoint width.
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});

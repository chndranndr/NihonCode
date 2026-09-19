import { expect, test } from "@playwright/test";

/**
 * Smoke evaluation: the representative acceptance path available at scaffold
 * stage. Proves the production bundle boots in a real browser at both target
 * viewports, renders the app shell, and emits the machine-readable startup
 * signal (structured JSON log record) that agents and CI can assert on.
 *
 * Assertions are machine-readable signals that survive the Phase 1 rewrite:
 * the structured boot record (ns "app", msg "boot", level "info", with a
 * version field), a mounted shell node, and zero console errors. No wording
 * snapshots: the eval must not go red when the scaffold shell is replaced by
 * the real dashboard.
 */

interface LogRecord {
  ts: string;
  level: string;
  ns: string;
  msg: string;
  data?: Record<string, unknown>;
}

test("app boots, renders the shell, and emits the startup signal", async ({ page }, testInfo) => {
  const bootRecords: LogRecord[] = [];
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
    const text = message.text();
    try {
      const parsed = JSON.parse(text) as LogRecord;
      if (parsed && typeof parsed.ns === "string") bootRecords.push(parsed);
    } catch {
      // not a structured record; ignore
    }
  });

  await page.goto("/");

  // The router shell mounts and the dashboard surface renders (the scaffold
  // shell was replaced by the Phase 1 app shell; identity stays stable).
  await expect(page.getByTestId("dashboard")).toBeAttached();

  // The machine-readable startup signal: one structured JSON record with
  // ns "app", msg "boot", level "info", emitted before first render.
  await expect
    .poll(() => bootRecords.some((r) => r.ns === "app" && r.msg === "boot"), { timeout: 5_000 })
    .toBe(true);
  const boot = bootRecords.find((r) => r.ns === "app" && r.msg === "boot");
  expect(boot?.level).toBe("info");
  expect(typeof boot?.ts).toBe("string");
  expect(typeof boot?.data?.version).toBe("string");

  // The ring buffer is exposed for in-page inspection and holds the record.
  const inPageLog = await page.evaluate(() => {
    const w: unknown = window;
    if (w && typeof w === "object" && "__nihonLog" in w) {
      const log = w.__nihonLog;
      return Array.isArray(log) ? log.length : 0;
    }
    return 0;
  });
  expect(inPageLog).toBeGreaterThan(0);

  expect(consoleErrors, `console errors during boot: ${consoleErrors.join(" | ")}`).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath(`boot-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

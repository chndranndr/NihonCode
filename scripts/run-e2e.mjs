// eval: run the repository's smoke evaluation (Playwright) end to end.
//
// Derives a collision-free port (first free at/above 4173), exports it as
// E2E_PORT for playwright.config.ts, and forwards to the test runner. On a
// missing browser binary, prints the remediation command (captured stdio, so
// the hint can actually fire). data/clean/ is the tracked dataset, so no
// build step is needed here.
//
//   node scripts/run-e2e.mjs [extra playwright args]

import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(repoRoot, "node_modules", "@playwright", "test", "cli.js");

if (!existsSync(cli)) {
  console.error("eval: @playwright/test is not installed. Run: npm install");
  process.exit(1);
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

async function findFreePort(base) {
  for (let port = base; port < base + 100; port++) {
    if (await portFree(port)) return port;
  }
  throw new Error(`no free port in [${base}, ${base + 100})`);
}

const port = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : await findFreePort(4173);
const extra = process.argv.slice(2);
const r = spawnSync(process.execPath, [cli, "test", ...extra], {
  cwd: repoRoot,
  stdio: ["inherit", "pipe", "pipe"],
  env: { ...process.env, E2E_PORT: String(port) },
});
process.stdout.write(r.stdout ?? Buffer.alloc(0));
process.stderr.write(r.stderr ?? Buffer.alloc(0));

if (r.status !== 0) {
  const out = `${(r.stdout ?? "").toString()}${(r.stderr ?? "").toString()}`;
  if (/Executable doesn't exist|browserType\.launch/i.test(out)) {
    console.error(
      "\neval: the Chromium browser binary is missing. Run: npx playwright install chromium",
    );
  }
}
process.exit(r.status ?? 1);

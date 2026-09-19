// serve-isolated: start the dev or preview server on a collision-free port.
//
// Concurrent agents (or several working copies) cannot share a fixed port.
// This derives the first free port at or above the base (5173 dev, 4173
// preview), starts Vite with --strictPort on it, and prints a machine-readable
// JSON ready line. Teardown is deterministic: Ctrl+C (or killing the printed
// pid) stops the server; nothing persists after exit.
//
//   node scripts/serve-isolated.mjs            # dev server
//   node scripts/serve-isolated.mjs --preview  # preview the production build
//   node scripts/serve-isolated.mjs --port 6000 # explicit base port

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const preview = argv.includes("--preview");
const portIdx = argv.indexOf("--port");
const basePort = portIdx !== -1 ? Number(argv[portIdx + 1]) : preview ? 4173 : 5173;

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

const port = await findFreePort(basePort);
const child = spawn(
  process.execPath,
  [
    join(repoRoot, "node_modules", "vite", "bin", "vite.js"),
    preview ? "preview" : "dev",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
);

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

function teardown(signal) {
  child.kill(signal);
  process.exit(0);
}
process.on("SIGINT", () => teardown("SIGINT"));
process.on("SIGTERM", () => teardown("SIGTERM"));
child.on("exit", (code) => process.exit(code ?? 0));

console.log(
  JSON.stringify({
    event: "server-starting",
    mode: preview ? "preview" : "dev",
    port,
    url: `http://127.0.0.1:${port}/`,
    pid: child.pid,
    teardown: "send SIGINT/SIGTERM to this process or Ctrl+C",
  }),
);

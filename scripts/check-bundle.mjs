// Entry bundle budget guard.
//
// Reads dist/index.html, finds the entry <script type="module" src=...>, and
// fails if that file's gzip size exceeds BUDGET_GZIP_KB. Run after `vite build`
// (the `build` script chains it). Fails loudly if the build output is missing.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// Measured post-split entry gzip size plus about 5% headroom. Raise only
// deliberately, with a docs/decisions.md entry explaining why.
const BUDGET_GZIP_KB = 142;

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const htmlPath = join(dist, "index.html");
if (!existsSync(htmlPath)) {
  console.error("check-bundle: FAIL dist/index.html missing; run `vite build` first");
  process.exit(1);
}
const html = readFileSync(htmlPath, "utf8");
const m = /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/.exec(html);
if (!m) {
  console.error('check-bundle: FAIL no entry <script type="module" src=...> in dist/index.html');
  process.exit(1);
}
const rel = m[1].replace(/^\//, "");
const file = join(dist, rel);
if (!existsSync(file)) {
  console.error(`check-bundle: FAIL entry ${rel} referenced by index.html is missing`);
  process.exit(1);
}
const buf = readFileSync(file);
const rawKb = buf.length / 1024;
const gzKb = gzipSync(buf).length / 1024;
const name = rel.split("/").pop();
if (gzKb > BUDGET_GZIP_KB) {
  console.error(
    `check-bundle: FAIL entry ${name} is ${gzKb.toFixed(1)} KB gzip, over the ${BUDGET_GZIP_KB} KB budget (${rawKb.toFixed(1)} KB raw). Split the weight out of the entry, or raise the budget with a docs/decisions.md entry.`,
  );
  process.exit(1);
}
console.log(
  `check-bundle: OK (entry ${name} ${rawKb.toFixed(1)} KB raw / ${gzKb.toFixed(1)} KB gzip, budget ${BUDGET_GZIP_KB} KB gzip)`,
);

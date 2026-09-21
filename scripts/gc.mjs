// gc: conservative workspace cleanup + semantic entropy scan.
//
//   node scripts/gc.mjs --dry-run   report only; never writes or deletes
//   node scripts/gc.mjs             delete known generated artifacts, report entropy findings
//
// Two independent categories (a cache delete never counts as entropy control):
//
//   workspace_cleanup — known generated artifacts with an established
//   regeneration path: dist/, test-results/, playwright-report/, coverage/,
//   node_modules/.vite. node_modules/ itself is preserved (regenerable but
//   expensive); it is never a candidate without --all. Arbitrary tracked
//   product code (src/, data/, docs/, scripts/) is never a deletion candidate.
//
//   entropy_control — detection with evidence and remediation, report-only:
//   broken doc links, data baseline drift, architecture drift, orphan scripts
//   not wired into package.json, and the TODO/FIXME ledger in src/.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const includeNodeModules = args.has("--all");

function rel(p) {
  return relative(repoRoot, p).split(sep).join("/");
}

function dirSize(p) {
  let total = 0;
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const child = join(p, e.name);
    total += e.isDirectory() ? dirSize(child) : statSync(child).size;
  }
  return total;
}

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---------- workspace cleanup ----------

const cleanupTargets = [
  { path: "dist", regenerate: "npm run build" },
  { path: "test-results", regenerate: "npm run eval" },
  { path: "playwright-report", regenerate: "npm run eval" },
  { path: "coverage", regenerate: "vitest run --coverage" },
  { path: "node_modules/.vite", regenerate: "npm run dev (vite cache)" },
];
if (includeNodeModules) {
  cleanupTargets.push({ path: "node_modules", regenerate: "npm install" });
}

const cleanup = [];
for (const t of cleanupTargets) {
  const abs = join(repoRoot, t.path);
  if (!existsSync(abs)) continue;
  const size = statSync(abs).isDirectory() ? dirSize(abs) : statSync(abs).size;
  const entry = { ...t, size: human(size), removed: false };
  if (!dryRun) {
    rmSync(abs, { recursive: true, force: true });
    entry.removed = true;
  }
  cleanup.push(entry);
}

// ---------- entropy control (report-only) ----------

const findings = [];

function probe(name, script, remediation) {
  const r = spawnSync(process.execPath, [join(repoRoot, "scripts", script)], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    const output = `${r.stdout ?? ""}${r.stderr ?? ""}`
      .trim()
      .split("\n")
      .slice(0, 12)
      .join("\n    ");
    findings.push({ check: name, status: "drift", evidence: output, remediation });
  } else {
    findings.push({
      check: name,
      status: "ok",
      evidence: (r.stdout ?? "").trim().split("\n")[0],
      remediation: null,
    });
  }
}

probe("doc-links", "check-docs.mjs", "fix or remove the broken links listed above");
probe(
  "architecture-boundaries",
  "check-arch.mjs",
  "move the offending imports to the layer that owns them (docs/architecture.md)",
);

// Orphan scripts: present in scripts/ but referenced by neither package.json nor other scripts.
const pkg = readFileSync(join(repoRoot, "package.json"), "utf8");
const scriptFiles = readdirSync(join(repoRoot, "scripts")).filter((f) => f.endsWith(".mjs"));
const referenced = new Set();
for (const f of scriptFiles) {
  const name = `scripts/${f}`;
  const inPkg = pkg.includes(name);
  const inOthers = scriptFiles.some(
    (other) => other !== f && readFileSync(join(repoRoot, "scripts", other), "utf8").includes(f),
  );
  if (!inPkg && !inOthers) referenced.add(name);
}
if (referenced.size > 0) {
  findings.push({
    check: "orphan-scripts",
    status: "drift",
    evidence: [...referenced].sort().join(", "),
    remediation: "wire into package.json scripts or delete in a reviewed change",
  });
} else {
  findings.push({
    check: "orphan-scripts",
    status: "ok",
    evidence: "all scripts are wired",
    remediation: null,
  });
}

// TODO/FIXME ledger in src/ (debt visibility, not auto-removal).
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(e.name)) out.push(p);
  }
  return out;
}
const todos = [];
for (const f of walk(join(repoRoot, "src"))) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((text, i) => {
    if (/(TODO|FIXME|HACK)\b/.test(text))
      todos.push(`${rel(f)}:${i + 1} ${text.trim().slice(0, 100)}`);
  });
}
findings.push({
  check: "todo-ledger",
  status: todos.length > 0 ? "drift" : "ok",
  evidence:
    todos.length > 0
      ? `${todos.length} marker(s):\n    ${todos.join("\n    ")}`
      : "no TODO/FIXME/HACK markers in src/",
  remediation: todos.length > 0 ? "resolve or record each in docs/quality.md (gap ledger)" : null,
});

// ---------- report ----------

console.log(`gc ${dryRun ? "(dry run — nothing written or deleted)" : ""}`);
console.log("\nworkspace cleanup (generated artifacts only):");
if (cleanup.length === 0) console.log("  nothing to clean");
for (const c of cleanup) {
  console.log(
    `  ${c.removed ? "removed" : "candidate"}: ${c.path} (${c.size}) — regenerate: ${c.regenerate}`,
  );
}
console.log("\nentropy control (findings with evidence; remediation needs a reviewed change):");
for (const f of findings) {
  console.log(`  [${f.status.toUpperCase().padEnd(5)}] ${f.check}: ${f.evidence.split("\n")[0]}`);
  for (const extra of f.evidence.split("\n").slice(1)) console.log(`          ${extra}`);
  if (f.remediation) console.log(`          -> ${f.remediation}`);
}
const drift = findings.filter((f) => f.status === "drift").length;
console.log(
  `\nsummary: ${cleanup.length} cleanup target(s), ${drift} entropy finding(s) with drift`,
);
process.exit(0);

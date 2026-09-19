// doctor: safe, check-only repository health report. Never writes tracked files.
//
// Order (cheapest fail-fast first):
//   1. manifest validation (schema v2 grammar, artifacts, verify resolution)
//   2. CI workflow YAML syntax (when present)
//   3. npm run check       (typecheck, lint, format:check, arch, taste, docs, data audit)
//   4. npm test            (vitest unit suite)
//   5. npm run gc -- --dry-run (cleanup + entropy scan, read-only)
//   6. npm run eval        (Playwright smoke eval; only with --with-eval)
//
// Flags:
//   --with-eval   also run the browser smoke evaluation (builds the app)
//   --json        machine-readable report on stdout
//
// Exit code: 0 when nothing failed. Skipped steps are reported, not failed.

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const withEval = args.has("--with-eval");
const asJson = args.has("--json");

const results = [];

function record(step, status, detail) {
  results.push({ step, status, detail });
}

function runStep(step, cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, {
    cwd: repoRoot,
    stdio: asJson ? "pipe" : "inherit",
    shell: process.platform === "win32",
  });
  if (r.error) {
    record(step, "blocked", String(r.error.message));
    return false;
  }
  if (r.status === 0) {
    record(step, "pass", `${cmd} ${cmdArgs.join(" ")}`.trim());
    return true;
  }
  record(
    step,
    "fail",
    `${cmd} ${cmdArgs.join(" ")}`.trim() +
      (asJson && r.stdout ? `\n${r.stdout.toString().slice(-2000)}` : ""),
  );
  return false;
}

// ---------- 1. manifest validation ----------

const INSPECTIONS = new Set([
  "inspect: project has no interactive surface",
  "inspect: adapter exposes the critical surface",
  "inspect: generated paths have regeneration evidence",
  "inspect: findings have evidence and remediation",
  "inspect: links resolve",
  "inspect: manifest matches observed artifacts",
]);
const COMMAND_SLOTS = ["setup", "dev", "format", "check", "test", "eval", "doctor", "gc"];
const STATUSES = new Set(["implemented", "partial", "deferred", "not_applicable"]);
const TOKEN_RE = /^[A-Za-z0-9_\-.:/@%+=,]+$/;
const TRANSIENT_RE = /\d{4}-\d{2}-\d{2}|[0-9a-fA-F]{16,}|[A-Za-z]:[\\/]|\/home\/|\/Users\//;

function validateManifest() {
  const manifestPath = join(repoRoot, ".harness", "manifest.json");
  if (!existsSync(manifestPath)) {
    record("manifest", "fail", ".harness/manifest.json missing");
    return null;
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    record("manifest", "fail", `manifest is not valid JSON: ${e.message}`);
    return null;
  }
  const errors = [];
  if (manifest.schema_version !== 2) errors.push("schema_version must be 2");
  if (!["lite", "standard", "full"].includes(manifest.profile))
    errors.push(`profile invalid: ${manifest.profile}`);
  if (!manifest.project?.kind) errors.push("project.kind missing");
  const stacks = manifest.project?.stacks;
  if (
    !Array.isArray(stacks) ||
    stacks.some((s) => typeof s !== "string") ||
    [...stacks].sort().join() !== stacks.join()
  ) {
    errors.push("project.stacks must be a sorted string array");
  }

  const commandKeys = Object.keys(manifest.commands ?? {});
  if (commandKeys.join(",") !== COMMAND_SLOTS.join(",")) {
    errors.push(`commands slots must be exactly [${COMMAND_SLOTS.join(", ")}] in order`);
  }
  const commandValues = new Set(
    Object.values(manifest.commands ?? {}).filter((v) => typeof v === "string"),
  );

  const isRelPath = (p) =>
    typeof p === "string" &&
    p.length > 0 &&
    !p.includes("\\") &&
    !p.startsWith("/") &&
    !/(^|\/)\.\.(\/|$)/.test(p);

  for (const [name, cap] of Object.entries(manifest.capabilities ?? {})) {
    if (!STATUSES.has(cap.status)) errors.push(`${name}: status invalid (${cap.status})`);
    if (!Array.isArray(cap.artifacts) || !cap.artifacts.every(isRelPath)) {
      errors.push(`${name}: artifacts must be repository-relative forward-slash paths`);
    }
    if (cap.verify !== undefined) {
      if (
        !Array.isArray(cap.verify) ||
        cap.verify.length === 0 ||
        cap.verify.some((v) => typeof v !== "string" || v.length === 0)
      ) {
        errors.push(`${name}: verify must be a non-empty string array when present`);
        continue;
      }
      for (const entry of cap.verify) {
        if (TRANSIENT_RE.test(entry)) {
          errors.push(`${name}: verify entry contains transient/machine-specific data: "${entry}"`);
        } else if (entry.startsWith("inspect: ")) {
          if (!INSPECTIONS.has(entry)) errors.push(`${name}: unsupported inspection: "${entry}"`);
        } else {
          const tokens = entry.split(" ");
          if (tokens.some((t) => !TOKEN_RE.test(t))) {
            errors.push(`${name}: malformed command entry: "${entry}"`);
          } else if (!commandValues.has(entry)) {
            errors.push(
              `${name}: verify command does not resolve through commands map: "${entry}"`,
            );
          }
        }
      }
    }
  }

  const capabilityStatus = Object.fromEntries(
    Object.entries(manifest.capabilities ?? {}).map(([k, v]) => [k, v.status]),
  );
  for (const d of manifest.deferred ?? []) {
    const keys = Object.keys(d).sort().join(",");
    if (keys !== "capability,next_step,reason")
      errors.push(`deferred item keys must be exactly capability,reason,next_step (got ${keys})`);
    if (!["partial", "deferred"].includes(capabilityStatus[d.capability])) {
      errors.push(
        `deferred item "${d.capability}" must correspond to a partial/deferred capability`,
      );
    }
  }
  for (const g of manifest.evidence_gaps ?? []) {
    const keys = Object.keys(g).sort().join(",");
    if (keys !== "artifacts,next_step,reason,source_capability") {
      errors.push(
        `evidence_gaps item keys must be exactly source_capability,artifacts,reason,next_step (got ${keys})`,
      );
    }
  }
  const managed = manifest.managed_artifacts ?? [];
  if (
    !Array.isArray(managed) ||
    !managed.every(isRelPath) ||
    [...managed].sort().join() !== managed.join()
  ) {
    errors.push("managed_artifacts must be a sorted array of repository-relative paths");
  }

  // Artifacts claimed by the manifest must exist on disk.
  const missing = [];
  for (const a of managed) if (!existsSync(join(repoRoot, a))) missing.push(a);
  for (const cap of Object.values(manifest.capabilities ?? {})) {
    for (const a of cap.artifacts ?? []) if (!existsSync(join(repoRoot, a))) missing.push(a);
  }
  if (missing.length > 0)
    errors.push(`manifest artifacts missing on disk: ${[...new Set(missing)].join(", ")}`);

  if (errors.length > 0) {
    record("manifest", "fail", errors.join("\n  "));
    return null;
  }
  record("manifest", "pass", "schema v2 valid; artifacts exist; verify entries resolve");
  return manifest;
}

const manifest = validateManifest();

// ---------- 2. CI YAML syntax ----------

const ciPath = join(repoRoot, ".github", "workflows", "ci.yml");
if (existsSync(ciPath)) {
  try {
    const doc = yaml.load(readFileSync(ciPath, "utf8"));
    if (!doc || typeof doc !== "object" || !("jobs" in doc)) throw new Error("no jobs key");
    record("ci-yaml", "pass", ".github/workflows/ci.yml parses; jobs present");
  } catch (e) {
    record("ci-yaml", "fail", `ci.yml invalid YAML: ${e.message}`);
  }
} else {
  record("ci-yaml", "skipped", "no CI workflow present");
}

// ---------- 3-6. executable checks ----------

if (manifest) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  runStep("check", npm, ["run", "check"]);
  runStep("test", npm, ["test"]);
  runStep("gc-dry-run", npm, ["run", "gc", "--", "--dry-run"]);
  if (withEval) runStep("eval", npm, ["run", "eval"]);
  else record("eval", "skipped", "pass --with-eval to run the browser smoke evaluation");
} else {
  for (const step of ["check", "test", "gc-dry-run", withEval ? "eval" : null].filter(Boolean)) {
    record(
      step,
      "blocked",
      "manifest validation failed; fix the manifest before running project checks",
    );
  }
}

// ---------- report ----------

const failed = results.filter((r) => r.status === "fail").length;
const blocked = results.filter((r) => r.status === "blocked").length;

if (asJson) {
  console.log(JSON.stringify({ results, failed, blocked }, null, 2));
} else {
  console.log("\ndoctor report:");
  for (const r of results) {
    console.log(`  [${r.status.toUpperCase().padEnd(7)}] ${r.step}: ${r.detail.split("\n")[0]}`);
    for (const extra of r.detail.split("\n").slice(1)) console.log(`            ${extra}`);
  }
  console.log(
    `\n  ${results.length} steps: ${results.filter((r) => r.status === "pass").length} pass, ${failed} fail, ${blocked} blocked, ${results.filter((r) => r.status === "skipped").length} skipped`,
  );
}
process.exit(failed + blocked > 0 ? 1 : 0);

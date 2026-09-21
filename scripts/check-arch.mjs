// Architecture boundary check for src/ (implementation_plan.md "Boundaries",
// DEVELOPMENT_PROMPT.md section 3).
//
// Layer matrix (binding): app, features, domain, content, storage, components,
// observability. Any other top-level directory under src/ is a violation
// (default-deny): silence must never read as compliance.
//
// Enforced rules (import specifiers are resolved to repository paths, so the
// rules are depth-independent — ../, ../../, and deeper all classify alike):
//   1. data-gate: no src/ file may import raw data/generated or data/jlpt
//      (frozen evidence), and only src/content/ may import data/clean
//      (the app's single source of truth; docs/architecture.md rule 1).
//   2. domain purity: no React, no DOM/BOM globals, no imports from
//      app/, features/, components/, or storage/.
//   3. content purity: no React, no imports from app/, features/, components/.
//   4. feature isolation: features/<a> never imports features/<b>.
//   5. observability seam: imports nothing from app/, features/, components/,
//      storage/, domain/, content/ (it is a leaf every layer may use).
//   6. unknown layer: a file under src/<dir>/ where <dir> is not in the matrix.
//
// Exits nonzero with per-violation file:line evidence. Fails when it scans zero
// source files (a vacuous pass is a failure, not an OK).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, sep, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(repoRoot, "src");
const LAYERS = new Set([
  "app",
  "features",
  "domain",
  "content",
  "storage",
  "components",
  "observability",
]);
const UI_LAYERS = ["app", "features", "components"];

function listFiles(dir) {
  let out;
  try {
    out = readdirSync(dir);
  } catch {
    return [];
  }
  const files = [];
  for (const name of out) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) files.push(...listFiles(p));
    else if (/\.(ts|tsx|mts|cts)$/.test(name)) files.push(p);
  }
  return files;
}

function extractSpecifiers(source) {
  const specs = [];
  const re =
    /(?:^|\n)\s*(?:import|export)\s+(?:[^;'"]*?\sfrom\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const spec = m[1] ?? m[2];
    const line = source.slice(0, m.index).split("\n").length;
    specs.push({ spec, line });
  }
  return specs;
}

const violations = [];
function rel(file) {
  return relative(repoRoot, file).split(sep).join("/");
}
function add(file, line, rule, detail) {
  violations.push(`${rel(file)}:${line} [${rule}] ${detail}`);
}

/** Classify a resolved repository-relative path into layer / data access. */
function classify(absPath) {
  const r = relative(repoRoot, absPath).split(sep).join("/");
  if (r.startsWith("data/generated/") || r.startsWith("data/jlpt/")) return { kind: "raw-data" };
  if (r.startsWith("data/clean/")) return { kind: "clean-data" };
  if (!r.startsWith("src/")) return { kind: "external" };
  const segs = r.split("/");
  // Composition-root files directly under src/ (main.tsx): not a layer.
  if (segs.length === 2) return { kind: "root" };
  const layer = segs[1];
  if (!LAYERS.has(layer)) return { kind: "unknown-layer", layer };
  if (layer === "features") return { kind: "feature", feature: segs[2] };
  return { kind: "layer", layer };
}

const files = listFiles(srcRoot);
if (files.length === 0) {
  console.error("check-arch: scanned zero source files under src/ — refusing to report OK");
  process.exit(1);
}

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const own = classify(file);
  const ownLayer =
    own.kind === "feature" ? "features" : own.kind === "layer" ? own.layer : own.kind;
  const ownFeature = own.kind === "feature" ? own.feature : undefined;

  // Rule 6: unknown layer (root composition files are exempt).
  if (own.kind === "unknown-layer") {
    add(
      file,
      1,
      "unknown-layer",
      `src/${own.layer}/ is not in the layer matrix (docs/architecture.md); add it to the matrix and check-arch before using it`,
    );
  }

  for (const { spec, line } of extractSpecifiers(source)) {
    if (!spec.startsWith(".")) continue; // bare/alias imports are external
    const target = classify(resolve(dirname(file), spec));

    if (target.kind === "raw-data") {
      add(file, line, "data-gate", `imports raw dataset "${spec}"; the app reads data/clean only`);
    }
    if (target.kind === "clean-data" && ownLayer !== "content") {
      add(
        file,
        line,
        "data-gate",
        `imports clean dataset "${spec}"; only src/content/ may (docs/architecture.md rule 1)`,
      );
    }
    if (target.kind === "unknown-layer") {
      add(
        file,
        line,
        "unknown-layer",
        `imports src/${target.layer}/ which is not in the layer matrix`,
      );
    }
    if (target.kind === "feature" && ownLayer === "features" && target.feature !== ownFeature) {
      add(
        file,
        line,
        "feature-isolation",
        `features/${ownFeature} imports features/${target.feature}; share via components/ or domain/`,
      );
    }
    if (ownLayer === "domain") {
      if (/^react(-dom)?$|^react\//.test(spec))
        add(file, line, "domain-pure", `domain imports React ("${spec}")`);
      if (target.kind === "layer" && UI_LAYERS.concat("storage").includes(target.layer)) {
        add(file, line, "domain-pure", `domain imports ${target.layer}/ ("${spec}")`);
      }
    }
    if (ownLayer === "content") {
      if (/^react(-dom)?$|^react\//.test(spec))
        add(file, line, "content-pure", `content imports React ("${spec}")`);
      if (target.kind === "layer" && UI_LAYERS.includes(target.layer)) {
        add(file, line, "content-pure", `content imports ${target.layer}/ ("${spec}")`);
      }
    }
    if (
      ownLayer === "observability" &&
      ((target.kind === "layer" && target.layer !== "observability") ||
        target.kind === "feature" ||
        target.kind === "unknown-layer" ||
        target.kind === "raw-data")
    ) {
      add(
        file,
        line,
        "observability-leaf",
        `observability imports ${spec}; the seam must stay dependency-free`,
      );
    }
  }

  // Rule 2 (DOM): domain/ must not touch DOM/BOM globals.
  if (ownLayer === "domain") {
    const domRe = /(^|[^\w.$])(document|window|localStorage|indexedDB|navigator)\s*[.([]/;
    source.split("\n").forEach((text, i) => {
      if (domRe.test(text) && !text.trimStart().startsWith("//")) {
        add(
          file,
          i + 1,
          "domain-pure",
          `domain references DOM/BOM global in: ${text.trim().slice(0, 80)}`,
        );
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`check-arch: ${violations.length} boundary violation(s):`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    "\nRemediation: move the logic to the layer that owns it (docs/architecture.md). " +
      "Raw dataset reads belong in src/content/ behind the validation gate.",
  );
  process.exit(1);
}
console.log(`check-arch: OK (${files.length} source files, 6 rules over ${LAYERS.size} layers)`);

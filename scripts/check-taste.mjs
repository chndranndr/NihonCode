// Taste invariants for src/ (DEVELOPMENT_PROMPT.md section 4, binding design contract).
//
// Mechanical rules:
//   1. no-inline-style: no JSX style={{...}} — theming via CSS variables/Modules.
//   2. no-hardcoded-color: no literal colors in CSS outside :root declarations.
//   3. no-glass: no backdrop-filter.
//   4. no-rounded-shells: border-radius > 4px in any unit (px direct, rem/em
//      normalized at 16px/root font size, % flagged above 2%).
//   5. no-gradient-fills: gradients banned except on the :root/body ground
//      selector (selector-aware, tracked across brace depth).
//   6. contract-leak: direction-contract markers (THESIS:/OWN-WORLD:/STORY:/
//      FIRST VIEWPORT:/FORM:) must never appear in shipped source — scanned on
//      the RAW file text, including comments, because DEVELOPMENT_PROMPT.md
//      section 2 bans them in "no code comments" too.
//
// Contextual rules live in docs/design-system.md (finish review).
// Fails when it scans zero source files (a vacuous pass is a failure).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(repoRoot, "src");
const violations = [];

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
    else files.push(p);
  }
  return files;
}

function rel(file) {
  return relative(repoRoot, file).split(sep).join("/");
}

const contractMarkers = ["THESIS:", "OWN-WORLD:", "STORY:", "FIRST VIEWPORT:", "FORM:"];

/** Convert a CSS length to px; returns null for units we cannot normalize. */
function toPx(value, unit) {
  const n = Number(value);
  if (unit === "px") return n;
  if (unit === "rem" || unit === "em") return n * 16;
  return null;
}

const files = listFiles(srcRoot);
if (files.length === 0) {
  console.error("check-taste: scanned zero files under src/ — refusing to report OK");
  process.exit(1);
}

for (const file of files) {
  const r = rel(file);
  const source = readFileSync(file, "utf8");

  // Rule 6 on raw text: comments included, per DEVELOPMENT_PROMPT.md section 2.
  source.split("\n").forEach((text, i) => {
    for (const marker of contractMarkers) {
      if (text.includes(marker)) {
        violations.push(
          `${r}:${i + 1} [contract-leak] direction-contract marker "${marker}" in source (comments included)`,
        );
      }
    }
  });

  source.split("\n").forEach((text, i) => {
    const lineNo = i + 1;
    const trimmed = text.trim();
    const isComment =
      trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");

    if (!isComment && /\.tsx?$/.test(r) && /style=\{\{/.test(text)) {
      violations.push(
        `${r}:${lineNo} [no-inline-style] JSX inline style object; use a CSS Module class`,
      );
    }

    if (/\.css$/.test(r) && !isComment) {
      if (/backdrop-filter/.test(text)) {
        violations.push(
          `${r}:${lineNo} [no-glass] backdrop-filter is banned (design contract: no glass)`,
        );
      }
      const radius = text.match(/border-radius:\s*([\d.]+)(px|rem|em|%)/);
      if (radius) {
        const px = radius[4] === "%" ? null : toPx(radius[1], radius[4]);
        const pct = radius[4] === "%" ? Number(radius[1]) : null;
        if ((px !== null && px > 4) || (pct !== null && pct > 2)) {
          violations.push(
            `${r}:${lineNo} [no-rounded-shells] border-radius ${radius[1]}${radius[4]} exceeds the 4px hairline grammar`,
          );
        }
      }
    }
  });

  // Rules 2 + 5 with selector tracking across brace depth.
  if (/\.css$/.test(r)) {
    let selector = "";
    let depth = 0;
    let inRoot = false;
    source.split("\n").forEach((text, i) => {
      const lineNo = i + 1;
      const trimmed = text.trim();
      if (trimmed.startsWith("/*") || trimmed.startsWith("*")) return;
      // Track the current selector: text before an opening brace at depth 0.
      const braceIdx = text.indexOf("{");
      if (braceIdx !== -1 && depth === 0) selector = text.slice(0, braceIdx).trim();
      depth += (text.match(/\{/g) || []).length - (text.match(/\}/g) || []).length;
      if (depth <= 0) depth = 0;
      inRoot = depth > 0 && /:root\b/.test(selector);
      const groundSelector = /^(:root|body|html)/.test(selector);

      if (!inRoot && !trimmed.startsWith("/*")) {
        const colorRe = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;
        if (colorRe.test(text) && !/var\(--/.test(text)) {
          violations.push(
            `${r}:${lineNo} [no-hardcoded-color] literal color outside :root; declare a --variable and consume it`,
          );
        }
      }
      if (/linear-gradient|radial-gradient/.test(text) && !groundSelector && !inRoot) {
        violations.push(
          `${r}:${lineNo} [no-gradient-fills] gradient fill on selector "${selector}" (only :root/body ground may)`,
        );
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`check-taste: ${violations.length} taste violation(s):`);
  for (const v of violations) console.error(`  ${v}`);
  console.error("\nRemediation: see docs/design-system.md for the binding design grammar.");
  process.exit(1);
}
console.log(`check-taste: OK (${files.length} files scanned, 6 mechanical rules over src/)`);

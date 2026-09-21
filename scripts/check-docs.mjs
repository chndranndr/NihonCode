// Documentation link checker.
//
// Scans the Kuskus-managed doc surface (AGENTS.md, README.md, docs/) for
// markdown links and verifies every relative link target exists, and every
// anchor points at a heading in the target file. Absolute http(s) links are
// syntax-checked only (no network). Exits nonzero with per-link evidence on failure.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, statSync } from "node:fs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [join(repoRoot, "AGENTS.md"), join(repoRoot, "README.md")];

const docsDir = join(repoRoot, "docs");
if (existsSync(docsDir)) {
  for (const name of readdirSync(docsDir)) {
    const p = join(docsDir, name);
    if (statSync(p).isFile() && /\.md$/.test(name)) targets.push(p);
  }
}

function rel(file) {
  return relative(repoRoot, file).split(sep).join("/");
}

function slugify(heading) {
  // GitHub anchor rule: lowercase, keep letters/numbers/underscores/hyphens,
  // drop other punctuation, spaces to hyphens.
  return heading
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

const problems = [];
const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;

for (const file of targets) {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");
  lines.forEach((text, i) => {
    let m;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(text)) !== null) {
      const raw = m[1];
      const lineNo = i + 1;
      if (/^https?:\/\//.test(raw)) {
        try {
          new URL(raw);
        } catch {
          problems.push(`${rel(file)}:${lineNo} malformed URL "${raw}"`);
        }
        continue;
      }
      if (/^(mailto:|skill:|local:|artifact:)/.test(raw)) continue;
      const [pathPart, anchor] = raw.split("#");
      const abs = pathPart ? resolve(dirname(file), decodeURIComponent(pathPart)) : file;
      if (!existsSync(abs)) {
        problems.push(`${rel(file)}:${lineNo} broken link target "${raw}"`);
        continue;
      }
      if (anchor && /\.md$/i.test(abs)) {
        const targetSource = readFileSync(abs, "utf8");
        const headings = [...targetSource.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => slugify(h[1]));
        if (!headings.includes(anchor.toLowerCase())) {
          problems.push(
            `${rel(file)}:${lineNo} broken anchor "${raw}" (no such heading in ${rel(abs)})`,
          );
        }
      }
    }
  });
}

if (problems.length > 0) {
  console.error(`check-docs: ${problems.length} broken link(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`check-docs: OK (${targets.length} doc files scanned)`);

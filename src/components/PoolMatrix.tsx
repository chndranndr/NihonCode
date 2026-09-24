/**
 * Practice-setup pool matrix (PRD 10.6, redesign 2026-09-22): the eligible
 * items of the session builder's pool as a browsable table, from the SAME
 * items array the builder slices. Search and pagination filter this view
 * only; the session pool is the full list (stated in the setup note). No
 * on/kunyomi is invented for vocabulary: kanji rows split the recorded
 * reading by script (katakana = on'yomi), vocab rows show the word reading.
 */

import { useState } from "react";
import type { SessionItem } from "./DrillSession";

const PAGE_SIZE = 6;

function scriptSplit(reading: string): { on: string; kun: string } {
  const on: string[] = [];
  const kun: string[] = [];
  for (const segment of reading.split("/")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    if (/^[\u30A0-\u30FF・]+$/.test(trimmed)) on.push(trimmed);
    else kun.push(trimmed);
  }
  return { on: on.join("、"), kun: kun.join("、") };
}

function matrixRows(mode: string, items: SessionItem[]): { heads: string[]; rows: string[][] } {
  switch (mode) {
    case "kana":
      return {
        heads: ["Character", "Romaji"],
        rows: items.map((i) => [i.prompt, i.accepted[0] ?? ""]),
      };
    case "kanji":
      return {
        heads: ["Kanji", "On'yomi", "Kun'yomi", "Meaning"],
        rows: items.map((i) => {
          const { on, kun } = scriptSplit(i.reveal.scripts[1] ?? "");
          return [i.prompt, on || "—", kun || "—", i.reveal.meaning];
        }),
      };
    case "vocab":
      return {
        heads: ["Word", "Reading", "Romaji", "Meaning"],
        rows: items.map((i) => [
          i.prompt,
          i.reveal.scripts[1] ?? "",
          i.accepted[0] ?? "",
          i.reveal.meaning,
        ]),
      };
    case "numbers":
      return {
        heads: ["Japanese", "Answer"],
        rows: items.map((i) => [i.reveal.scripts[0] ?? i.prompt, i.accepted[0] ?? ""]),
      };
    case "dates":
      return {
        heads: ["Japanese", "Answer"],
        rows: items.map((i) => [i.reveal.scripts[0] ?? i.prompt, i.accepted[0] ?? ""]),
      };
    case "conjugation":
      return {
        heads: ["Base word", "Meaning", "Target form", "Example", "Romaji"],
        rows: items.map((i) => [
          i.prompt,
          i.reveal.meaning,
          i.subprompt?.split("·")[0]?.trim() ?? "",
          i.reveal.scripts[0] ?? "",
          i.reveal.romaji ?? i.accepted[0] ?? "",
        ]),
      };
    default:
      return { heads: [], rows: [] };
  }
}

const MODE_NOTE: Record<string, string> = {
  kana: "Hiragana and katakana both appear in this pool.",
  kanji: "The session accepts any of the displayed kana readings.",
  vocab: "Vocabulary uses word readings. On'yomi and kun'yomi belong to individual kanji.",
  numbers: "Examples from the configured range; the session is rebuilt when you start.",
  dates: "Examples from the configured mode; the session is rebuilt when you start.",
  conjugation: "Examples update when you change the target forms or classes.",
};

export function PoolMatrix({ mode, items }: { mode: string; items: SessionItem[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const { heads, rows } = matrixRows(mode, items);
  const filtered = query
    ? rows.filter((r) => r.join(" ").toLowerCase().includes(query.toLowerCase()))
    : rows;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  return (
    <div className="pool-matrix" data-testid="pool-matrix">
      <div className="table-head">
        <div>
          <h2>Available items</h2>
          <p className="sample-note">
            {items.length} eligible items · {MODE_NOTE[mode] ?? ""}
          </p>
        </div>
        <input
          type="search"
          aria-label="Search available items"
          placeholder="Search character, reading or meaning…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {heads.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length ? (
              slice.map((r, i) => (
                <tr key={`${current}-${i}`}>
                  {r.map((cell, j) => (
                    <td key={j} className={j === 0 ? "char" : ""} lang={j === 0 ? "ja" : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={heads.length || 1} className="empty">
                  No matching items. Try another reading or meaning.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <span>
          {filtered.length
            ? `Showing ${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`
            : "0 items"}
        </span>
        <div className="actions">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>
            ← Previous
          </button>
          <button
            type="button"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next →
          </button>
        </div>
      </div>
      <p className="sample-note">
        Search and pagination filter this view; they do not change your session pool.
      </p>
    </div>
  );
}

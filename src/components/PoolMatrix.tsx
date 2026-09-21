import { useState } from "react";
import type { SessionItem } from "./DrillSession";

/**
 * Practice-setup pool matrix (PRD 10.6 owner addition 2026-09-21): every
 * drill setup shows the eligible items of its pool as a count plus a
 * browsable list, from the same pool the builder slices. The conjugation
 * preview (PRD 10.9) reuses it.
 */
export function PoolMatrix({ items }: { items: SessionItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pool-matrix" data-testid="pool-matrix">
      <button
        type="button"
        className="pool-matrix-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? "HIDE" : "SHOW"} ELIGIBLE ITEMS ({items.length})
      </button>
      {open && (
        <ul className="pool-matrix-list">
          {items.map((item, i) => (
            <li key={`${item.id}:${i}`}>
              <span lang="ja">{item.prompt}</span>
              <span className="matrix-tag">{item.subprompt ?? item.accepted[0]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

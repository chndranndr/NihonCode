/**
 * Content sources ledger (about brief): license and clearance status per
 * dataset origin. Statuses are data, not prose — Phase 2.7 clearance updates
 * flip these rows without a redesign (DEVELOPMENT_PROMPT task 8 acceptance).
 */

export type ClearanceStatus = "licensed" | "pending" | "blocked";

export interface ContentSource {
  name: string;
  origin: string;
  license: string;
  clearance: ClearanceStatus;
  note: string;
}

export const CONTENT_SOURCES: readonly ContentSource[] = [
  {
    name: "Grammar lists",
    origin: "amgidex",
    license: "unspecified",
    clearance: "pending",
    note: "Redistribution rights unconfirmed; blocks public release (Phase 2.7).",
  },
  {
    name: "Example sentences",
    origin: "Tatoeba",
    license: "CC BY 2.0 FR",
    clearance: "licensed",
    note: "Attribution required in About; text bundled locally.",
  },
  {
    name: "JLPT exercises + audio",
    origin: "japanesetest4you",
    license: "unspecified",
    clearance: "pending",
    note: "Scraped sets; audio aliasing unresolved (Phase 2.5).",
  },
] as const;

export const CONTACT_PLACEHOLDER = "hello@NihonCode.app";
export const APP_VERSION = "0.1.0";

/**
 * Structured JSON-lines logger. The observability seam for the app: every
 * subsystem logs through a namespaced logger; records are single-line JSON on
 * the console (agent-readable) and kept in a bounded ring buffer exposed on
 * `window.__nihonLog` for browser-side inspection and e2e capture.
 *
 * No dependencies, no network. Levels: debug < info < warn < error. The ring
 * always records; the console emits only records at or above the minimum
 * level (raised to "info" in production builds by main.tsx).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  ts: string;
  level: LogLevel;
  ns: string;
  msg: string;
  data?: Record<string, unknown>;
}

const RING_CAP = 500;
const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const ring: LogRecord[] = [];
let minLevel: LogLevel = "debug";

declare global {
  interface Window {
    __nihonLog?: LogRecord[];
  }
}

if (typeof window !== "undefined") {
  window.__nihonLog = ring;
}

export function setMinLevel(level: LogLevel): void {
  minLevel = level;
}

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

export function createLogger(ns: string): Logger {
  function emit(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    const record: LogRecord = { ts: new Date().toISOString(), level, ns, msg };
    if (data !== undefined) record.data = data;
    ring.push(record);
    if (ring.length > RING_CAP) ring.shift();
    if (LEVEL_RANK[level] >= LEVEL_RANK[minLevel]) {
      // Single-line JSON so console output is machine-parseable.
      console.log(JSON.stringify(record));
    }
  }
  return {
    debug: (msg, data) => emit("debug", msg, data),
    info: (msg, data) => emit("info", msg, data),
    warn: (msg, data) => emit("warn", msg, data),
    error: (msg, data) => emit("error", msg, data),
  };
}

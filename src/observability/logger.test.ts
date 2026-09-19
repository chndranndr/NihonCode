import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger, drainLog, getMinLevel, peekLog, setMinLevel } from "./logger";

afterEach(() => {
  drainLog();
  setMinLevel("debug");
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("records single-line JSON with ts, level, ns, msg", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    createLogger("test").info("hello", { a: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0][0]);
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed).toMatchObject({ level: "info", ns: "test", msg: "hello", data: { a: 1 } });
    expect(typeof parsed.ts).toBe("string");
  });

  it("buffers below the minimum level without emitting to console", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    setMinLevel("warn");
    createLogger("test").info("quiet");
    createLogger("test").warn("loud");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(peekLog().map((r) => r.msg)).toEqual(["quiet", "loud"]);
    expect(getMinLevel()).toBe("warn");
  });

  it("bounds the ring buffer, dropping oldest records", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const log = createLogger("ring");
    for (let i = 0; i < 600; i++) log.debug(`m${i}`);
    const all = peekLog();
    expect(all).toHaveLength(500);
    expect(all[0].msg).toBe("m100");
    expect(all[499].msg).toBe("m599");
  });

  it("drain empties the buffer and returns records in order", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    createLogger("d").info("one");
    createLogger("d").info("two");
    const drained = drainLog();
    expect(drained.map((r) => r.msg)).toEqual(["one", "two"]);
    expect(peekLog()).toHaveLength(0);
  });
});

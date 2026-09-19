import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DrillSession, type SessionItem, type SessionResult } from "../../components/DrillSession";
import { usePools } from "../../components/pools";
import { makeNumberQuestionInRange } from "../../domain/numbers";
import { makeFullDate, WEEKDAYS } from "../../domain/dates";
import { perfectDrillBonus, XP } from "../../domain/progress";
import { awardXp, recordAttempt, type AttemptKind } from "../../storage/progressRepo";
import { currentPrefs } from "../../storage/progressRepo";
import type { JlptLevel } from "../../content/ids";

const LIMITS = [10, 20, 50] as const;

const DRILL_KINDS: readonly AttemptKind[] = ["kana", "kanji", "vocab", "numbers", "dates"];

function drillKind(mode: string): AttemptKind | null {
  return DRILL_KINDS.find((k) => k === mode) ?? null;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface DrillOptions {
  direction: "jp2num" | "num2jp" | "jp2en" | "en2jp";
  dateMode: "weekdays" | "full";
  yearMin: number;
  yearMax: number;
  rangeMin: number;
  rangeMax: number;
}

export const DEFAULT_OPTIONS: DrillOptions = {
  direction: "jp2num",
  dateMode: "weekdays",
  yearMin: 2020,
  yearMax: 2030,
  rangeMin: 1,
  rangeMax: 999_999,
};

const NUMBER_PRESETS = [
  { label: "1-99", min: 1, max: 99 },
  { label: "1-999", min: 1, max: 999 },
  { label: "1-999999", min: 1, max: 999_999 },
] as const;

/**
 * Generated pools cover the maximum count the setup offers (LIMITS tops at 50);
 * the limit control slices from here, so every offered count is real.
 */
const GENERATED_COUNT = 50;

function buildItems(
  mode: string,
  level: JlptLevel,
  pools: ReturnType<typeof usePools>,
  options: DrillOptions,
): SessionItem[] {
  if (!pools) return [];
  switch (mode) {
    case "kana":
      return shuffle(pools.kana).map((k) => ({
        id: k.id,
        prompt: k.char,
        accepted: [k.romaji],
        reveal: { scripts: [k.char], meaning: k.romaji, group: k.table },
        speakText: k.char,
      }));
    case "kanji":
      return shuffle(pools.kanji).map((k) => ({
        id: k.id,
        prompt: k.char,
        accepted: k.answers,
        reveal: { scripts: [k.char, k.reading], meaning: k.meaning, group: `kanji ${level}` },
        speakText: k.char,
      }));
    case "vocab":
      return shuffle(pools.vocab).map((v) => ({
        id: v.id,
        prompt: v.kanji,
        accepted: [v.romaji],
        reveal: { scripts: [v.kanji, v.kana], meaning: v.meaning, group: `vocab ${level}` },
        speakText: v.kana,
      }));
    case "numbers": {
      // PRD 10.7: Japanese -> Number answers numerically; Number -> Japanese
      // answers in romaji.
      const jp2num = options.direction === "jp2num";
      return Array.from({ length: GENERATED_COUNT }, () => {
        const q = makeNumberQuestionInRange(options.rangeMin, options.rangeMax);
        return jp2num
          ? {
              id: `numbers:${q.value}`,
              prompt: q.japanese,
              accepted: [String(q.value)],
              reveal: { scripts: [q.japanese], meaning: String(q.value), group: "numbers" },
              speakText: q.japanese,
            }
          : {
              id: `numbers:${q.value}`,
              prompt: String(q.value),
              accepted: [q.romaji],
              reveal: { scripts: [q.japanese], meaning: q.romaji, group: "numbers" },
              speakText: q.japanese,
            };
      });
    }
    case "dates": {
      // PRD 10.8: two distinct modes. Day-of-week mode always the 7 weekday
      // items; full date mode is full dates only, honoring the year range and
      // the user-chosen count (generated to GENERATED_COUNT, limit slices).
      const jp2en = options.direction === "jp2en";
      if (options.dateMode === "weekdays") {
        return WEEKDAYS.map((w) => ({
          id: `dates:weekday:${w.jp}`,
          prompt: jp2en ? w.jp : w.en,
          accepted: [jp2en ? w.en : w.jp],
          reveal: { scripts: [w.jp], meaning: w.en, group: "weekdays" },
          speakText: w.jp,
        }));
      }
      return Array.from({ length: GENERATED_COUNT }, () => {
        const d = makeFullDate(options.yearMin, options.yearMax);
        return {
          id: `dates:full:${d.year}-${d.month}-${d.day}`,
          prompt: jp2en ? d.japanese : d.english,
          accepted: [jp2en ? d.english : d.japanese],
          reveal: { scripts: [d.japanese], meaning: d.english, group: "full dates" },
          speakText: d.japanese,
        };
      });
    }
    default:
      return [];
  }
}

export function DrillPage() {
  const { mode = "kana" } = useParams();
  const navigate = useNavigate();
  const prefs = currentPrefs();
  const pools = usePools(prefs.level);
  const [limit, setLimit] = useState<number | "all">(10);
  const [options, setOptions] = useState<DrillOptions>(DEFAULT_OPTIONS);
  const [session, setSession] = useState<SessionItem[] | null>(null);
  const [summary, setSummary] = useState<SessionResult | null>(null);

  const all = useMemo(
    () => buildItems(mode, prefs.level, pools, options),
    [mode, pools, prefs.level, options],
  );
  const selectable = all;

  function start(): void {
    // Generated modes rebuild their pool per start so a retry reshuffles into
    // fresh questions, not the same 50 (PRD 10.6 retry-reshuffled).
    const pool =
      mode === "numbers" || mode === "dates"
        ? buildItems(mode, prefs.level, pools, options)
        : selectable;
    const picked = limit === "all" ? pool : pool.slice(0, limit);
    setSession(shuffle(picked));
    setSummary(null);
  }

  async function finish(result: SessionResult): Promise<void> {
    const kind = drillKind(mode);
    if (!kind) return;
    for (const record of result.records) {
      await recordAttempt(record.id, kind, record.correct);
    }
    const xp = result.correct * XP.drillCorrect + perfectDrillBonus(result.correct, result.total);
    awardXp(xp);
    setSummary({ ...result });
    setSession(null);
  }

  if (summary) {
    const pct = summary.total === 0 ? 0 : Math.round((summary.correct / summary.total) * 100);
    return (
      <div className="session" data-testid="summary">
        <h2 className="micro-label">SESSION COMPLETE</h2>
        <p className="summary-score" data-testid="summary-score">
          {pct}%
        </p>
        <p className="micro-label">
          {summary.correct}/{summary.total} CORRECT
        </p>
        {summary.misses.length > 0 && (
          <ul className="miss-list">
            {summary.misses.map((m) => (
              <li key={m.id} lang="ja">
                {m.prompt} → {m.accepted.join(" / ")}
              </li>
            ))}
          </ul>
        )}
        <div className="summary-actions">
          <button type="button" className="primary" onClick={start}>
            RETRY (RESHUFFLED)
          </button>
          <button type="button" onClick={() => navigate("/learn")}>
            BACK
          </button>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <DrillSession
        title={mode.toUpperCase()}
        items={session}
        onFinish={(r) => void finish(r)}
        onAbort={() => {
          setSession(null);
          navigate("/learn");
        }}
      />
    );
  }

  return (
    <div className="setup" data-testid="drill-setup">
      <h2 className="micro-label">{mode.toUpperCase()} SETUP</h2>
      <p className="micro-label">{selectable.length} ITEMS IN POOL</p>

      {mode === "numbers" && (
        <div className="option-rows">
          <div className="limit-row" role="radiogroup" aria-label="direction">
            <button
              type="button"
              aria-pressed={options.direction === "jp2num"}
              onClick={() => setOptions({ ...options, direction: "jp2num" })}
            >
              JAPANESE → NUMBER
            </button>
            <button
              type="button"
              aria-pressed={options.direction === "num2jp"}
              onClick={() => setOptions({ ...options, direction: "num2jp" })}
            >
              NUMBER → JAPANESE
            </button>
          </div>
          <div className="limit-row" role="radiogroup" aria-label="range">
            {NUMBER_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={options.rangeMin === p.min && options.rangeMax === p.max}
                onClick={() => setOptions({ ...options, rangeMin: p.min, rangeMax: p.max })}
              >
                {p.label}
              </button>
            ))}
            <label className="micro-label" htmlFor="range-min">
              MIN
            </label>
            <input
              id="range-min"
              type="number"
              min={1}
              max={999999}
              value={options.rangeMin}
              onChange={(e) => setOptions({ ...options, rangeMin: Number(e.target.value) })}
            />
            <label className="micro-label" htmlFor="range-max">
              MAX
            </label>
            <input
              id="range-max"
              type="number"
              min={1}
              max={999999}
              value={options.rangeMax}
              onChange={(e) => setOptions({ ...options, rangeMax: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {mode === "dates" && (
        <div className="option-rows">
          <div className="limit-row" role="radiogroup" aria-label="date mode">
            <button
              type="button"
              aria-pressed={options.dateMode === "weekdays"}
              onClick={() => setOptions({ ...options, dateMode: "weekdays" })}
            >
              DAYS OF WEEK
            </button>
            <button
              type="button"
              aria-pressed={options.dateMode === "full"}
              onClick={() => setOptions({ ...options, dateMode: "full" })}
            >
              FULL DATES
            </button>
          </div>
          <div className="limit-row" role="radiogroup" aria-label="direction">
            <button
              type="button"
              aria-pressed={options.direction === "jp2en"}
              onClick={() => setOptions({ ...options, direction: "jp2en" })}
            >
              JAPANESE → ENGLISH
            </button>
            <button
              type="button"
              aria-pressed={options.direction === "en2jp"}
              onClick={() => setOptions({ ...options, direction: "en2jp" })}
            >
              ENGLISH → JAPANESE
            </button>
          </div>
          {options.dateMode === "full" && (
            <div className="limit-row">
              <label className="micro-label" htmlFor="year-min">
                YEAR MIN
              </label>
              <input
                id="year-min"
                type="number"
                min={1}
                max={9999}
                value={options.yearMin}
                onChange={(e) => setOptions({ ...options, yearMin: Number(e.target.value) })}
              />
              <label className="micro-label" htmlFor="year-max">
                YEAR MAX
              </label>
              <input
                id="year-max"
                type="number"
                min={1}
                max={9999}
                value={options.yearMax}
                onChange={(e) => setOptions({ ...options, yearMax: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      )}

      <div className="limit-row" role="radiogroup" aria-label="question limit">
        {LIMITS.map((l) => (
          <button key={l} type="button" aria-pressed={limit === l} onClick={() => setLimit(l)}>
            {l}
          </button>
        ))}
        <button type="button" aria-pressed={limit === "all"} onClick={() => setLimit("all")}>
          ALL
        </button>
      </div>
      <button type="button" className="primary" onClick={start} disabled={selectable.length === 0}>
        START
      </button>
    </div>
  );
}

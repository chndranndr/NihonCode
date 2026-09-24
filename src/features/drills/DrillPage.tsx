import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DrillSession, type SessionItem, type SessionResult } from "../../components/DrillSession";
import { type Pools } from "../../components/pools";
import { useLevel } from "../../components/level";
import { PoolMatrix } from "../../components/PoolMatrix";
import { makeNumberQuestionInRange } from "../../domain/numbers";
import { makeFullDate, WEEKDAYS } from "../../domain/dates";
import { perfectDrillBonus, XP } from "../../domain/progress";
import {
  awardXp,
  newSessionId,
  recordAttempt,
  recordSession,
  type AttemptKind,
} from "../../storage/progressRepo";
import { loadLevelData } from "../../content/loaders";
import type { VocabItem } from "../../content/models";

import { kanaToRomaji } from "../../domain/romaji";
import {
  ADJ_FORM_LABELS,
  ADJ_FORMS,
  conjugateAdjective,
  conjugateVerb,
  VERB_FORM_LABELS,
  VERB_FORMS,
  type AdjClass,
  type AdjForm,
  type VerbClass,
  type VerbForm,
} from "../../domain/conjugation";

const LIMITS = [10, 20, 50] as const;

const DRILL_KINDS: readonly AttemptKind[] = [
  "kana",
  "kanji",
  "vocab",
  "numbers",
  "dates",
  "conjugation",
];

function drillKind(mode: string): AttemptKind | null {
  return DRILL_KINDS.find((k) => k === mode) ?? null;
}

const MODE_TITLES: Record<string, string> = {
  kana: "Kana",
  kanji: "Kanji",
  vocab: "Vocabulary",
  numbers: "Numbers",
  dates: "Dates",
  conjugation: "Conjugation",
};

function modeName(mode: string): string {
  return MODE_TITLES[mode] ?? mode;
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
  conjWordType: "verb" | "adjective";
  conjVerbClasses: string[];
  conjAdjClasses: string[];
  conjVerbForms: string[];
  conjAdjForms: string[];
}

export const DEFAULT_OPTIONS: DrillOptions = {
  direction: "jp2num",
  dateMode: "weekdays",
  yearMin: 2020,
  yearMax: 2030,
  rangeMin: 1,
  rangeMax: 999_999,
  conjWordType: "verb",
  conjVerbClasses: ["godan", "ichidan", "irregular"],
  conjAdjClasses: ["i", "na"],
  conjVerbForms: ["masu"],
  conjAdjForms: ["negative"],
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

export function buildItems(mode: string, pools: Pools, options: DrillOptions): SessionItem[] {
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
      return shuffle(pools.kanji).map((k) => {
        // Readings display as one string ("ここのつ / キュウ ク"); the gate
        // guarantees answers are atomic marker-free kana, so transliterate
        // those — learners type romaji, grading is normalized.
        const romaji = k.answers.map((a) => kanaToRomaji(a)).filter((r): r is string => r !== null);
        return {
          id: k.id,
          prompt: k.char,
          accepted: [...k.answers, ...romaji],
          reveal: {
            scripts: [k.char, k.reading],
            meaning: k.meaning,
            group: `kanji ${k.level}`,
          },
          speakText: k.char,
        };
      });
    case "vocab":
      return shuffle(pools.vocab).map((v) => ({
        id: v.id,
        prompt: v.kanji,
        accepted: [v.romaji],
        reveal: {
          scripts: [v.kanji, v.kana],
          meaning: v.meaning,
          group: `vocab ${v.level}`,
        },
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
          // Weekday names are kanji, so the romaji lives on the model;
          // en→jp accepts the reading and its romaji.
          accepted: jp2en ? [w.en] : [w.jp, w.romaji],
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
    case "conjugation": {
      // PRD 10.9: base word + target form; romaji answers only; N5 vocabulary
      // by scope. Eligible words are the gate's conjugable entries (curated
      // pos/class metadata).
      const isVerb = options.conjWordType === "verb";
      const classes = isVerb ? options.conjVerbClasses : options.conjAdjClasses;
      const forms = isVerb ? options.conjVerbForms : options.conjAdjForms;
      const items: SessionItem[] = [];
      for (const v of pools.vocab) {
        if (v.pos !== options.conjWordType) continue;
        if (v.conjugationClass === undefined || !classes.includes(v.conjugationClass)) continue;
        for (const f of forms) {
          // The gate pairs pos with its class set (audit-clean enforces it),
          // so each branch narrows to its own class union.
          const conj = isVerb
            ? conjugateVerb(v.kana, v.kanji, v.conjugationClass as VerbClass, f as VerbForm)
            : conjugateAdjective(v.kana, v.kanji, v.conjugationClass as AdjClass, f as AdjForm);
          if (conj === null) continue;
          const label = isVerb ? VERB_FORM_LABELS[f as VerbForm] : ADJ_FORM_LABELS[f as AdjForm];
          items.push({
            id: `${v.id}:${f}`,
            prompt: v.kanji,
            subprompt: `${label} · ${v.kana} · ${v.meaning}`,
            accepted: [conj.romaji],
            reveal: {
              scripts: [conj.kanji, conj.kana],
              meaning: v.meaning,
              group: `${v.pos} · ${v.conjugationClass}`,
              romaji: conj.romaji,
            },
            speakText: conj.kana,
            hint: isVerb ? `${v.conjugationClass} verb` : `${v.conjugationClass}-adjective`,
          });
        }
      }
      return items;
    }
    default:
      return [];
  }
}

export function DrillPage() {
  const { mode = "kana" } = useParams();
  const navigate = useNavigate();
  const { pools, level } = useLevel();
  const [limit, setLimit] = useState<number | "all">(10);
  const [options, setOptions] = useState<DrillOptions>(DEFAULT_OPTIONS);
  const [session, setSession] = useState<SessionItem[] | null>(null);
  const [summary, setSummary] = useState<SessionResult | null>(null);
  // Stable per run: retries reshuffle and take a fresh id (PRD §10.13).
  const sessionIdRef = useRef("");

  const [n5Vocab, setN5Vocab] = useState<VocabItem[] | null>(null);
  useEffect(() => {
    // Conjugation stays on N5 vocab even when another level is active (PRD
    // 10.9 scope); the loader cache makes repeat fetches instant.
    if (mode !== "conjugation" || n5Vocab) return;
    let cancelled = false;
    void loadLevelData("n5").then((d) => {
      if (!cancelled) setN5Vocab(d.vocab.items);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, n5Vocab]);

  // Conjugation always slices the N5 vocab pool (PRD 10.9 scope), even when
  // another level is active; every other mode uses the live level. One
  // derivation keeps the setup preview and start() on the same source.
  const effectivePools = useMemo(() => {
    if (!pools) return null;
    return mode === "conjugation" && n5Vocab ? { ...pools, vocab: n5Vocab } : pools;
  }, [mode, pools, n5Vocab]);

  const all = useMemo(
    () => (effectivePools ? buildItems(mode, effectivePools, options) : []),
    [mode, effectivePools, options],
  );
  const selectable = all;

  function start(): void {
    // Generated modes rebuild their pool per start so a retry reshuffles into
    // fresh questions, not the same 50 (PRD 10.6 retry-reshuffled); the
    // conjugation word×form draw reslices the same way.
    if (!effectivePools) return;
    const pool =
      mode === "numbers" || mode === "dates" || mode === "conjugation"
        ? buildItems(mode, effectivePools, options)
        : selectable;
    const picked = limit === "all" ? pool : pool.slice(0, limit);
    sessionIdRef.current = newSessionId(`drill:${mode}`);
    setSession(shuffle(picked));
    setSummary(null);
  }

  async function finish(result: SessionResult): Promise<void> {
    const kind = drillKind(mode);
    if (!kind) return;
    // The completion record is the idempotency gate: a double FINISH must not
    // double XP or duplicate per-item attempts (PRD §10.13).
    const inserted = await recordSession(sessionIdRef.current, kind, result.correct, result.total);
    if (!inserted) return;
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
      <div className="results" data-testid="summary">
        <div className="page-head">
          <div>
            <p className="label">キタ / {level.toUpperCase()} STUDY</p>
            <h1>Session complete.</h1>
            <p className="description">
              Take a moment to look back. Every attempt gives you something to build on.
            </p>
          </div>
        </div>
        <div className="result-head">
          <div className="result-score">
            <span data-testid="summary-score">{pct}%</span>
            <small>accuracy</small>
          </div>
          <div className="result-metrics">
            <div>
              <strong>
                {summary.correct} / {summary.total}
              </strong>
              <span>correct answers</span>
            </div>
            <div>
              <strong>{summary.total - summary.correct}</strong>
              <span>to revisit</span>
            </div>
          </div>
        </div>
        <div className="panel-head">
          <h2>
            {summary.answers.some((a) => !a.correct)
              ? "Review your answers"
              : "A clean run. Nicely done."}
          </h2>
          <span className="label">THIS SESSION</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Your answer</th>
                <th>Expected answer</th>
              </tr>
            </thead>
            <tbody>
              {summary.answers.map((a) => (
                <tr key={a.id}>
                  <td lang="ja">{a.prompt}</td>
                  <td>{a.submitted}</td>
                  <td lang="ja">{a.accepted.join(" / ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="summary-actions">
          <button type="button" className="primary" onClick={start}>
            RETRY (RESHUFFLED)
          </button>
          <button type="button" onClick={() => navigate("/learn")}>
            CHOOSE ANOTHER PRACTICE
          </button>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <DrillSession
        title={`${modeName(mode)} practice`}
        items={session}
        onFinish={(r) => void finish(r)}
        onAbort={() => {
          setSession(null);
          navigate("/learn");
        }}
      />
    );
  }

  const sessionCount = Math.min(limit === "all" ? selectable.length : limit, selectable.length);

  return (
    <div className="setup" data-testid="drill-setup">
      <Link className="back" to="/learn">
        ← Choose a practice
      </Link>
      <div className="page-head">
        <div>
          <p className="label">キタ / {level.toUpperCase()} STUDY</p>
          <h1>{modeName(mode)} practice</h1>
          <p className="description">
            Explore the available items, then choose how much to practice.
          </p>
        </div>
      </div>

      <div className="toolbar">
        {mode === "numbers" && (
          <>
            <div className="field" role="radiogroup" aria-label="direction">
              <span>Direction</span>
              <div className="segmented">
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
            </div>
            <div className="field">
              <span>Range</span>
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
              </div>
            </div>
            <div className="field">
              <label htmlFor="range-min">Min</label>
              <input
                id="range-min"
                type="number"
                min={1}
                max={999999}
                value={options.rangeMin}
                onChange={(e) => setOptions({ ...options, rangeMin: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label htmlFor="range-max">Max</label>
              <input
                id="range-max"
                type="number"
                min={1}
                max={999999}
                value={options.rangeMax}
                onChange={(e) => setOptions({ ...options, rangeMax: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {mode === "dates" && (
          <>
            <div className="field" role="radiogroup" aria-label="date mode">
              <span>Date mode</span>
              <div className="segmented">
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
            </div>
            <div className="field" role="radiogroup" aria-label="direction">
              <span>Direction</span>
              <div className="segmented">
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
            </div>
            {options.dateMode === "full" && (
              <>
                <div className="field">
                  <label htmlFor="year-min">Year min</label>
                  <input
                    id="year-min"
                    type="number"
                    min={1}
                    max={9999}
                    value={options.yearMin}
                    onChange={(e) => setOptions({ ...options, yearMin: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="year-max">Year max</label>
                  <input
                    id="year-max"
                    type="number"
                    min={1}
                    max={9999}
                    value={options.yearMax}
                    onChange={(e) => setOptions({ ...options, yearMax: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
          </>
        )}

        {mode === "conjugation" && (
          <>
            <div className="field" role="radiogroup" aria-label="word type">
              <span>Word type</span>
              <div className="segmented">
                <button
                  type="button"
                  aria-pressed={options.conjWordType === "verb"}
                  onClick={() => setOptions({ ...options, conjWordType: "verb" })}
                >
                  VERBS
                </button>
                <button
                  type="button"
                  aria-pressed={options.conjWordType === "adjective"}
                  onClick={() => setOptions({ ...options, conjWordType: "adjective" })}
                >
                  ADJECTIVES
                </button>
              </div>
            </div>
            <div className="field" role="group" aria-label="included classes">
              <span>Classes</span>
              <div className="limit-row">
                {(options.conjWordType === "verb"
                  ? (["godan", "ichidan", "irregular"] as const)
                  : (["i", "na"] as const)
                ).map((cls) => {
                  const selected =
                    options.conjWordType === "verb"
                      ? options.conjVerbClasses
                      : options.conjAdjClasses;
                  const on = selected.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        // Zero classes would empty the pool; keep at least one.
                        if (on && selected.length === 1) return;
                        const next = on ? selected.filter((c) => c !== cls) : [...selected, cls];
                        setOptions(
                          options.conjWordType === "verb"
                            ? { ...options, conjVerbClasses: next }
                            : { ...options, conjAdjClasses: next },
                        );
                      }}
                    >
                      {cls.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="field" role="group" aria-label="conjugation forms">
              <span>Target forms</span>
              <div className="limit-row">
                {(options.conjWordType === "verb" ? VERB_FORMS : ADJ_FORMS).map((f) => {
                  const selected =
                    options.conjWordType === "verb" ? options.conjVerbForms : options.conjAdjForms;
                  const on = selected.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        if (on && selected.length === 1) return;
                        const next = on ? selected.filter((x) => x !== f) : [...selected, f];
                        setOptions(
                          options.conjWordType === "verb"
                            ? { ...options, conjVerbForms: next }
                            : { ...options, conjAdjForms: next },
                        );
                      }}
                    >
                      {f.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="field">
          <span>Questions</span>
          <div className="segmented" role="radiogroup" aria-label="question limit">
            {LIMITS.map((l) => (
              <button key={l} type="button" aria-pressed={limit === l} onClick={() => setLimit(l)}>
                {l}
              </button>
            ))}
            <button type="button" aria-pressed={limit === "all"} onClick={() => setLimit("all")}>
              ALL
            </button>
          </div>
        </div>
      </div>

      <PoolMatrix mode={mode} items={all} />

      <div className="start-dock">
        <div>
          <p>
            {sessionCount} questions · from {selectable.length} eligible items
          </p>
          <p className="sample-note">
            Search and pagination browse the preview; they do not change your session pool.
          </p>
        </div>
        <button
          type="button"
          className="primary"
          onClick={start}
          disabled={selectable.length === 0}
        >
          START
        </button>
      </div>
    </div>
  );
}

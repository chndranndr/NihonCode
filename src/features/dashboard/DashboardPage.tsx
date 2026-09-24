import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { routineAction, routineLabel, type RoutineAction } from "../../domain/routine";
import { xpProgress } from "../../domain/progress";
import { srsPoolIds } from "../../components/pools";
import { useLevel } from "../../components/level";
import { buildDueQueue, dueCount, srsStats, type SrsStats } from "../../storage/srsRepo";
import { db } from "../../storage/db";
import { masteryByItem } from "../../storage/progressRepo";
import { activityRows } from "../../storage/progressRepo";
import type { ActivityRow } from "../../domain/activity";
import { compactWindow } from "../../domain/activity";
import { dayKey } from "../../domain/progress";
import { ActivityCalendar } from "../../components/ActivityCalendar";
import { useTheme } from "../../components/theme";
import { loadPrefs } from "../../storage/prefs";
import { ENABLED_LEVELS } from "../../content/loaders";
import type { JlptLevel } from "../../content/ids";

const FUJI = `                 /\\
              . /  \\ .
           .   / /\\ \\   .
        ._____/ /  \\ \\_____.
      ─────────────────────────
            毎日、少しずつ。`;

type KanjiBand = "mastered" | "learning" | "unseen";

interface DashboardState {
  action: RoutineAction | null;
  due: number;
  fresh: number;
  stats: SrsStats | null;
  grammarDone: number;
  grammarTotal: number;
  grammarTitle: string | null;
  kanjiBands: { char: string; band: KanjiBand }[];
  activity: ActivityRow[];
}

export function DashboardPage() {
  const prefs = loadPrefs();
  const liveTheme = useTheme();
  const { pools, level, setLevel } = useLevel();
  const [state, setState] = useState<DashboardState>({
    action: null,
    due: 0,
    fresh: 0,
    stats: null,
    grammarDone: 0,
    grammarTotal: 0,
    grammarTitle: null,
    kanjiBands: [],
    activity: [],
  });

  useEffect(() => {
    if (!pools) return;
    let cancelled = false;
    async function compute(): Promise<void> {
      const poolIds = srsPoolIds(pools!);
      const due = await dueCount(poolIds);
      const queue = await buildDueQueue(poolIds, prefs.srs.dailyNewCap);
      const rows = await db().grammarState.bulkGet(pools!.grammar.map((l) => l.id));
      const grammarDone = rows.filter((r) => r?.status === "completed").length;
      const nextLesson = pools!.grammar.find((_l, i) => rows[i]?.status !== "completed") ?? null;
      const stats = await srsStats(poolIds);
      const kanjiBands: { char: string; band: KanjiBand }[] = [];
      for (const k of pools!.kanji) {
        const m = await masteryByItem(k.id);
        const band: KanjiBand =
          m.attempts === 0 ? "unseen" : m.accuracy >= 0.8 ? "mastered" : "learning";
        kanjiBands.push({ char: k.char, band });
      }
      const activity = await activityRows();
      if (cancelled) return;
      setState({
        action: routineAction({
          dueCount: due,
          newCardCount: queue.newCandidates.length,
          poolSize: poolIds.length,
        }),
        due,
        fresh: queue.newCandidates.length,
        stats,
        grammarDone,
        grammarTotal: pools!.grammar.length,
        grammarTitle: nextLesson?.title ?? null,
        kanjiBands,
        activity,
      });
    }
    void compute();
    return () => {
      cancelled = true;
    };
  }, [pools, prefs.srs.dailyNewCap]);

  if (!pools) {
    return (
      <p className="micro-label" data-testid="dashboard-loading">
        LOADING…
      </p>
    );
  }

  const { action, stats } = state;
  const progress = xpProgress(prefs.progress.xp);
  const today = dayKey(new Date());
  const window = compactWindow(today);
  const mastered = state.kanjiBands.filter((k) => k.band === "mastered").length;
  const learning = state.kanjiBands.filter((k) => k.band === "learning").length;

  const momentumLine =
    state.due > 0
      ? `${state.due} cards are ready for another look.`
      : state.fresh > 0
        ? `${state.fresh} new cards are waiting to be introduced.`
        : "Nothing is due right now. A short drill keeps it moving.";

  return (
    <div className="dashboard" data-testid="dashboard">
      <div className="page-head">
        <div>
          <p className="label">YOUR JAPANESE, A LITTLE EVERY DAY</p>
          <h1>Welcome back.</h1>
          <div className="status-strip" role="status">
            <span className="micro-label">LVL {level.toUpperCase()}</span>
            <span className="micro-label" data-testid="streak">
              STREAK {prefs.progress.streakDays}
            </span>
            <span className="micro-label" data-testid="xp">
              XP {prefs.progress.xp}
            </span>
          </div>
        </div>
        <pre className="fuji" aria-hidden="true">
          {FUJI}
        </pre>
      </div>

      <div className="field" role="radiogroup" aria-label="study level">
        <span>Study level</span>
        <div className="segmented">
          {(["n5", "n4", "n3", "n2", "n1"] as JlptLevel[]).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              disabled={!ENABLED_LEVELS.includes(l)}
              title={
                ENABLED_LEVELS.includes(l) ? undefined : "enabled after its curation pass lands"
              }
              onClick={() => setLevel(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-home">
        <section className="panel routine" data-testid="routine-card">
          <p className="label">TODAY’S PRACTICE</p>
          <h2>Keep your Japanese moving.</h2>
          <p className="muted">{momentumLine}</p>
          {action ? (
            <Link
              className="button primary routine-cta"
              data-testid="routine-cta"
              to={
                action.kind === "review" || action.kind === "new-cards"
                  ? "/learn/review"
                  : action.kind === "progress"
                    ? "/progress"
                    : `/learn/drill/${action.kind === "drill" ? action.mode : "kana"}`
              }
            >
              {routineLabel(action)}
            </Link>
          ) : (
            <p className="micro-label">LOADING…</p>
          )}
          <span className="muted">Choose your session before you begin.</span>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Your momentum</h2>
          </div>
          <ActivityCalendar
            rows={state.activity}
            startKey={window.start}
            endKey={window.end}
            todayKey={today}
            compact
          />
          <Link className="text-link" to="/progress">
            View full activity →
          </Link>
        </section>

        <section className="panel span-all">
          <div className="panel-head">
            <h2>Choose a practice</h2>
          </div>
          <div className="practice-list">
            {[
              ["あ", "Kana", "Hiragana & katakana", "kana"],
              ["漢", "Kanji", "Characters & readings", "kanji"],
              ["語", "Vocabulary", "Words & meanings", "vocab"],
              ["123", "Numbers", "Counting practice", "numbers"],
              ["日", "Dates", "Days & dates", "dates"],
              ["活", "Conjugation", "Verbs & adjectives", "conjugation"],
            ].map(([glyph, name, desc, mode]) => (
              <Link key={mode} className="practice-link" to={`/learn/drill/${mode}`}>
                <span lang={mode === "numbers" ? undefined : "ja"}>{glyph}</span>
                <span>
                  <b>{name}</b>
                  <small>{desc}</small>
                </span>
                <span className="arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="compact-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>{`Grammar · ${level.toUpperCase()}`}</h2>
          </div>
          <div className="lesson-preview">
            <p className="label" data-testid="grammar-position">
              {state.grammarTotal > 0 && state.grammarDone >= state.grammarTotal
                ? `ALL ${state.grammarTotal} COMPLETE`
                : `LESSON ${Math.min(state.grammarDone + 1, state.grammarTotal || 1)}/${state.grammarTotal || "—"}`}
            </p>
            <p className="muted">
              {state.grammarTitle ?? "Every grammar lesson at this level is complete."}
            </p>
            {state.grammarTitle && (
              <Link className="button" to="/learn">
                Continue lesson →
              </Link>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Your kanji</h2>
          </div>
          <div className="kanji-map" aria-hidden="true">
            {state.kanjiBands.map((k, i) => (
              <span key={`${k.char}-${i}`} className={`kanji-cell ${k.band}`} lang="ja">
                {k.char}
              </span>
            ))}
          </div>
          <p className="map-legend">
            <span className="mastered">MASTERED</span>
            <span className="learning">LEARNING</span>
            <span className="unseen">UNSEEN</span>
          </p>
          <p className="micro-label" data-testid="kanji-map-compact">
            MASTERED {mastered}/{state.kanjiBands.length || "—"} · LEARNING {learning}
          </p>
          <Link className="text-link" to="/progress">
            Full map + inspector →
          </Link>
        </section>
      </div>

      <div className="jlpt-strip">
        <Link to="/learn/jlpt">Explore JLPT practice →</Link>
        <span className="muted">
          All five JLPT categories ship locally.
          {stats ? ` · LEVEL ${progress.level}` : ""}
          {` · THEME ${liveTheme.theme.toUpperCase()}`}
        </span>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { routineAction, routineLabel, type RoutineAction } from "../../domain/routine";
import { xpProgress } from "../../domain/progress";
import { srsPoolIds } from "../../components/pools";
import { useLevel } from "../../components/level";
import { buildDueQueue, dueCount, srsStats, type SrsStats } from "../../storage/srsRepo";
import { db } from "../../storage/db";
import { masteryByItem } from "../../storage/progressRepo";
import { Panel } from "../../components/Panel";
import { useTheme } from "../../components/theme";
import { loadPrefs } from "../../storage/prefs";
import { ENABLED_LEVELS } from "../../content/loaders";
import type { JlptLevel } from "../../content/ids";

interface DashboardState {
  action: RoutineAction | null;
  stats: SrsStats | null;
  grammarDone: number;
  grammarTotal: number;
  kanjiMastered: number;
  kanjiTotal: number;
}

export function DashboardPage() {
  const prefs = loadPrefs();
  const liveTheme = useTheme();
  const { pools, level, setLevel } = useLevel();
  const [state, setState] = useState<DashboardState>({
    action: null,
    stats: null,
    grammarDone: 0,
    grammarTotal: 0,
    kanjiMastered: 0,
    kanjiTotal: 0,
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
      const stats = await srsStats(poolIds);
      let kanjiMastered = 0;
      for (const k of pools!.kanji) {
        const m = await masteryByItem(k.id);
        if (m.attempts > 0 && m.accuracy >= 0.8) kanjiMastered += 1;
      }
      if (cancelled) return;
      setState({
        action: routineAction({
          dueCount: due,
          newCardCount: queue.newCandidates.length,
          poolSize: poolIds.length,
        }),
        stats,
        grammarDone,
        grammarTotal: pools!.grammar.length,
        kanjiMastered,
        kanjiTotal: pools!.kanji.length,
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

  return (
    <div className="dashboard" data-testid="dashboard">
      <div className="status-strip" role="status">
        <span className="micro-label">キタ NIHONCODE</span>
        <span className="micro-label">LVL {level.toUpperCase()}</span>
        <span className="micro-label" data-testid="streak">
          STREAK {prefs.progress.streakDays}
        </span>
        <span className="micro-label" data-testid="xp">
          XP {prefs.progress.xp}
        </span>
      </div>

      <div className="limit-row level-selector" role="radiogroup" aria-label="study level">
        {(["n5", "n4", "n3", "n2", "n1"] as JlptLevel[]).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={level === l}
            disabled={!ENABLED_LEVELS.includes(l)}
            title={ENABLED_LEVELS.includes(l) ? undefined : "enabled after its curation pass lands"}
            onClick={() => setLevel(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <section className="routine-card panel" data-testid="routine-card">
        <h2 className="micro-label">DAILY ROUTINE</h2>
        {action ? (
          <Link
            className="routine-cta primary"
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
      </section>

      <div className="dash-grid">
        <Panel title="PRACTICE MODES">
          <ul className="mode-grid">
            <li>
              <Link to="/learn/drill/kana">KANA</Link>
            </li>
            <li>
              <Link to="/learn/drill/kanji">KANJI</Link>
            </li>
            <li>
              <Link to="/learn/drill/vocab">VOCAB</Link>
            </li>
            <li>
              <Link to="/learn/drill/numbers">NUMBERS</Link>
            </li>
            <li>
              <Link to="/learn/drill/dates">DATES</Link>
            </li>
            <li>
              <Link to="/learn/drill/conjugation">CONJUGATION</Link>
            </li>
          </ul>
        </Panel>

        <Panel title="SRS">
          {stats ? (
            <>
              <p className="micro-label">
                DUE {stats.due} / LEARNED {stats.learned} / TOTAL {stats.total}
              </p>
              <Link to="/stats">SRS STATISTICS</Link>
            </>
          ) : (
            <p className="micro-label">LOADING…</p>
          )}
        </Panel>

        <Panel title="GRAMMAR N5">
          <p className="micro-label" data-testid="grammar-position">
            {state.grammarTotal > 0 && state.grammarDone >= state.grammarTotal
              ? `ALL ${state.grammarTotal} COMPLETE`
              : `LESSON ${Math.min(state.grammarDone + 1, state.grammarTotal || 1)}/${state.grammarTotal || "—"}`}
          </p>
          <Link to="/learn">OPEN LIBRARY</Link>
        </Panel>

        <Panel title="JLPT PRACTICE">
          <p className="micro-label">{`N5–N1 SETS · ${level.toUpperCase()} ACTIVE`}</p>
          <Link to="/learn/jlpt">OPEN EXERCISE SETS</Link>
        </Panel>
        <Panel title="PROGRESS">
          <p className="micro-label">
            LEVEL {progress.level} · {progress.intoLevel}/{progress.levelSpan} XP
          </p>
        </Panel>

        <Panel title="CONJUGATION">
          <p className="micro-label">N5 VERB & ADJECTIVE FORMS</p>
          <Link to="/learn/drill/conjugation">OPEN DRILL</Link>
        </Panel>

        <Panel title="KANJI MAP">
          <p className="micro-label" data-testid="kanji-map-compact">
            MASTERED {state.kanjiMastered}/{state.kanjiTotal || "—"}
          </p>
          <Link to="/progress">FULL MAP + INSPECTOR</Link>
        </Panel>

        <Panel title="SETTINGS">
          <p className="micro-label">
            THEME {liveTheme.theme.toUpperCase()} · ACCENT {liveTheme.accent.toUpperCase()} · CAP{" "}
            {prefs.srs.dailyNewCap}
          </p>
          <Link to="/config">OPEN CONFIG</Link>
        </Panel>
      </div>
    </div>
  );
}

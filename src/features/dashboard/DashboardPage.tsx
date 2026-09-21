import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { routineAction, routineLabel, type RoutineAction } from "../../domain/routine";
import { xpProgress } from "../../domain/progress";
import { getPools, srsPoolIds } from "../../components/pools";
import { buildDueQueue, dueCount, srsStats, type SrsStats } from "../../storage/srsRepo";
import { db } from "../../storage/db";
import { masteryByItem } from "../../storage/progressRepo";
import { LockedPanel, Panel } from "../../components/Panel";
import { useTheme } from "../../components/theme";
import { loadPrefs } from "../../storage/prefs";
import { CLEAN_SLICE_LEVEL } from "../../content/loaders";

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
  const pools = getPools();
  const [state, setState] = useState<DashboardState>({
    action: null,
    stats: null,
    grammarDone: 0,
    grammarTotal: 0,
    kanjiMastered: 0,
    kanjiTotal: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function compute(): Promise<void> {
      const poolIds = srsPoolIds(pools);
      const due = await dueCount();
      const queue = await buildDueQueue(poolIds, prefs.srs.dailyNewCap);
      const stats = await srsStats();
      const rows = await db().grammarState.bulkGet(pools.grammar.map((l) => l.id));
      const grammarDone = rows.filter((r) => r?.status === "completed").length;
      let kanjiMastered = 0;
      for (const k of pools.kanji) {
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
        grammarTotal: pools.grammar.length,
        kanjiMastered,
        kanjiTotal: pools.kanji.length,
      });
    }
    void compute();
    return () => {
      cancelled = true;
    };
  }, [pools, prefs.srs.dailyNewCap]);

  const { action, stats } = state;
  const progress = xpProgress(prefs.progress.xp);

  return (
    <div className="dashboard" data-testid="dashboard">
      <div className="status-strip" role="status">
        <span className="micro-label">キタ NIHONCODE</span>
        <span className="micro-label">LVL {CLEAN_SLICE_LEVEL.toUpperCase()}</span>
        <span className="micro-label" data-testid="streak">
          STREAK {prefs.progress.streakDays}
        </span>
        <span className="micro-label" data-testid="xp">
          XP {prefs.progress.xp}
        </span>
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
          </ul>
        </Panel>

        <Panel title="SRS">
          {stats ? (
            <p className="micro-label">
              DUE {stats.due} / LEARNED {stats.learned} / TOTAL {stats.total}
            </p>
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

        <LockedPanel
          title="JLPT PRACTICE"
          reason="Deferred to Phase 2/3: remote images, truncated prompts, and unverified audio aliasing in the source sets."
        />
        <Panel title="PROGRESS">
          <p className="micro-label">
            LEVEL {progress.level} · {progress.intoLevel}/{progress.levelSpan} XP
          </p>
        </Panel>

        <LockedPanel
          title="CONJUGATION"
          reason="Locked: vocabulary carries no per-entry conjugation-class metadata (godan/ichidan/irregular, i-/na-adjective); the drill ships with it in Phase 3."
        />

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

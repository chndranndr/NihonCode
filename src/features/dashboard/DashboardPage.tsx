import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { routineAction, routineLabel, type RoutineAction } from "../../domain/routine";
import { xpProgress } from "../../domain/progress";
import { usePools, srsPoolIds } from "../../components/pools";
import { buildDueQueue, dueCount, srsStats, type SrsStats } from "../../storage/srsRepo";
import { db } from "../../storage/db";
import { currentPrefs, masteryByItem } from "../../storage/progressRepo";
import { LockedPanel, Panel } from "../../components/Panel";
import { useTheme } from "../../components/theme";
import type { Prefs } from "../../storage/prefs";

interface DashboardState {
  action: RoutineAction | null;
  prefs: Prefs | null;
  stats: SrsStats | null;
  grammarDone: number;
  grammarTotal: number;
  kanjiMastered: number;
  kanjiTotal: number;
}

export function DashboardPage() {
  const prefs0 = currentPrefs();
  const liveTheme = useTheme();
  const pools = usePools(prefs0.level);
  const [state, setState] = useState<DashboardState>({
    action: null,
    prefs: prefs0,
    stats: null,
    grammarDone: 0,
    grammarTotal: 0,
    kanjiMastered: 0,
    kanjiTotal: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function compute(): Promise<void> {
      const prefs = currentPrefs();
      const poolIds = pools ? srsPoolIds(pools) : [];
      const due = await dueCount();
      const queue = pools
        ? await buildDueQueue(poolIds, prefs.srs.dailyNewCap)
        : { due: [], newCandidates: [] };
      const stats = await srsStats();
      const grammarTotal = pools?.grammar.length ?? 0;
      let grammarDone = 0;
      if (pools) {
        const rows = await db().grammarState.bulkGet(pools.grammar.map((l) => l.id));
        grammarDone = rows.filter((r) => r?.status === "completed").length;
      }
      let kanjiMastered = 0;
      if (pools) {
        for (const k of pools.kanji) {
          const m = await masteryByItem(k.id);
          if (m.attempts > 0 && m.accuracy >= 0.8) kanjiMastered += 1;
        }
      }
      if (cancelled) return;
      setState({
        action: routineAction({
          dueCount: due,
          newCardCount: queue.newCandidates.length,
          poolSize: poolIds.length,
        }),
        prefs,
        stats,
        grammarDone,
        grammarTotal,
        kanjiMastered,
        kanjiTotal: pools?.kanji.length ?? 0,
      });
    }
    void compute();
    return () => {
      cancelled = true;
    };
  }, [pools]);

  const { action, prefs, stats } = state;
  const progress = prefs ? xpProgress(prefs.progress.xp) : null;

  return (
    <div className="dashboard" data-testid="dashboard">
      <div className="status-strip" role="status">
        <span className="micro-label">キタ NIHONCODE</span>
        <span className="micro-label">LVL {prefs?.level.toUpperCase() ?? "—"}</span>
        <span className="micro-label" data-testid="streak">
          STREAK {prefs?.progress.streakDays ?? 0}
        </span>
        <span className="micro-label" data-testid="xp">
          XP {prefs?.progress.xp ?? 0}
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
          {progress ? (
            <p className="micro-label">
              LEVEL {progress.level} · {progress.intoLevel}/{progress.levelSpan} XP
            </p>
          ) : (
            <p className="micro-label">LOADING…</p>
          )}
        </Panel>

        <LockedPanel
          title="CONJUGATION"
          reason="Deferred to Phase 2: vocabulary lacks per-entry verb/adjective class metadata."
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
            {prefs?.srs.dailyNewCap ?? "—"}
          </p>
          <Link to="/config">OPEN CONFIG</Link>
        </Panel>
      </div>
    </div>
  );
}

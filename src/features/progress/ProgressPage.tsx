import { useEffect, useMemo, useState } from "react";
import { Panel } from "../../components/Panel";
import { useLevel } from "../../components/level";
import { achievements, coverageEstimate } from "../../domain/achievements";
import { dayKey, xpProgress } from "../../domain/progress";
import { masteryByItem, sessionSummary } from "../../storage/progressRepo";
import { srsPoolIds } from "../../components/pools";
import { srsStats, type SrsStats } from "../../storage/srsRepo";
import { loadPrefs } from "../../storage/prefs";
import { ENABLED_LEVELS, loadPracticeCore } from "../../content/loaders";
import type { JlptLevel } from "../../content/ids";
import type { KanjiItem } from "../../content/models";

interface KanjiCell {
  item: KanjiItem;
  attempts: number;
  accuracy: number;
  lastSeen: number | null;
}

/** One banding rule for cell color, inspector text, and legend. */
function masteryState(cell: {
  attempts: number;
  accuracy: number;
}): "unseen" | "mastered" | "struggling" | "learning" {
  if (cell.attempts === 0) return "unseen";
  if (cell.accuracy >= 0.8) return "mastered";
  if (cell.accuracy < 0.5) return "struggling";
  return "learning";
}

const LEVELS: JlptLevel[] = ["n5", "n4", "n3", "n2", "n1"];

export function ProgressPage() {
  const prefs = loadPrefs();
  const { pools, level, setLevel } = useLevel();
  const [stats, setStats] = useState<SrsStats | null>(null);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof sessionSummary>> | null>(null);
  const [cells, setCells] = useState<KanjiCell[]>([]);
  const [selected, setSelected] = useState<KanjiCell | null>(null);
  const [practiceCounts, setPracticeCounts] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    if (!pools) return;
    void srsStats(srsPoolIds(pools)).then(setStats);
    void sessionSummary().then(setSessions);
  }, [pools]);

  useEffect(() => {
    let cancelled = false;
    void loadPracticeCore().then((core) => {
      if (cancelled) return;
      const counts = new Map<string, number>();
      for (const rec of core[level].kanji) counts.set(rec.kanji, rec.questionCount);
      setPracticeCounts(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [level]);

  useEffect(() => {
    if (!pools) return;
    let cancelled = false;
    void (async () => {
      const next: KanjiCell[] = [];
      for (const item of pools.kanji) {
        const m = await masteryByItem(item.id);
        next.push({ item, attempts: m.attempts, accuracy: m.accuracy, lastSeen: m.lastSeen });
      }
      if (!cancelled) setCells(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [pools]);

  const progress = xpProgress(prefs.progress.xp);
  const today = dayKey(new Date());
  const todayXp = prefs.progress.weeklyXp[today] ?? 0;
  const week = Object.entries(prefs.progress.weeklyXp)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);
  const weekMax = Math.max(1, ...week.map(([, v]) => v));

  const coverage = useMemo(() => {
    if (!stats || !pools) return 0;
    return coverageEstimate(
      stats.learned,
      pools.kanji.length + pools.vocab.length,
      sessions?.grammarCompleted ?? 0,
      pools.grammar.length,
    );
  }, [pools, stats, sessions]);

  const achievementList = achievements({
    xp: prefs.progress.xp,
    streakDays: prefs.progress.streakDays,
    totalSessions: sessions?.totalSessions ?? 0,
    drillSessions: sessions?.drillSessions ?? 0,
    perfectSessions: sessions?.perfectSessions ?? 0,
    reviewsCompleted: sessions?.reviewsCompleted ?? 0,
    grammarCompleted: sessions?.grammarCompleted ?? 0,
    weeklyXp: prefs.progress.weeklyXp,
  });

  const visibleCells = useMemo(() => cells.filter((c) => c.item.level === level), [cells, level]);

  return (
    <div className="progress-page" data-testid="progress">
      <h2 className="micro-label">PROGRESS</h2>
      <div className="status-strip" role="status">
        <span className="micro-label">XP {prefs.progress.xp}</span>
        <span className="micro-label">LEVEL {progress.level}</span>
        <span className="micro-label" data-testid="p-today">
          TODAY {todayXp} XP
        </span>
      </div>

      <div className="telemetry">
        <Panel title="WEEKLY ACTIVITY">
          <div className="week-bars" role="img" aria-label="weekly XP bars">
            {week.map(([day, xp]) => (
              <div key={day} className="week-bar" title={`${day}: ${xp} XP`}>
                <div
                  className="week-fill"
                  ref={(el) => el?.style.setProperty("--h", `${(xp / weekMax) * 100}%`)}
                />
                <span className="micro-label">{day.slice(8)}</span>
              </div>
            ))}
            {week.length === 0 && <p className="empty-teach">No study days recorded yet.</p>}
          </div>
        </Panel>

        <Panel title="SRS GAUGES">
          {stats ? (
            <>
              <p className="micro-label" data-testid="srs-gauge">
                DUE {stats.due} · LEARNED {stats.learned}/{stats.total} · LAPSES {stats.lapses}
              </p>
              <div
                className="split-bar"
                role="img"
                aria-label={`mastered ${stats.mastered}, learning ${stats.learning}, new ${stats.fresh}`}
              >
                <div
                  className="split-mastered"
                  ref={(el) =>
                    el?.style.setProperty(
                      "--w",
                      `${stats.total === 0 ? 0 : (stats.mastered / stats.total) * 100}%`,
                    )
                  }
                />
                <div
                  className="split-learning"
                  ref={(el) =>
                    el?.style.setProperty(
                      "--w",
                      `${stats.total === 0 ? 0 : (stats.learning / stats.total) * 100}%`,
                    )
                  }
                />
              </div>
              <p className="micro-label">
                MASTERED {stats.mastered} · LEARNING {stats.learning} · NEW {stats.fresh}
              </p>
              <p className="micro-label">
                KANJI {stats.byKind.kanji.learned}/{stats.byKind.kanji.total} · VOCAB{" "}
                {stats.byKind.vocab.learned}/{stats.byKind.vocab.total}
              </p>
            </>
          ) : (
            <p className="micro-label">LOADING…</p>
          )}
        </Panel>

        <Panel title="ACHIEVEMENTS">
          <ul className="achievement-ticker" data-testid="achievements">
            {achievementList.map((a) => (
              <li key={a.id} className={a.unlocked ? "unlocked" : "locked"} title={a.requirement}>
                {a.unlocked ? "■" : "□"} {a.label}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="COVERAGE OF STUDIED MATERIAL">
          <p className="micro-label" data-testid="coverage">
            {Math.round(coverage * 100)}% OF THE {level.toUpperCase()} CLEAN SLICE
          </p>
          <p className="empty-teach">
            Coverage counts learned SRS cards and completed lessons against the clean-slice pool. It
            is not an exam-competence estimate.
          </p>
        </Panel>

        <Panel
          title="KANJI MASTERY MAP"
          actions={
            <div className="limit-row" role="radiogroup" aria-label="level filter">
              {LEVELS.map((l) => {
                const enabled = ENABLED_LEVELS.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={level === l}
                    disabled={!enabled}
                    title={enabled ? undefined : "map shows the active level's kanji"}
                    onClick={() => setLevel(l)}
                  >
                    {l.toUpperCase()}
                  </button>
                );
              })}
            </div>
          }
        >
          <div
            className="kanji-map"
            role="grid"
            tabIndex={0}
            aria-label="kanji mastery map"
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const idx = selected
                ? visibleCells.findIndex((c) => c.item.id === selected.item.id)
                : -1;
              const nextIdx = e.key === "ArrowRight" ? idx + 1 : Math.max(0, idx - 1);
              if (visibleCells[nextIdx]) setSelected(visibleCells[nextIdx]);
            }}
          >
            {visibleCells.map((cell) => (
              <button
                key={cell.item.id}
                type="button"
                role="gridcell"
                lang="ja"
                className={`kanji-cell ${masteryState(cell)}`}
                aria-label={`${cell.item.char}: ${cell.attempts} attempts`}
                onClick={() => setSelected(cell)}
              >
                {cell.item.char}
              </button>
            ))}
            {visibleCells.length === 0 && (
              <p className="empty-teach">No studied material at this level yet.</p>
            )}
          </div>
          <p className="map-legend" data-testid="map-legend" aria-label="map color key">
            <span className="mastered">MASTERED ≥80%</span>
            <span className="learning">LEARNING 50–79%</span>
            <span className="struggling">STRUGGLING &lt;50%</span>
            <span className="unseen">UNSEEN</span>
          </p>
          <div className="inspector panel" aria-live="polite" data-testid="inspector">
            {selected ? (
              <>
                <p className="inspector-char" lang="ja">
                  {selected.item.char}
                </p>
                <p className="micro-label">{selected.item.reading}</p>
                <p>{selected.item.meaning}</p>
                <p className="micro-label">
                  ATTEMPTS {selected.attempts} · ACCURACY {Math.round(selected.accuracy * 100)}% ·
                  LAST {selected.lastSeen ? new Date(selected.lastSeen).toLocaleDateString() : "—"}{" "}
                  · STATUS {masteryState(selected).toUpperCase()}
                </p>
                {practiceCounts && (
                  <p className="micro-label" data-testid="practice-links">
                    JLPT QUESTIONS TOUCHING THIS KANJI {practiceCounts.get(selected.item.char) ?? 0}
                  </p>
                )}
              </>
            ) : (
              <p className="empty-teach">Select a kanji to inspect its mastery record.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

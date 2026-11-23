/**
 * Progress view: annual contribution calendar + four-axis activity overview
 * (PRD §10.13 owner addition 2026-09-22) above the existing telemetry.
 * Activity is all-level and driven by one shared year selector; the study
 * level only scopes SRS/kanji content. Legacy completions survive through the
 * v6 migration with derived categories (docs/decisions.md).
 */

import { useEffect, useMemo, useState } from "react";
import { Panel } from "../../components/Panel";
import { ActivityCalendar } from "../../components/ActivityCalendar";
import { ActivityQuadrant } from "../../components/ActivityQuadrant";
import { useLevel } from "../../components/level";
import { achievements, coverageEstimate } from "../../domain/achievements";
import { MilestoneIcon } from "./MilestoneIcon";
import {
  activityRows,
  drillPracticedCount,
  masteryByItems,
  sessionSummary,
  type SessionSummary,
} from "../../storage/progressRepo";
import { dayKey, xpProgress } from "../../domain/progress";
import { srsPoolIds } from "../../components/pools";
import { srsStats, type SrsStats } from "../../storage/srsRepo";
import { loadPrefs } from "../../storage/prefs";
import { ENABLED_LEVELS, loadLevelData, loadPracticeCore } from "../../content/loaders";
import type { JlptLevel } from "../../content/ids";
import type { KanjiItem } from "../../content/models";
import { countsByDay, type ActivityRow } from "../../domain/activity";
import { countOf } from "../../domain/format";
import { orderKanjiForMap } from "../../domain/kanjiOrder";

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
  const { pools, level } = useLevel();
  // The map filters locally; only the dashboard selector changes the app level.
  const [mapLevel, setMapLevel] = useState<JlptLevel>(level);
  const [mapData, setMapData] = useState<{ level: JlptLevel; cells: KanjiCell[] } | null>(null);
  const [drillPracticed, setDrillPracticed] = useState<number | null>(null);
  const [stats, setStats] = useState<SrsStats | null>(null);
  const [sessions, setSessions] = useState<SessionSummary | null>(null);
  const [picked, setSelected] = useState<KanjiCell | null>(null);
  const [practiceCounts, setPracticeCounts] = useState<Map<string, number> | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  useEffect(() => {
    void activityRows().then(setActivity);
  }, []);

  useEffect(() => {
    if (!pools) return;
    void srsStats(srsPoolIds(pools)).then(setStats);
    void sessionSummary().then(setSessions);
    let cancelled = false;
    void drillPracticedCount([
      ...pools.kanji.map((k) => k.id),
      ...pools.vocab.map((v) => v.id),
    ]).then((n) => {
      if (!cancelled) setDrillPracticed(n);
    });
    return () => {
      cancelled = true;
    };
  }, [pools]);

  useEffect(() => {
    let cancelled = false;
    void loadPracticeCore().then((core) => {
      if (cancelled) return;
      const counts = new Map<string, number>();
      for (const rec of core[mapLevel].kanji) counts.set(rec.kanji, rec.questionCount);
      setPracticeCounts(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [mapLevel]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let items: KanjiItem[] = [];
      try {
        items = orderKanjiForMap((await loadLevelData(mapLevel)).kanji.items);
      } catch {
        items = [];
      }
      const mastery = await masteryByItems(items.map((item) => item.id));
      const next: KanjiCell[] = items.map((item) => {
        const m = mastery.get(item.id)!;
        return { item, attempts: m.attempts, accuracy: m.accuracy, lastSeen: m.lastSeen };
      });
      if (!cancelled) setMapData({ level: mapLevel, cells: next });
    })();
    return () => {
      cancelled = true;
    };
  }, [mapLevel]);

  const today = dayKey(new Date());
  const currentYear = Number(today.slice(0, 4));

  // Available years: recorded history plus the current year, newest first.
  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const row of activity) {
      const y = Number(row.date.slice(0, 4));
      if (!Number.isNaN(y)) set.add(y);
    }
    return [...set].sort((a, b) => b - a);
  }, [activity, currentYear]);

  const [year, setYear] = useState(currentYear);
  const selectedYear = years.includes(year) ? year : currentYear;

  const yearRows = useMemo(
    () => activity.filter((r) => r.date.startsWith(String(selectedYear))),
    [activity, selectedYear],
  );
  const yearByDay = useMemo(() => countsByDay(yearRows), [yearRows]);

  const progress = xpProgress(prefs.progress.xp);
  const todayXp = prefs.progress.weeklyXp[today] ?? 0;

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

  const mapLoading = !mapData || mapData.level !== mapLevel;
  const visibleCells = useMemo(
    () => (mapData && mapData.level === mapLevel ? mapData.cells : []),
    [mapData, mapLevel],
  );
  // The inspector must not outlive the level it was selected in.
  const selected = picked && visibleCells.some((c) => c.item.id === picked.item.id) ? picked : null;

  return (
    <div className="progress-page" data-testid="progress">
      <div className="page-head">
        <div>
          <h1>Your effort, taking shape.</h1>
          <p className="description">
            Every day adds up. Explore when you studied and how you spent your sessions.
          </p>
          <div className="status-strip" role="status">
            <span className="micro-label">XP {prefs.progress.xp}</span>
            <span className="micro-label">LEVEL {progress.level}</span>
            <span className="micro-label" data-testid="p-today">
              TODAY {todayXp} XP
            </span>
          </div>
        </div>
      </div>

      <section className="panel annual-panel">
        <div className="panel-head">
          <h2>Study activity</h2>
          <label className="year-select">
            Year
            <select
              data-testid="year-select"
              value={selectedYear}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ActivityCalendar
          rows={yearRows}
          startKey={`${selectedYear}-01-01`}
          endKey={`${selectedYear}-12-31`}
          todayKey={today}
        />
      </section>

      <section className="panel activity-overview">
        <div className="panel-head">
          <h2>Activity overview</h2>
          <span className="label">{selectedYear} · ALL LEVELS</span>
        </div>
        <ActivityQuadrant byDay={[...yearByDay.values()]} year={selectedYear} />
      </section>

      <div className="telemetry">
        <div className="progress-layout">
          <Panel title={`STUDY · ${level.toUpperCase()}`}>
            {stats ? (
              <>
                <div className="srs-row">
                  <span>Ready to review</span>
                  <strong className="blue">{countOf(stats.due, "card")}</strong>
                </div>
                <div className="srs-row">
                  <span>SRS cards learned</span>
                  <strong>
                    {stats.learned} / {stats.total}
                  </strong>
                </div>
                <div className="srs-row">
                  <span>Not started</span>
                  <strong>{stats.fresh}</strong>
                </div>
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
                <p className="micro-label" data-testid="srs-gauge">
                  MASTERED {stats.mastered} · LEARNING {stats.learning} · NEW {stats.fresh}
                </p>
                <div className="srs-row srs-row-split" data-testid="drill-practiced">
                  <span>Practiced in drills</span>
                  <strong>
                    {drillPracticed ?? "…"} /{" "}
                    {pools ? pools.kanji.length + pools.vocab.length : "…"}
                  </strong>
                </div>
                <div className="srs-row" data-testid="coverage">
                  <span>Covered (SRS + lessons)</span>
                  <strong>
                    {coverage > 0 && coverage < 0.01 ? "<1" : Math.round(coverage * 100)}%
                  </strong>
                </div>
              </>
            ) : (
              <p className="micro-label" role="status">
                LOADING…
              </p>
            )}
          </Panel>

          <Panel title="MILESTONES">
            <ul className="achievement-list" data-testid="achievements">
              {achievementList.map((a) => (
                <li key={a.id} className={a.unlocked ? "unlocked" : "locked"}>
                  <span className="achievement-icon">
                    <MilestoneIcon id={a.id} />
                  </span>
                  <span>
                    <b>{a.label}</b>
                    <span className="sr-only">{a.unlocked ? " (unlocked)" : " (locked)"}</span>
                    <span className="achievement-req">{a.requirement}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel
          title={`KANJI · ${mapLevel.toUpperCase()}`}
          actions={
            <div className="limit-row" role="group" aria-label="level filter">
              {LEVELS.map((l) => {
                const enabled = ENABLED_LEVELS.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={mapLevel === l}
                    disabled={!enabled}
                    onClick={() => setMapLevel(l)}
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
            {mapLoading && (
              <p className="micro-label" role="status">
                LOADING…
              </p>
            )}
            {!mapLoading && visibleCells.length === 0 && (
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
                  LAST{" "}
                  {selected.lastSeen ? new Date(selected.lastSeen).toLocaleDateString() : "Not yet"}{" "}
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

        <p className="sample-note">
          Study activity measures participation, not JLPT exam readiness.
        </p>
      </div>
    </div>
  );
}

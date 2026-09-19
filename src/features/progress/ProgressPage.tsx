import { useEffect, useState } from "react";
import { usePools } from "../../components/pools";
import { Panel } from "../../components/Panel";
import { xpProgress } from "../../domain/progress";
import { masteryByItem } from "../../storage/progressRepo";
import { srsStats } from "../../storage/srsRepo";
import { currentPrefs } from "../../storage/progressRepo";
import type { KanjiItem } from "../../content/models";

interface KanjiCell {
  item: KanjiItem;
  attempts: number;
  accuracy: number;
  lastSeen: number | null;
}

export function ProgressPage() {
  const prefs = currentPrefs();
  const pools = usePools(prefs.level);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof srsStats>> | null>(null);
  const [cells, setCells] = useState<KanjiCell[]>([]);
  const [selected, setSelected] = useState<KanjiCell | null>(null);

  useEffect(() => {
    void srsStats().then(setStats);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!pools) return;
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
  const week = Object.entries(prefs.progress.weeklyXp)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);
  const weekMax = Math.max(1, ...week.map(([, v]) => v));

  return (
    <div className="progress-page" data-testid="progress">
      <h2 className="micro-label">PROGRESS</h2>
      <div className="dash-grid">
        <Panel title="STATUS">
          <p className="micro-label">
            LEVEL {progress.level} · XP {prefs.progress.xp} · STREAK {prefs.progress.streakDays}
          </p>
          <div className="week-bars" role="img" aria-label="weekly XP">
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

        <Panel title="SRS">
          {stats ? (
            <p className="micro-label">
              DUE {stats.due} · LEARNED {stats.learned}/{stats.total} · LAPSES {stats.lapses}
            </p>
          ) : (
            <p className="micro-label">LOADING…</p>
          )}
        </Panel>

        <Panel title="KANJI MASTERY MAP">
          <div
            className="kanji-map"
            role="grid"
            aria-label="kanji mastery map"
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const idx = selected ? cells.findIndex((c) => c.item.id === selected.item.id) : -1;
              const nextIdx = e.key === "ArrowRight" ? idx + 1 : Math.max(0, idx - 1);
              if (cells[nextIdx]) setSelected(cells[nextIdx]);
            }}
          >
            {cells.map((cell) => (
              <button
                key={cell.item.id}
                type="button"
                role="gridcell"
                lang="ja"
                className={`kanji-cell ${cell.attempts === 0 ? "unseen" : cell.accuracy >= 0.8 ? "mastered" : "learning"}`}
                aria-label={`${cell.item.char}: ${cell.attempts} attempts`}
                onClick={() => setSelected(cell)}
              >
                {cell.item.char}
              </button>
            ))}
          </div>
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
                  LAST {selected.lastSeen ? new Date(selected.lastSeen).toLocaleDateString() : "—"}
                </p>
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

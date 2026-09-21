/**
 * SRS statistics page (PRD 10.12): streak, due today, learned/total, mastery
 * %, mastered/learning/not-started breakdown, kanji vs vocabulary progress,
 * and a review CTA when cards are due. Numbers are level-scoped to the active
 * level's pool, matching the review queue.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLevel } from "../../components/level";
import { Panel } from "../../components/Panel";
import { srsPoolIds } from "../../components/pools";
import { srsStats, type SrsStats } from "../../storage/srsRepo";
import { loadPrefs } from "../../storage/prefs";

export function SrsStatsPage() {
  const { pools, level } = useLevel();
  const prefs = loadPrefs();
  const [stats, setStats] = useState<SrsStats | null>(null);

  useEffect(() => {
    if (!pools) return;
    let cancelled = false;
    void srsStats(srsPoolIds(pools)).then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, [pools]);

  if (!pools || !stats) {
    return <p className="micro-label">LOADING…</p>;
  }

  const masteryPct = stats.total === 0 ? 0 : Math.round((stats.learned / stats.total) * 100);

  return (
    <div className="progress-page" data-testid="srs-stats">
      <h2 className="micro-label">SRS STATISTICS · {level.toUpperCase()}</h2>
      <div className="telemetry">
        <Panel title="AT A GLANCE">
          <p className="micro-label" data-testid="stat-streak">
            STREAK {prefs.progress.streakDays} DAY{prefs.progress.streakDays === 1 ? "" : "S"}
          </p>
          <p className="micro-label" data-testid="stat-due">
            DUE TODAY {stats.due}
          </p>
          <p className="micro-label" data-testid="stat-learned">
            LEARNED {stats.learned} / TOTAL {stats.total}
          </p>
          <p className="micro-label" data-testid="stat-mastery">
            MASTERY {masteryPct}%
          </p>
        </Panel>

        <Panel title="BREAKDOWN">
          <p className="micro-label" data-testid="stat-split">
            MASTERED {stats.mastered} · LEARNING {stats.learning} · NOT STARTED {stats.fresh}
          </p>
        </Panel>

        <Panel title="KANJI VS VOCABULARY">
          <p className="micro-label" data-testid="stat-kind">
            KANJI {stats.byKind.kanji.learned}/{stats.byKind.kanji.total} · VOCABULARY{" "}
            {stats.byKind.vocab.learned}/{stats.byKind.vocab.total}
          </p>
        </Panel>

        {stats.due > 0 && (
          <Panel title="REVIEW">
            <Link className="primary inline-cta" to="/learn/review">
              START REVIEW ({stats.due} DUE)
            </Link>
          </Panel>
        )}
      </div>
    </div>
  );
}

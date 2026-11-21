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
import { countOf } from "../../domain/format";
import { srsPoolIds } from "../../components/pools";
import { srsStats, type SrsStats } from "../../storage/srsRepo";
import { loadPrefs } from "../../storage/prefs";

export function SrsStatsPage() {
  const { pools } = useLevel();
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
    return (
      <div className="route-state" role="status">
        <p>Loading SRS statistics…</p>
      </div>
    );
  }

  const masteryPct = stats.total === 0 ? 0 : Math.round((stats.learned / stats.total) * 100);

  return (
    <div className="progress-page" data-testid="srs-stats">
      <div className="page-head">
        <div>
          <h1>SRS statistics.</h1>
          <p className="description">
            Scheduler counts for the active level, not an exam-readiness estimate.
          </p>
        </div>
      </div>
      <div className="telemetry">
        <Panel title="AT A GLANCE">
          <div className="srs-row" data-testid="stat-streak">
            <span>Streak</span>
            <strong>{countOf(prefs.progress.streakDays, "day")}</strong>
          </div>
          <div className="srs-row" data-testid="stat-due">
            <span>Due today</span>
            <strong>{countOf(stats.due, "card")}</strong>
          </div>
          <div className="srs-row" data-testid="stat-learned">
            <span>Learned</span>
            <strong>
              {stats.learned} / {stats.total}
            </strong>
          </div>
          <div className="srs-row" data-testid="stat-mastery">
            <span>Mastery</span>
            <strong>{masteryPct}%</strong>
          </div>
        </Panel>

        <Panel title="BREAKDOWN">
          <div
            className="split-bar"
            role="img"
            aria-label={`mastered ${stats.mastered}, learning ${stats.learning}, not started ${stats.fresh}`}
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
          <p className="micro-label" data-testid="stat-split">
            Mastered {stats.mastered} · Learning {stats.learning} · Not started {stats.fresh}
          </p>
        </Panel>

        <Panel title="KANJI VS VOCABULARY">
          <div data-testid="stat-kind">
            <div className="srs-row">
              <span>Kanji</span>
              <strong>
                {stats.byKind.kanji.learned} / {stats.byKind.kanji.total}
              </strong>
            </div>
            <div className="srs-row">
              <span>Vocabulary</span>
              <strong>
                {stats.byKind.vocab.learned} / {stats.byKind.vocab.total}
              </strong>
            </div>
          </div>
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

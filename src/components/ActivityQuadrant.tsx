/**
 * Four-axis participation overview (PRD §10.13): Drills left, SRS Review
 * top, JLPT right, Grammar bottom. Fixed 0–100% axes scaled equally from the
 * center; shares come from the same year's completions as the calendar. Zero
 * sessions means zero counts and 0% labels with an honest empty message and
 * no polygon. This is participation distribution, never mastery.
 */

import { ACTIVITY_CATEGORIES, categoryTotals, type DayCounts } from "../domain/activity";

const CATEGORY_LABELS: Record<(typeof ACTIVITY_CATEGORIES)[number], string> = {
  drill: "Drills",
  srs: "SRS Review",
  grammar: "Grammar",
  jlpt: "JLPT",
};

const SCALE = 1.45;
const CX = 220;
const CY = 185;

export function ActivityQuadrant({ byDay, year }: { byDay: DayCounts[]; year: number }) {
  const { counts, total, shares } = categoryTotals(byDay);
  // [Drills left, SRS top, Grammar bottom, JLPT right] per the PRD axis map.
  const points = [
    [CX - shares.drill * SCALE, CY],
    [CX, CY - shares.srs * SCALE],
    [CX, CY + shares.grammar * SCALE],
    [CX + shares.jlpt * SCALE, CY],
  ];
  const largest = ACTIVITY_CATEGORIES.reduce(
    (best, c) => (counts[c] > counts[best] ? c : best),
    ACTIVITY_CATEGORIES[0],
  );

  return (
    <div className="quadrant-layout">
      <div>
        <h3>Your study mix</h3>
        <p className="description">
          {total
            ? `${CATEGORY_LABELS[largest]} makes up the largest share of your ${total} completed sessions.`
            : "No completed sessions in this period yet."}
        </p>
        <dl className="activity-breakdown">
          {ACTIVITY_CATEGORIES.map((c) => (
            <div key={c}>
              <dt>{CATEGORY_LABELS[c]}</dt>
              <dd>
                {counts[c]} sessions <strong>{shares[c].toFixed(1)}%</strong>
              </dd>
            </div>
          ))}
        </dl>
        <p className="sample-note">
          A picture of how you practice, not a skill score. There is no ideal shape to aim for.
        </p>
      </div>
      <svg
        className="quadrant"
        viewBox="0 0 440 370"
        role="img"
        aria-label={`Study mix: ${ACTIVITY_CATEGORIES.map(
          (c) => `${CATEGORY_LABELS[c]} ${shares[c].toFixed(1)} percent`,
        ).join(", ")}`}
      >
        <path className="quadrant-axis" d="M75 185H365 M220 40V330" />
        {total > 0 && (
          <>
            <polygon className="quadrant-area" points={points.map((p) => p.join(",")).join(" ")} />
            {points.map((p, i) => (
              <circle key={i} className="quadrant-point" cx={p[0]} cy={p[1]} r="4" />
            ))}
          </>
        )}
        <text x={CX} y="17" textAnchor="middle">
          {shares.srs.toFixed(1)}% SRS Review
        </text>
        <text x="12" y="166">
          {shares.drill.toFixed(1)}%
        </text>
        <text x="12" y="184">
          Drills
        </text>
        <text x="428" y="166" textAnchor="end">
          {shares.jlpt.toFixed(1)}%
        </text>
        <text x="428" y="184" textAnchor="end">
          JLPT
        </text>
        <text x={CX} y="356" textAnchor="middle">
          {shares.grammar.toFixed(1)}% Grammar
        </text>
      </svg>
      <span className="sr-only">Year {year}</span>
    </div>
  );
}

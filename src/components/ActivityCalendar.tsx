/**
 * Contribution calendar (PRD §10.13): one square per local calendar day,
 * seven Sunday–Saturday rows, week columns, month labels, fixed 0/1/2/3/4+
 * intensity bins. Shared by Home (91-day window) and Progress (selected
 * year). Keyboard: one tab stop per calendar, arrow keys move days. Days
 * expose date and exact count without color alone; selection reveals the
 * category breakdown. Future days are unavailable, never recorded.
 */

import { useRef, useState } from "react";
import {
  ACTIVITY_CATEGORIES,
  buildCalendarGrid,
  categoryTotals,
  countsByDay,
  dayBin,
  type ActivityRow,
} from "../domain/activity";
import type { DayKey } from "../domain/progress";

const CATEGORY_LABELS: Record<(typeof ACTIVITY_CATEGORIES)[number], string> = {
  drill: "Drills",
  srs: "SRS Review",
  grammar: "Grammar",
  jlpt: "JLPT",
};

export function ActivityCalendar({
  rows,
  startKey,
  endKey,
  todayKey,
  compact,
}: {
  rows: ActivityRow[];
  startKey: DayKey;
  endKey: DayKey;
  todayKey: DayKey;
  compact?: boolean;
}) {
  const grid = buildCalendarGrid(startKey, endKey);
  const byDay = countsByDay(rows.filter((r) => r.date >= startKey && r.date <= endKey));
  const totals = categoryTotals(byDay.values());
  const [selected, setSelected] = useState<DayKey | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  function move(current: DayKey, delta: number): void {
    const order: DayKey[] = [];
    for (const week of grid.weeks) {
      for (const cell of week) if (cell) order.push(cell);
    }
    const idx = order.indexOf(current);
    if (idx === -1) return;
    const next = order[idx + delta];
    if (!next) return;
    const container = layoutRef.current;
    if (!container) return;
    const nextEl = container.querySelector<HTMLButtonElement>(`[data-day="${next}"]`);
    if (!nextEl || nextEl.disabled) return;
    container.querySelectorAll<HTMLButtonElement>("[data-day]").forEach((el) => (el.tabIndex = -1));
    nextEl.tabIndex = 0;
    nextEl.focus();
  }

  const focusKey = selected ?? (todayKey >= startKey && todayKey <= endKey ? todayKey : startKey);

  const monthByWeek = new Map<number, string>();
  for (const m of grid.months) monthByWeek.set(m.week, m.label);

  const selectedCounts = selected ? byDay.get(selected) : undefined;
  const selectedTotal = selectedCounts
    ? ACTIVITY_CATEGORIES.reduce((sum, c) => sum + selectedCounts[c], 0)
    : 0;
  const activeDays = [...byDay.values()].filter((c) =>
    ACTIVITY_CATEGORIES.some((k) => c[k] > 0),
  ).length;

  return (
    <div className={`activity-calendar ${compact ? "compact" : "annual"}`}>
      <div className="activity-caption">
        <strong>{totals.total} sessions</strong>
        <span>{compact ? "Last 13 weeks" : startKey.slice(0, 4)} · all levels</span>
      </div>
      <div className="heat-scroll" role="group" aria-label="Study activity calendar">
        <div
          className="heat-layout"
          ref={(el) => {
            layoutRef.current = el;
            el?.style.setProperty("--weeks", String(grid.weeks.length));
          }}
        >
          <div className="heat-months" aria-hidden="true">
            {grid.weeks.map((_, w) => (
              <span key={w}>{monthByWeek.get(w) ?? ""}</span>
            ))}
          </div>
          <div className="heat-days" aria-hidden="true">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="heat-grid" data-testid={compact ? "calendar-compact" : "calendar-annual"}>
            {grid.weeks.flat().map((key, i) => {
              if (!key) {
                return <span key={`pad-${i}`} className="heat-cell padding" aria-hidden="true" />;
              }
              const future = key > todayKey;
              const counts = byDay.get(key);
              const total = counts ? ACTIVITY_CATEGORIES.reduce((sum, c) => sum + counts[c], 0) : 0;
              const label = `${key}: ${future ? "future date" : `${total} completed sessions`}`;
              return (
                <button
                  key={key}
                  type="button"
                  data-day={key}
                  className={`heat-cell heat-${dayBin(total)}${future ? " future" : ""}`}
                  title={label}
                  aria-label={label}
                  aria-pressed={selected === key}
                  tabIndex={key === focusKey ? 0 : -1}
                  disabled={future}
                  onClick={() => setSelected(key)}
                  onKeyDown={(e) => {
                    const delta =
                      e.key === "ArrowUp"
                        ? -1
                        : e.key === "ArrowDown"
                          ? 1
                          : e.key === "ArrowLeft"
                            ? -7
                            : e.key === "ArrowRight"
                              ? 7
                              : undefined;
                    if (delta === undefined) return;
                    e.preventDefault();
                    move(key, delta);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="heat-footer">
        <span>{activeDays} active days</span>
        <span className="heat-legend">
          Less{" "}
          {[0, 1, 2, 3, 4].map((n) => (
            <i key={n} className={`heat-cell heat-${n}`} title={`${n === 4 ? "4+" : n} sessions`} />
          ))}{" "}
          More
        </span>
      </div>
      <p className="day-detail" role="status">
        {selected
          ? `${selected} · ${selectedTotal} sessions${
              selectedCounts
                ? ` — ${ACTIVITY_CATEGORIES.map(
                    (c) => `${CATEGORY_LABELS[c]}: ${selectedCounts[c]}`,
                  ).join(" · ")}`
                : " — No study recorded."
            }`
          : "Select a day to see its activity."}
      </p>
    </div>
  );
}

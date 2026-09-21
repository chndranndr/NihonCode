/**
 * JLPT practice hub (PRD 10.17): the active level's categories and numbered
 * local sets, per-set progress from storage, live categories only. Listening
 * and reading stay behind honest locked panels until the owner decisions land
 * (docs/decisions.md); nothing dead, nothing faked.
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLevel } from "../../components/level";
import { LockedPanel, Panel } from "../../components/Panel";
import { LIVE_JLPT_CATEGORIES, loadJlptLevel, type JlptPool } from "../../content/loaders";
import type { JlptCategory } from "../../content/models";
import { jlptProgressMap } from "../../storage/jlptRepo";

const CATEGORY_LABELS: Record<JlptCategory, string> = {
  grammar: "GRAMMAR",
  kanji: "KANJI",
  listening: "LISTENING",
  reading: "READING",
  vocabulary: "VOCABULARY",
};

export function JlptPage() {
  const { level } = useLevel();
  const { category = "" } = useParams();
  const [pool, setPool] = useState<JlptPool | null>(null);
  const [progress, setProgress] = useState<Map<
    string,
    { bestCorrect: number; total: number }
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadJlptLevel(level), jlptProgressMap()]).then(([p, prog]) => {
      if (cancelled) return;
      setPool(p);
      setProgress(prog);
    });
    return () => {
      cancelled = true;
    };
  }, [level]);

  if (!pool || !progress) {
    return <p className="micro-label">LOADING…</p>;
  }

  const cat = LIVE_JLPT_CATEGORIES.find((c) => c === category) ?? null;

  if (cat) {
    const sets = pool[cat].items;
    return (
      <div className="jlpt-page" data-testid="jlpt-sets">
        <h2 className="micro-label">
          {level.toUpperCase()} · {CATEGORY_LABELS[cat]} SETS
        </h2>
        <ul className="set-list">
          {sets.map((s) => {
            const prog = progress.get(`jlpt:${level}:${cat}:${s.setNumber}`);
            return (
              <li key={s.setNumber}>
                <Link to={`/learn/jlpt/${cat}/${s.setNumber}`} data-testid="set-link">
                  <span>{`EXERCISE ${String(s.setNumber).padStart(2, "0")}`}</span>
                  <span className="micro-label">
                    {s.questions.length} QUESTIONS
                    {prog ? ` · BEST ${prog.bestCorrect}/${prog.total}` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link to="/learn/jlpt">← ALL CATEGORIES</Link>
      </div>
    );
  }

  return (
    <div className="jlpt-page" data-testid="jlpt">
      <h2 className="micro-label">JLPT PRACTICE · {level.toUpperCase()}</h2>
      <div className="dash-grid">
        {LIVE_JLPT_CATEGORIES.map((c) => {
          const sets = pool[c].items;
          const questions = sets.reduce((n, s) => n + s.questions.length, 0);
          return (
            <Panel key={c} title={CATEGORY_LABELS[c]}>
              <p className="micro-label">
                {sets.length} SETS · {questions} QUESTIONS
              </p>
              <Link to={`/learn/jlpt/${c}`}>
                {questions > 0 ? "BROWSE SETS" : "NO SETS AT THIS LEVEL"}
              </Link>
            </Panel>
          );
        })}
        <LockedPanel
          title="LISTENING"
          reason="Locked: the bundled audio's per-question correspondence is unconfirmed (all files are concatenation candidates). Ships once the owner confirms the listening sample."
        />
        <LockedPanel
          title="READING"
          reason="Locked: every N5/N4 reading question references a dropped remote-image passage. Ships per the owner's keep+restore-text vs exclude decision."
        />
      </div>
    </div>
  );
}

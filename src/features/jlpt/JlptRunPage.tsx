/**
 * One JLPT set run (PRD 10.17): multiple-choice grading over keyed questions
 * only, per-set progress persisted on completion. XP follows the drill rules
 * (correct + perfect bonus).
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLevel } from "../../components/level";
import { loadJlptLevel, type JlptPool } from "../../content/loaders";
import type { JlptCategory, JlptSet } from "../../content/models";
import { perfectDrillBonus, XP } from "../../domain/progress";
import { awardXp, recordSession } from "../../storage/progressRepo";
import { recordJlptResult } from "../../storage/jlptRepo";

const LABEL = "ABCDEFGH";

export function JlptRunPage() {
  const { level } = useLevel();
  const { category = "", setNumber = "" } = useParams();
  const navigate = useNavigate();
  const [pool, setPool] = useState<JlptPool | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadJlptLevel(level).then((p) => {
      if (!cancelled) setPool(p);
    });
    return () => {
      cancelled = true;
    };
  }, [level]);

  const set: JlptSet | null = useMemo(() => {
    if (!pool) return null;
    const cat = pool[category as JlptCategory];
    if (!cat) return null;
    return cat.items.find((s) => String(s.setNumber) === setNumber) ?? null;
  }, [pool, category, setNumber]);

  if (!pool || !set) {
    return <p className="micro-label">SET NOT FOUND OR STILL LOADING…</p>;
  }

  const question = set.questions[index];
  const active = set;

  async function choose(i: number): Promise<void> {
    if (chosen !== null) return;
    setChosen(i);
    const correct = i === question.answerIndex;
    if (correct) setCorrectCount((c) => c + 1);
  }

  async function advance(): Promise<void> {
    if (index + 1 >= active.questions.length) {
      const correct = correctCount;
      awardXp(correct * XP.drillCorrect + perfectDrillBonus(correct, active.questions.length));
      await recordSession("jlpt", correct, active.questions.length);
      await recordJlptResult(level, category, active.setNumber, correct, active.questions.length);
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setChosen(null);
  }

  if (finished) {
    const pct =
      set.questions.length === 0 ? 0 : Math.round((correctCount / set.questions.length) * 100);
    return (
      <div className="session" data-testid="summary">
        <h2 className="micro-label">SET COMPLETE</h2>
        <p className="summary-score" data-testid="summary-score">
          {pct}%
        </p>
        <p className="micro-label">
          {correctCount}/{set.questions.length} CORRECT
        </p>
        <div className="summary-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              setIndex(0);
              setChosen(null);
              setCorrectCount(0);
              setFinished(false);
            }}
          >
            RETRY
          </button>
          <button type="button" onClick={() => navigate(`/learn/jlpt/${category}`)}>
            ALL SETS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="session" data-testid="session">
      <div className="session-rail" role="status">
        <span className="micro-label">
          {level.toUpperCase()} {category.toUpperCase()} {set.setNumber}
        </span>
        <span className="micro-label">
          {index + 1}/{set.questions.length}
        </span>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={set.questions.length}
          aria-valuenow={index + 1}
          aria-label={`question ${index + 1} of ${set.questions.length}`}
        >
          <div
            className="progress-fill"
            ref={(el) => {
              el?.style.setProperty("--fill", `${((index + 1) / set.questions.length) * 100}%`);
            }}
          />
        </div>
      </div>

      <div className="prompt-plate panel">
        <p className="prompt-text" lang="ja">
          {question.prompt}
        </p>
      </div>

      <div className="option-list" role="radiogroup" aria-label="choices">
        {question.options.map((opt, i) => {
          const isCorrect = chosen !== null && i === question.answerIndex;
          const isWrongPick = chosen === i && i !== question.answerIndex;
          return (
            <button
              key={i}
              type="button"
              className={`option ${isCorrect ? "ok" : ""} ${isWrongPick ? "miss" : ""}`}
              aria-pressed={chosen === i}
              disabled={chosen !== null}
              onClick={() => void choose(i)}
            >
              <span aria-hidden="true">{LABEL[i]}.</span> <span lang="ja">{opt}</span>
            </button>
          );
        })}
      </div>

      {chosen !== null && (
        <div className="reveal panel" data-testid="reveal">
          <p className={`reveal-verdict ${chosen === question.answerIndex ? "ok" : "miss"}`}>
            {chosen === question.answerIndex ? "CORRECT" : "WRONG"}
          </p>
          {chosen !== question.answerIndex && (
            <p className="reveal-accepted" lang="ja">
              answer: {question.answerText}
            </p>
          )}
          <button type="button" className="primary" onClick={() => void advance()}>
            {index + 1 >= set.questions.length ? "FINISH" : "NEXT"}
          </button>
        </div>
      )}
    </div>
  );
}

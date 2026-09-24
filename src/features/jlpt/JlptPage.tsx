/**
 * JLPT practice hub (PRD 10.17, redesign 2026-09-22, data-recon 2026-09-23):
 * the active level's five categories and numbered local sets with per-set
 * progress. Reading and listening ship now that passages, questions, and
 * local media are restored (docs/decisions.md 2026-09-23).
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLevel } from "../../components/level";
import { LIVE_JLPT_CATEGORIES, loadJlptLevel, type JlptPool } from "../../content/loaders";
import { jlptProgressMap } from "../../storage/jlptRepo";

const CATEGORY_META: Record<string, { glyph: string; label: string; desc: string; route: string }> =
  {
    grammar: { glyph: "文", label: "Grammar", desc: "Sentence patterns", route: "grammar" },
    kanji: { glyph: "漢", label: "Kanji", desc: "Character readings", route: "kanji" },
    vocabulary: { glyph: "語", label: "Vocabulary", desc: "Word meanings", route: "vocabulary" },
    reading: { glyph: "読", label: "Reading", desc: "Passages and questions", route: "reading" },
    listening: { glyph: "聴", label: "Listening", desc: "Audio exercises", route: "listening" },
  };

export function JlptPage() {
  const { level } = useLevel();
  const { category = "" } = useParams();
  const navigate = useNavigate();
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
      setProgress(
        new Map(
          [...prog.entries()].map(([id, row]) => [
            id,
            { bestCorrect: row.bestCorrect, total: row.total },
          ]),
        ),
      );
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
    const meta = CATEGORY_META[cat];
    const sets = pool[cat].items;
    return (
      <div className="jlpt-page" data-testid="jlpt-sets">
        <button className="back" type="button" onClick={() => navigate("/learn/jlpt")}>
          ← All categories
        </button>
        <div className="page-head">
          <div>
            <p className="label">
              キタ / {level.toUpperCase()} · {meta.label.toUpperCase()}
            </p>
            <h1>{meta.label} sets</h1>
            <p className="description">
              {sets.length} sets · work through each question, then review your answers.
            </p>
          </div>
        </div>
        <div>
          {sets.map((s) => {
            const prog = progress.get(`jlpt:${level}:${cat}:${s.setNumber}`);
            return (
              <Link
                key={s.setNumber}
                className="jlpt-set"
                data-testid="set-link"
                to={`/learn/jlpt/${cat}/${s.setNumber}`}
              >
                <span lang="ja" aria-hidden="true">
                  {meta.glyph}
                </span>
                <span>
                  <b>{`Exercise ${String(s.setNumber).padStart(2, "0")}`}</b>
                  <small>
                    {s.questions.length} questions
                    {prog ? ` · BEST ${prog.bestCorrect}/${prog.total}` : ""}
                  </small>
                </span>
                <span className="micro-label">{prog ? "COMPLETED" : "NOT ATTEMPTED"}</span>
              </Link>
            );
          })}
          {sets.length === 0 && (
            <p className="empty">No {meta.label.toLowerCase()} sets at this level yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="jlpt-page" data-testid="jlpt">
      <button className="back" type="button" onClick={() => navigate("/learn")}>
        ← Learning library
      </button>
      <div className="page-head">
        <div>
          <p className="label">キタ / {level.toUpperCase()} STUDY</p>
          <h1>JLPT practice.</h1>
          <p className="description">
            Choose a category and a set. Work through each question, then review your answers.
          </p>
        </div>
      </div>
      <div className="jlpt-categories" aria-label="JLPT category">
        {LIVE_JLPT_CATEGORIES.map((c) => {
          const meta = CATEGORY_META[c];
          const sets = pool[c].items;
          const questions = sets.reduce((n, s) => n + s.questions.length, 0);
          return (
            <button
              key={c}
              type="button"
              data-testid={`jlpt-category-${c}`}
              onClick={() => navigate(`/learn/jlpt/${c}`)}
              aria-pressed={false}
            >
              <span lang="ja">{meta.glyph}</span>
              <b>{meta.label}</b>
              <small>
                {meta.desc} · {questions} questions
              </small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

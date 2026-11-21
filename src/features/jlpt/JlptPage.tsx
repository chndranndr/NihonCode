/**
 * JLPT practice hub (PRD 10.17, redesign 2026-09-22, data-recon 2026-09-23):
 * the active level's five categories and numbered local sets with per-set
 * progress. Reading and listening ship now that passages, questions, and
 * local media are restored (docs/decisions.md 2026-09-23).
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLevel } from "../../components/level";
import type { JlptLevel } from "../../content/ids";
import { LIVE_JLPT_CATEGORIES, loadJlptLevel, type JlptPool } from "../../content/loaders";
import { jlptProgressMap } from "../../storage/jlptRepo";
import { countOf } from "../../domain/format";

interface JlptLoadState {
  level: JlptLevel;
  pool: JlptPool | null;
  progress: Map<string, { bestCorrect: number; total: number }> | null;
  error: boolean;
}

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
  const [load, setLoad] = useState<JlptLoadState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadJlptLevel(level), jlptProgressMap()])
      .then(([p, prog]) => {
        if (cancelled) return;
        setLoad({
          level,
          pool: p,
          progress: new Map(
            [...prog.entries()].map(([id, row]) => [
              id,
              { bestCorrect: row.bestCorrect, total: row.total },
            ]),
          ),
          error: false,
        });
      })
      .catch(() => {
        if (!cancelled) setLoad({ level, pool: null, progress: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [level]);

  const current = load?.level === level ? load : null;
  const pool = current?.pool ?? null;
  const progress = current?.progress ?? null;
  const error = current?.error ?? false;

  if (error) {
    return (
      <section className="route-state panel" role="alert">
        <h1>JLPT practice could not be loaded.</h1>
        <p className="description">The rest of your study workspace is still available.</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          RETRY
        </button>
      </section>
    );
  }

  if (!pool || !progress) {
    return (
      <div className="route-state" role="status">
        <p>Loading JLPT practice…</p>
      </div>
    );
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
                    {countOf(s.questions.length, "question")}
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
      <div className="jlpt-categories" role="group" aria-label="JLPT categories">
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
            >
              <span lang="ja">{meta.glyph}</span>
              <b>{meta.label}</b>
              <small>
                {meta.desc} · {countOf(questions, "question")}
              </small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

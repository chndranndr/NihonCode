/**
 * Grammar lesson (redesign 2026-09-22): a readable lesson column with the
 * curated pattern, explanation, examples and quiz. Completion contributes one
 * activity session per run via a stable id; re-saving the same completion is
 * a no-op (PRD §10.13). Resume position and completed status persist.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SpeakerButton } from "../../components/SpeakerButton";
import { useLevel } from "../../components/level";
import { XP, isStrongScore } from "../../domain/progress";
import { awardXp, newSessionId, recordSession } from "../../storage/progressRepo";
import { db } from "../../storage/db";
import { grammarLessonId } from "../../content/ids";
import { countOf } from "../../domain/format";
import { stripFurigana } from "../../domain/furigana";
import { Furigana } from "../../components/Furigana";

export function GrammarLessonPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const { pools, level } = useLevel();
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const [summary, setSummary] = useState<{ correct: number; total: number; xp: number } | null>(
    null,
  );
  // Stable per lesson mount: a re-render or double FINISH re-saving the same
  // completion is a no-op (PRD §10.13); a fresh visit retries from scratch.
  const sessionIdRef = useRef("");

  const lesson = pools?.grammar.find((l) => l.lessonId === lessonId) ?? null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await db().grammarState.get(grammarLessonId(level, lessonId));
      if (cancelled) return;
      if (state && state.status === "in-progress") setQuizIndex(state.resumeQuizIndex);
      setResumed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, level]);

  // Persist only after the resume load has resolved; otherwise the mount-time
  // write clobbers the stored index back to 0 before the read lands.
  useEffect(() => {
    if (!lesson || !resumed) return;
    void db().grammarState.put({
      id: lesson.id,
      status: answers.length === lesson.quiz.length ? "completed" : "in-progress",
      resumeQuizIndex: quizIndex,
      completedAt: answers.length === lesson.quiz.length ? Date.now() : null,
    });
  }, [lesson, quizIndex, answers.length, resumed]);

  if (!lesson) {
    return <p className="micro-label">LESSON NOT FOUND OR NOT ENABLED</p>;
  }
  const active = lesson;

  const question = active.quiz[quizIndex];
  const firstExample = active.examples[0];
  const lessons = pools?.grammar ?? [];
  const nextLesson = lessons[lessons.findIndex((l) => l.lessonId === lessonId) + 1] ?? null;

  if (summary) {
    const pct = summary.total === 0 ? 0 : Math.round((summary.correct / summary.total) * 100);
    return (
      <div className="results" data-testid="summary">
        <div className="page-head">
          <div>
            <h1>Lesson complete.</h1>
            <p className="description" lang="ja">
              {active.title}
            </p>
          </div>
        </div>
        <div className="result-head">
          <div className={`result-score${isStrongScore(pct) ? " strong" : ""}`}>
            <span data-testid="summary-score">{pct}%</span>
            <small>accuracy</small>
          </div>
          <div className="result-metrics">
            <div>
              <strong>
                {summary.correct} / {summary.total}
              </strong>
              <span>correct answers</span>
            </div>
            <div>
              <strong data-testid="summary-xp">+{summary.xp}</strong>
              <span>XP earned</span>
            </div>
          </div>
        </div>
        <div className="summary-actions">
          {nextLesson && (
            <button
              type="button"
              className="primary"
              onClick={() => navigate(`/learn/grammar/${nextLesson.lessonId}`)}
            >
              NEXT LESSON
            </button>
          )}
          <button
            type="button"
            className={nextLesson ? "" : "primary"}
            onClick={() => navigate("/learn")}
          >
            BACK TO LIBRARY
          </button>
        </div>
      </div>
    );
  }

  function choose(choice: string): void {
    if (revealed !== null) return;
    setRevealed(choice);
    setAnswers((prev) => [...prev, choice === question.answer]);
  }

  async function next(): Promise<void> {
    setRevealed(null);
    if (quizIndex + 1 >= active.quiz.length) {
      const correctCount = answers.filter(Boolean).length;
      if (!sessionIdRef.current) sessionIdRef.current = newSessionId("grammar");
      const inserted = await recordSession(
        sessionIdRef.current,
        "grammar",
        correctCount,
        active.quiz.length,
      );
      if (inserted) awardXp(XP.grammarQuiz);
      void db().grammarState.put({
        id: active.id,
        status: "completed",
        resumeQuizIndex: 0,
        completedAt: Date.now(),
      });
      setSummary({
        correct: correctCount,
        total: active.quiz.length,
        xp: inserted ? XP.grammarQuiz : 0,
      });
      return;
    }
    setQuizIndex(quizIndex + 1);
  }

  return (
    <article className="grammar" data-testid="lesson">
      <button className="back" type="button" onClick={() => navigate("/learn")}>
        ← Grammar library
      </button>
      <div className="page-head">
        <div>
          <h1 lang="ja">{active.title}</h1>
          <p className="micro-label page-meta">Grammar · {active.category}</p>
        </div>
      </div>

      <div className="grammar-layout">
        <div className="reading">
          <p>{active.explanation}</p>
          <div className="formula">
            <em lang="ja">{active.pattern}</em>
          </div>

          <h2 id="examples">See it in a sentence</h2>
          {active.examples.map((e, i) => (
            <div className="example" key={e.jp}>
              <div className="example-copy">
                <p className="jp" lang="ja">
                  <Furigana text={e.jp} />
                </p>
                <p className="roman">{e.romaji}</p>
                <p>{e.en}</p>
              </div>
              <SpeakerButton text={stripFurigana(e.jp)} label={`example ${i + 1}`} />
            </div>
          ))}

          {question && (
            <div className="quiz panel" data-testid="quiz">
              <p className="micro-label">
                QUIZ {quizIndex + 1}/{active.quiz.length}
              </p>
              <p className="quiz-prompt" lang="ja">
                <Furigana text={question.prompt} />
              </p>
              <div className="quiz-choices" role="group" aria-label="answer choices">
                {question.choices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={revealed === c ? (c === question.answer ? "ok" : "miss") : ""}
                    onClick={() => choose(c)}
                    lang="ja"
                  >
                    <Furigana text={c} />
                  </button>
                ))}
              </div>
              {revealed !== null && (
                <button type="button" className="primary" onClick={next}>
                  {quizIndex + 1 >= active.quiz.length ? "FINISH" : "NEXT"}
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="grammar-aside">
          <div>
            <p className="label">In this lesson</p>
            <p className="muted">
              {firstExample ? <Furigana text={firstExample.jp} /> : active.pattern}
            </p>
          </div>
          <div>
            <p className="label">Pattern</p>
            <p className="muted" lang="ja">
              {active.pattern}
            </p>
          </div>
          <div>
            <p className="label">Progress</p>
            <p className="muted">
              {answers.length} of {countOf(active.quiz.length, "question")} answered
            </p>
          </div>
          <button className="back" type="button" onClick={() => navigate("/learn")}>
            ← Back to library
          </button>
        </aside>
      </div>
    </article>
  );
}

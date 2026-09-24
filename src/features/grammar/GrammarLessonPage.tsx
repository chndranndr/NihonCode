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
import { XP } from "../../domain/progress";
import { awardXp, newSessionId, recordSession } from "../../storage/progressRepo";
import { db } from "../../storage/db";
import { grammarLessonId } from "../../content/ids";

export function GrammarLessonPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const { pools, level } = useLevel();
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
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
      if (!inserted) return;
      awardXp(XP.grammarQuiz);
      void db().grammarState.put({
        id: active.id,
        status: "completed",
        resumeQuizIndex: 0,
        completedAt: Date.now(),
      });
      navigate("/learn");
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
          <p className="label">
            {level.toUpperCase()} GRAMMAR · {active.category}
          </p>
          <h1 lang="ja">{active.title}</h1>
        </div>
      </div>

      <div className="grammar-layout">
        <div className="reading">
          <p>{active.explanation}</p>
          <div className="formula">
            <em lang="ja">{active.pattern}</em>
          </div>

          <h2 id="examples">See it in a sentence</h2>
          {active.examples.map((e) => (
            <div className="example" key={e.jp}>
              <p className="jp" lang="ja">
                {e.jp}
              </p>
              <p className="roman">{e.romaji}</p>
              <p>{e.en}</p>
              <SpeakerButton text={e.jp} label="example" />
            </div>
          ))}

          {question && (
            <div className="quiz panel" data-testid="quiz">
              <p className="micro-label">
                QUIZ {quizIndex + 1}/{active.quiz.length}
              </p>
              <p className="quiz-prompt" lang="ja">
                {question.prompt}
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
                    {c}
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
            <p className="muted">{firstExample ? firstExample.jp : active.pattern}</p>
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
              {answers.length} of {active.quiz.length} questions answered
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

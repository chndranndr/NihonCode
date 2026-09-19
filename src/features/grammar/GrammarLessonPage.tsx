import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SpeakerButton } from "../../components/SpeakerButton";
import { usePools } from "../../components/pools";
import { XP } from "../../domain/progress";
import { awardXp } from "../../storage/progressRepo";
import { db } from "../../storage/db";
import { currentPrefs } from "../../storage/progressRepo";

export function GrammarLessonPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const prefs = currentPrefs();
  const pools = usePools(prefs.level);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  const lesson = pools?.grammar.find((l) => l.lessonId === lessonId) ?? null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await db().grammarState.get(`grammar:${prefs.level}:${lessonId}`);
      if (cancelled) return;
      if (state && state.status === "in-progress") setQuizIndex(state.resumeQuizIndex);
      setResumed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, prefs.level]);

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

  function choose(choice: string): void {
    if (revealed !== null) return;
    setRevealed(choice);
    setAnswers((prev) => [...prev, choice === question.answer]);
  }

  function next(): void {
    setRevealed(null);
    if (quizIndex + 1 >= active.quiz.length) {
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
    <article className="lesson" data-testid="lesson">
      <h2 className="lesson-title">{lesson.title}</h2>
      <p className="micro-label">{lesson.pattern}</p>
      <p className="lesson-explanation">{lesson.explanation}</p>

      <ul className="lesson-examples">
        {lesson.examples.map((e) => (
          <li key={e.jp}>
            <span lang="ja">{e.jp}</span>
            <span className="example-romaji">{e.romaji}</span>
            <span className="example-en">{e.en}</span>
            <SpeakerButton text={e.jp} label="example" />
          </li>
        ))}
      </ul>

      {question && (
        <div className="quiz panel" data-testid="quiz">
          <p className="micro-label">
            QUIZ {quizIndex + 1}/{lesson.quiz.length}
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
              {quizIndex + 1 >= lesson.quiz.length ? "FINISH" : "NEXT"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * One JLPT set run (PRD 10.17, redesign 2026-09-22, data-recon 2026-09-23):
 * multiple-choice grading over keyed questions only, per-set progress
 * persisted on completion, XP follows the drill rules. Reading renders the
 * linked passage; listening plays the bound audio slice (set track when the
 * per-question binding lacks evidence); explanations surface after answering.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLevel } from "../../components/level";
import { assetUrl } from "../../content/assets";
import { loadJlptLevel, type JlptPool } from "../../content/loaders";
import type { JlptCategory, JlptSet } from "../../content/models";
import { perfectDrillBonus, XP } from "../../domain/progress";
import { awardXp, newSessionId, recordSession } from "../../storage/progressRepo";
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
  const [confirmExit, setConfirmExit] = useState(false);
  // Stable per run: retries take a fresh id; duplicate FINISH is a no-op.
  const sessionIdRef = useRef(newSessionId("jlpt"));

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
  const passage = question.passageId
    ? (set.passages.find((p) => p.id === question.passageId) ?? null)
    : null;
  const questionAudioSrc = question.audio ? assetUrl(question.audio.localPath) : null;
  const setAudioSrc =
    !questionAudioSrc && set.audio.length > 0 ? assetUrl(set.audio[0].localPath) : null;

  function choose(i: number): void {
    if (chosen !== null) return;
    setChosen(i);
    if (i === question.answerIndex) setCorrectCount((c) => c + 1);
  }

  async function advance(): Promise<void> {
    if (index + 1 >= active.questions.length) {
      const correct = correctCount;
      const inserted = await recordSession(
        sessionIdRef.current,
        "jlpt",
        correct,
        active.questions.length,
      );
      if (!inserted) return;
      awardXp(correct * XP.drillCorrect + perfectDrillBonus(correct, active.questions.length));
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
      <div className="results" data-testid="summary">
        <div className="page-head">
          <div>
            <p className="label">
              キタ / {level.toUpperCase()} · {category.toUpperCase()} · SET {set.setNumber}
            </p>
            <h1>Set complete.</h1>
          </div>
        </div>
        <div className="result-head">
          <div className="result-score">
            <span data-testid="summary-score">{pct}%</span>
            <small>accuracy</small>
          </div>
          <div className="result-metrics">
            <div>
              <strong>
                {correctCount} / {set.questions.length}
              </strong>
              <span>correct answers</span>
            </div>
            <div>
              <strong>{set.questions.length - correctCount}</strong>
              <span>to revisit</span>
            </div>
          </div>
        </div>
        <div className="summary-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              setIndex(0);
              setChosen(null);
              setCorrectCount(0);
              setFinished(false);
              sessionIdRef.current = newSessionId("jlpt");
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
      <div className="session-top">
        <div>
          <p className="micro-label">
            {level.toUpperCase()} · {category.toUpperCase()} · SET {set.setNumber}
          </p>
          <h1>Choose the best answer.</h1>
        </div>
        <button type="button" onClick={() => setConfirmExit(true)}>
          EXIT SESSION
        </button>
      </div>

      <div className="session-rail" role="status">
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

      {passage && (
        <section className="jlpt-passage panel" data-testid="passage" aria-label="reading passage">
          <p className="micro-label">{passage.title}</p>
          <p className="jlpt-passage-text" lang="ja">
            {passage.text}
          </p>
          {passage.images.map((im) => {
            const src = assetUrl(im.localPath);
            return src ? <img key={im.localPath} src={src} alt="" className="jlpt-media" /> : null;
          })}
        </section>
      )}

      {question.images.length > 0 && (
        <div className="jlpt-question-media" data-testid="question-images">
          {question.images.map((im, i) => {
            const src = assetUrl(im.localPath);
            return src ? (
              <img
                key={im.localPath}
                src={src}
                alt={`Question ${index + 1} illustration ${question.images.length > 1 ? i + 1 : ""}`.trim()}
                className="jlpt-media"
              />
            ) : null;
          })}
        </div>
      )}

      {(questionAudioSrc || setAudioSrc) && (
        <audio
          key={question.audio ? question.id : "set-audio"}
          className="jlpt-audio"
          controls
          preload="auto"
          data-testid="jlpt-audio"
          src={questionAudioSrc ?? setAudioSrc ?? undefined}
          onLoadedMetadata={(e) => {
            const span = question.audio?.span;
            if (span) e.currentTarget.currentTime = span.start;
          }}
          onTimeUpdate={(e) => {
            const span = question.audio?.span;
            if (span && e.currentTarget.currentTime >= span.end) e.currentTarget.pause();
          }}
        />
      )}

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
              onClick={() => choose(i)}
            >
              <span aria-hidden="true">{LABEL[i]}.</span> <span lang="ja">{opt}</span>
            </button>
          );
        })}
      </div>

      {chosen !== null && (
        <div
          className={`reveal panel ${chosen !== question.answerIndex ? "miss-border" : ""}`}
          data-testid="reveal"
        >
          <p className={`reveal-verdict ${chosen === question.answerIndex ? "ok" : "miss"}`}>
            {chosen === question.answerIndex ? "CORRECT" : "WRONG"}
          </p>
          {chosen !== question.answerIndex && (
            <p className="reveal-accepted" lang="ja">
              answer: {question.answerText}
            </p>
          )}
          {question.answeredSentence && (
            <p className="reveal-sentence" lang="ja">
              {question.answeredSentence}
            </p>
          )}
          {question.explanation && (
            <p className="reveal-explanation" data-testid="explanation">
              {question.explanation}
            </p>
          )}
          <button type="button" className="primary" onClick={() => void advance()}>
            {index + 1 >= set.questions.length ? "FINISH" : "NEXT"}
          </button>
        </div>
      )}

      {confirmExit && (
        <div className="abort-confirm panel" role="alertdialog" aria-label="leave session">
          <p>Leave this set? Your answers will be discarded and no activity is recorded.</p>
          <button type="button" onClick={() => navigate(`/learn/jlpt/${category}`)}>
            LEAVE
          </button>
          <button type="button" onClick={() => setConfirmExit(false)}>
            KEEP PRACTICING
          </button>
        </div>
      )}
    </div>
  );
}

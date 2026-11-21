/**
 * One JLPT set run (PRD 10.17, whole-set mode 2026-11-21): every question of
 * the set on one page, answers changeable until the learner checks, then the
 * whole set is scored together. Per-set progress persists on check, XP follows
 * the drill rules. Reading renders each linked passage once per group;
 * listening plays the bound audio slice (set track when the per-question
 * binding lacks evidence); explanations surface after checking.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLevel } from "../../components/level";
import { assetUrl } from "../../content/assets";
import type { JlptLevel } from "../../content/ids";
import { loadJlptLevel, type JlptPool } from "../../content/loaders";
import type { JlptCategory, JlptSet } from "../../content/models";
import { countOf } from "../../domain/format";
import { isStrongScore, perfectDrillBonus, XP } from "../../domain/progress";
import { awardXp, newSessionId, recordSession } from "../../storage/progressRepo";
import { recordJlptResult } from "../../storage/jlptRepo";

const LABEL = "ABCDEFGH";

export function JlptRunPage() {
  const { level } = useLevel();
  const { category = "", setNumber = "" } = useParams();
  const navigate = useNavigate();
  const [load, setLoad] = useState<{
    level: JlptLevel;
    pool: JlptPool | null;
    error: boolean;
  } | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [checked, setChecked] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmUnanswered, setConfirmUnanswered] = useState(false);
  // Stable per run: retries take a fresh id; duplicate CHECK is a no-op.
  const sessionIdRef = useRef(newSessionId("jlpt"));

  useEffect(() => {
    let cancelled = false;
    void loadJlptLevel(level)
      .then((p) => {
        if (!cancelled) setLoad({ level, pool: p, error: false });
      })
      .catch(() => {
        if (!cancelled) setLoad({ level, pool: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [level]);

  const current = load?.level === level ? load : null;
  const pool = current?.pool ?? null;
  const error = current?.error ?? false;

  const set: JlptSet | null = useMemo(() => {
    if (!pool) return null;
    const cat = pool[category as JlptCategory];
    if (!cat) return null;
    return cat.items.find((s) => String(s.setNumber) === setNumber) ?? null;
  }, [pool, category, setNumber]);

  const sessionShown = set !== null && !checked;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const goFirstRef = useRef<HTMLButtonElement>(null);
  const firstRender = useRef(true);

  // Escape toggles the leave confirm (before checking) and closes the
  // unanswered confirm first when it is open. Alt/Ctrl/Meta are left alone
  // (global Alt+1-4 navigation).
  useEffect(() => {
    if (!sessionShown) return;
    function onKey(event: KeyboardEvent): void {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (confirmUnanswered) {
        setConfirmUnanswered(false);
        return;
      }
      setConfirmExit((open) => !open);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessionShown, confirmUnanswered]);

  useEffect(() => {
    if (confirmExit) keepRef.current?.focus();
  }, [confirmExit]);

  useEffect(() => {
    if (confirmUnanswered) goFirstRef.current?.focus();
  }, [confirmUnanswered]);

  // Check / retry: back to the top with the heading focused.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.scrollIntoView({ block: "start" });
    headingRef.current?.focus();
  }, [checked]);

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

  if (!pool) {
    return (
      <div className="route-state" role="status">
        <p>Loading JLPT practice…</p>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="route-state" role="status">
        <p>This set is not available at {level.toUpperCase()}.</p>
        <button type="button" onClick={() => navigate(`/learn/jlpt/${category}`)}>
          ALL SETS
        </button>
      </div>
    );
  }

  const active = set;
  const total = set.questions.length;
  const answerAt = (i: number): number | null => answers[i] ?? null;
  const answered = set.questions.filter((_, i) => answerAt(i) !== null).length;
  const correctCount = set.questions.filter((q, i) => answerAt(i) === q.answerIndex).length;
  const metaLine = `${category.toUpperCase()} · SET ${set.setNumber} · ${countOf(total, "QUESTION")}`;
  const needsSetAudio = set.audio.length > 0 && set.questions.some((q) => !q.audio);
  const setAudioSrc = needsSetAudio ? assetUrl(set.audio[0].localPath) : null;
  const pct = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const xp = correctCount * XP.drillCorrect + perfectDrillBonus(correctCount, total);

  function choose(i: number, option: number): void {
    setAnswers((prev) => {
      const next = active.questions.map((_, k) => prev[k] ?? null);
      next[i] = option;
      return next;
    });
  }

  async function check(): Promise<void> {
    const inserted = await recordSession(sessionIdRef.current, "jlpt", correctCount, total);
    if (!inserted) return;
    awardXp(xp);
    await recordJlptResult(level, category, active.setNumber, correctCount, total);
    setConfirmUnanswered(false);
    setConfirmExit(false);
    setChecked(true);
  }

  function requestCheck(): void {
    if (answered < total) setConfirmUnanswered(true);
    else void check();
  }

  function goToFirstUnanswered(): void {
    setConfirmUnanswered(false);
    const i = active.questions.findIndex((_, k) => answerAt(k) === null);
    if (i < 0) return;
    const block = document.getElementById(`q-${i + 1}`);
    block?.scrollIntoView({ block: "center" });
    block?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
  }

  // Focus inside a question: a-h / 1-8 select that question's option.
  function onBlockKey(event: ReactKeyboardEvent<HTMLFieldSetElement>, i: number): void {
    if (checked || event.altKey || event.ctrlKey || event.metaKey) return;
    const k = event.key.toLowerCase();
    if (k.length !== 1) return;
    const o = /^[1-8]$/.test(k) ? Number(k) - 1 : "abcdefgh".indexOf(k);
    if (o < 0 || o >= active.questions[i].options.length) return;
    event.preventDefault();
    choose(i, o);
    event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"]')[o]?.focus();
  }

  return (
    <div
      className={`${checked ? "results" : "session"} jlpt-whole`}
      data-testid={checked ? "summary" : "session"}
    >
      {checked ? (
        <>
          <div className="page-head">
            <div>
              <h1 ref={headingRef} tabIndex={-1}>
                Set complete.
              </h1>
              <p className="micro-label page-meta">{metaLine}</p>
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
                  {correctCount} / {total}
                </strong>
                <span>correct answers</span>
              </div>
              <div>
                <strong>{total - correctCount}</strong>
                <span>to revisit</span>
              </div>
              <div>
                <strong data-testid="summary-xp">+{xp}</strong>
                <span>XP earned</span>
              </div>
            </div>
          </div>
          <div className="summary-actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                sessionIdRef.current = newSessionId("jlpt");
                setAnswers([]);
                setChecked(false);
              }}
            >
              RETRY SET
            </button>
            <button type="button" onClick={() => navigate(`/learn/jlpt/${category}`)}>
              BACK TO SETS
            </button>
          </div>
        </>
      ) : (
        <div className="session-top">
          <div>
            <h1 ref={headingRef} tabIndex={-1}>
              Answer every question.
            </h1>
            <p className="micro-label page-meta">{metaLine}</p>
          </div>
          <button type="button" onClick={() => setConfirmExit(true)}>
            EXIT SESSION
          </button>
        </div>
      )}

      {!checked && setAudioSrc && (
        <audio
          className="jlpt-audio"
          controls
          preload="auto"
          data-testid="jlpt-audio"
          src={setAudioSrc}
        />
      )}

      {set.questions.map((question, i) => {
        const passage =
          question.passageId && question.passageId !== set.questions[i - 1]?.passageId
            ? (set.passages.find((p) => p.id === question.passageId) ?? null)
            : null;
        const questionAudioSrc = question.audio ? assetUrl(question.audio.localPath) : null;
        const picked = answerAt(i);
        const right = picked === question.answerIndex;
        const answerLine = `answer ${LABEL[question.answerIndex]}. ${question.options[question.answerIndex]}`;
        return (
          <div key={question.id} className="jlpt-question-group">
            {passage && (
              <section
                className="jlpt-passage panel"
                data-testid="passage"
                aria-label="reading passage"
              >
                <p className="micro-label">{passage.title}</p>
                <p className="jlpt-passage-text" lang="ja">
                  {passage.text}
                </p>
                {passage.images.map((im, k) => {
                  const src = assetUrl(im.localPath);
                  return src ? (
                    <img
                      key={im.localPath}
                      src={src}
                      alt={`Passage illustration ${passage.images.length > 1 ? k + 1 : ""}`.trim()}
                      className="jlpt-media"
                    />
                  ) : null;
                })}
              </section>
            )}
            <fieldset
              className={`jlpt-question-block panel${checked ? (right ? " ok" : " miss") : ""}`}
              data-testid="jlpt-question"
              id={`q-${i + 1}`}
              aria-describedby={`q-${i + 1}-prompt`}
              onKeyDown={(e) => onBlockKey(e, i)}
            >
              <legend>
                <span className="micro-label">QUESTION {i + 1}</span>
              </legend>
              <div className="prompt-plate panel jlpt-prompt">
                <p className="jlpt-question" lang="ja" id={`q-${i + 1}-prompt`}>
                  {question.prompt}
                </p>
              </div>

              {question.images.length > 0 && (
                <div className="jlpt-question-media" data-testid="question-images">
                  {question.images.map((im, k) => {
                    const src = assetUrl(im.localPath);
                    return src ? (
                      <img
                        key={im.localPath}
                        src={src}
                        alt={`Question ${i + 1} illustration ${question.images.length > 1 ? k + 1 : ""}`.trim()}
                        className="jlpt-media"
                      />
                    ) : null;
                  })}
                </div>
              )}

              {questionAudioSrc && (
                <audio
                  className="jlpt-audio"
                  controls
                  preload="metadata"
                  data-testid="jlpt-audio"
                  src={questionAudioSrc}
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

              <div className="option-list">
                {question.options.map((opt, o) => {
                  const isCorrect = checked && o === question.answerIndex;
                  const isWrongPick = checked && picked === o && o !== question.answerIndex;
                  return (
                    <label
                      key={o}
                      className={`option${isCorrect ? " ok" : ""}${isWrongPick ? " miss" : ""}`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`q-${question.id}`}
                        checked={picked === o}
                        disabled={checked}
                        aria-keyshortcuts={`${LABEL[o]} ${o + 1}`}
                        onChange={() => choose(i, o)}
                      />
                      <span aria-hidden="true">{LABEL[o]}</span> <span lang="ja">{opt}</span>
                    </label>
                  );
                })}
              </div>

              {checked && (
                <div className="jlpt-verdict">
                  <p className={`reveal-verdict ${right ? "ok" : "miss"}`}>
                    {right
                      ? "CORRECT"
                      : picked === null
                        ? `NOT ANSWERED · ${answerLine}`
                        : `WRONG · your answer ${LABEL[picked]}. ${question.options[picked]} · ${answerLine}`}
                  </p>
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
                </div>
              )}
            </fieldset>
          </div>
        );
      })}

      {!checked && (
        <div className="answer-bar">
          <span role="status" data-testid="answered-count">
            {answered}/{total} answered
          </span>
          <button type="button" className="primary" onClick={requestCheck}>
            CHECK ANSWERS
          </button>
        </div>
      )}

      {!checked && confirmUnanswered && (
        <div className="abort-confirm panel" role="alertdialog" aria-label="unanswered questions">
          <p>
            {countOf(total - answered, "question")} not answered. Unanswered questions count as
            wrong.
          </p>
          <button ref={goFirstRef} type="button" onClick={goToFirstUnanswered}>
            GO TO FIRST UNANSWERED
          </button>
          <button type="button" onClick={() => void check()}>
            CHECK ANYWAY
          </button>
        </div>
      )}

      {!checked && confirmExit && (
        <div className="abort-confirm panel" role="alertdialog" aria-label="leave session">
          <p>Leave this set? Your answers will be discarded and no activity is recorded.</p>
          <button type="button" onClick={() => navigate(`/learn/jlpt/${category}`)}>
            LEAVE
          </button>
          <button ref={keepRef} type="button" onClick={() => setConfirmExit(false)}>
            KEEP PRACTICING
          </button>
        </div>
      )}
    </div>
  );
}

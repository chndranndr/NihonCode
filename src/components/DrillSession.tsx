/**
 * Shared drill session engine (DEVELOPMENT_PROMPT.md task 4): one item at a
 * time, typed input, Enter submits, Enter advances, Esc aborts with confirm,
 * reveal flip teaches every script/meaning/speaker and, on a miss, every
 * accepted reading plus group/category. Consumed by features/drills and
 * features/review (features must not import across each other, so the engine
 * lives in components/).
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { grade } from "../domain/grading";
import { SpeakerButton } from "./SpeakerButton";

export interface SessionItem {
  id: string;
  /** The prompt shown on the plate. */
  prompt: string;
  /** Accepted answers (normalized comparison in domain/grading). */
  accepted: string[];
  /** What the reveal teaches. */
  reveal: {
    scripts: string[];
    meaning: string;
    group: string;
    /** Romaji rendering shown in the result view (PRD 10.9). */
    romaji?: string;
  };
  speakText: string;
  /** Context line under the prompt (e.g. the conjugation target form). */
  subprompt?: string;
  /** Hint the learner can reveal on demand (PRD 10.9 word-type hint). */
  hint?: string;
}

export interface SessionResult {
  total: number;
  correct: number;
  misses: SessionItem[];
  records: Array<{ id: string; correct: boolean }>;
  /** Per-item outcomes in question order, for the results review table. */
  answers: Array<{
    id: string;
    prompt: string;
    submitted: string;
    correct: boolean;
    accepted: string[];
  }>;
}

interface Props {
  title: string;
  items: SessionItem[];
  onFinish(result: SessionResult): void;
  onAbort(): void;
}

interface Answered {
  item: SessionItem;
  submitted: string;
  correct: boolean;
}

export function DrillSession({ title, items, onFinish, onAbort }: Props) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [results, setResults] = useState<Answered[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const advanceRef = useRef<HTMLButtonElement>(null);

  const item = items[index];

  useEffect(() => {
    if (answered) advanceRef.current?.focus();
    else inputRef.current?.focus();
  }, [index, answered]);

  const progress = useMemo(
    () => ({ position: index + 1, total: items.length }),
    [index, items.length],
  );

  if (items.length === 0) {
    return (
      <div className="session" data-testid="session-empty">
        <p className="micro-label">NO ITEMS IN THIS POOL</p>
        <button type="button" onClick={onAbort}>
          BACK
        </button>
      </div>
    );
  }

  function submit() {
    if (answered) return;
    const correct = grade({ submitted: input, accepted: item.accepted });
    const record: Answered = { item, submitted: input, correct };
    setAnswered(record);
    setResults((prev) => [...prev, record]);
  }

  function advance() {
    if (index + 1 >= items.length) {
      const misses = results.filter((r) => !r.correct).map((r) => r.item);
      const correct = results.filter((r) => r.correct).length;
      const records = results.map((r) => ({ id: r.item.id, correct: r.correct }));
      const answers = results.map((r) => ({
        id: r.item.id,
        prompt: r.item.prompt,
        submitted: r.submitted,
        correct: r.correct,
        accepted: r.item.accepted,
      }));
      onFinish({ total: results.length, correct, misses, records, answers });
      return;
    }
    setIndex(index + 1);
    setInput("");
    setAnswered(null);
    setHintShown(false);
  }

  function onKey(event: ReactKeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!answered) submit();
      else advance();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setConfirmAbort(true);
    }
  }

  return (
    <div className="session" data-testid="session" onKeyDown={onKey}>
      <div className="session-rail" role="status">
        <span className="micro-label">{title}</span>
        <span className="micro-label">
          {progress.position}/{progress.total}
        </span>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.position}
          aria-label={`question ${progress.position} of ${progress.total}`}
        >
          <div
            className="progress-fill"
            ref={(el) => {
              el?.style.setProperty("--fill", `${(progress.position / progress.total) * 100}%`);
            }}
          />
        </div>
      </div>

      <div className="prompt-plate panel">
        <p className="prompt-text" lang="ja">
          {item.prompt}
        </p>
        {item.subprompt && <p className="prompt-sub">{item.subprompt}</p>}
        <SpeakerButton text={item.speakText} label="prompt" />
      </div>

      {answered ? (
        <div className="reveal panel" data-testid="reveal">
          <p className={`reveal-verdict ${answered.correct ? "ok" : "miss"}`}>
            {answered.correct ? "CORRECT" : "WRONG"}
          </p>
          <ul className="reveal-scripts">
            {item.reveal.scripts.map((s) => (
              <li key={s} lang="ja">
                {s}
              </li>
            ))}
          </ul>
          {item.reveal.romaji && <p className="reveal-romaji">{item.reveal.romaji}</p>}
          <p className="reveal-meaning">{item.reveal.meaning}</p>
          <p className="micro-label">{item.reveal.group}</p>
          {!answered.correct && (
            <p className="reveal-accepted">accepted: {item.accepted.join(" / ")}</p>
          )}
          <button ref={advanceRef} type="button" className="primary" onClick={advance}>
            {index + 1 >= items.length ? "FINISH" : "NEXT"}
          </button>
        </div>
      ) : (
        <div className="input-dock">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="type your answer, Enter to submit"
            aria-label="answer"
            autoComplete="off"
          />
          <button type="button" className="primary" onClick={submit}>
            SUBMIT
          </button>
          {item.hint && (
            <button type="button" className="hint-toggle" onClick={() => setHintShown(true)}>
              HINT
            </button>
          )}
          {item.hint && hintShown && <p className="hint-line">{item.hint}</p>}
        </div>
      )}

      {confirmAbort && (
        <div className="abort-confirm panel" role="alertdialog" aria-label="abort session">
          <p>Abort this session? No XP is awarded for an aborted run.</p>
          <button type="button" onClick={onAbort}>
            ABORT
          </button>
          <button type="button" onClick={() => setConfirmAbort(false)}>
            RESUME
          </button>
        </div>
      )}
    </div>
  );
}

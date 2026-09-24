import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../../components/Panel";
import { useLevel } from "../../components/level";
import { srsPoolIds } from "../../components/pools";
import { dueCount } from "../../storage/srsRepo";
import { db } from "../../storage/db";
import { ENABLED_LEVELS } from "../../content/loaders";
import type { JlptLevel } from "../../content/ids";

const PRACTICE: Array<[string, string, string, string]> = [
  ["kana", "あ", "KANA", "Hiragana & katakana"],
  ["kanji", "漢", "KANJI", "Characters & readings"],
  ["vocab", "語", "VOCAB", "Words & meanings"],
  ["numbers", "123", "NUMBERS", "Counting practice"],
  ["dates", "日", "DATES", "Days & dates"],
  ["conjugation", "活", "CONJUGATION", "Verbs & adjectives"],
];

export function LearnPage() {
  const { pools, level, setLevel } = useLevel();
  const [due, setDue] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!pools) return;
    let cancelled = false;
    void (async () => {
      const d = await dueCount(srsPoolIds(pools));
      const rows = await db().grammarState.bulkGet(pools.grammar.map((l) => l.id));
      if (cancelled) return;
      setDue(d);
      setCompleted(
        new Set(pools.grammar.filter((_l, i) => rows[i]?.status === "completed").map((l) => l.id)),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [pools]);

  if (!pools) return <p className="micro-label">LOADING…</p>;

  return (
    <div className="learn" data-testid="learn">
      <div className="page-head">
        <div>
          <p className="label">キタ / {level.toUpperCase()} STUDY</p>
          <h1>Choose what to learn.</h1>
          <p className="description">
            Practice a skill, explore a grammar point, or return to your review queue.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <div className="field" role="radiogroup" aria-label="study level">
          <span>Study level</span>
          <div className="segmented">
            {(["n5", "n4", "n3", "n2", "n1"] as JlptLevel[]).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={level === l}
                disabled={!ENABLED_LEVELS.includes(l)}
                onClick={() => setLevel(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <span className="muted">{`${pools.kanji.length} kanji · ${pools.vocab.length} words · ${pools.grammar.length} lessons`}</span>
      </div>

      <div className="learn-layout">
        <Panel title="PRACTICE">
          <div className="practice-list">
            {PRACTICE.map(([mode, glyph, name, desc]) => (
              <Link key={mode} className="practice-link" to={`/learn/drill/${mode}`}>
                <span lang={mode === "numbers" ? undefined : "ja"}>{glyph}</span>
                <span>
                  <b>
                    {name === "KANA" ||
                    name === "NUMBERS" ||
                    name === "DATES" ||
                    name === "CONJUGATION"
                      ? name
                      : `${name} ${level.toUpperCase()}`}
                  </b>
                  <small>{desc}</small>
                </span>
                <span className="arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title={`GRAMMAR ${level.toUpperCase()}`}>
          <ul className="lesson-list">
            {pools.grammar.slice(0, 12).map((l, i) => (
              <li key={l.id}>
                <Link to={`/learn/grammar/${l.lessonId}`}>
                  <span className="num">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <b lang="ja">{l.title}</b>
                    <small>{completed.has(l.id) ? "Completed" : l.category}</small>
                  </span>
                  <span className="end">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="SRS REVIEW">
          <p className="muted">
            {due === null
              ? "Counting due cards…"
              : due > 0
                ? `${due} cards are ready for review.`
                : "Nothing is due right now. Cards return as their intervals elapse."}
          </p>
          <Link className="primary inline-cta" to="/learn/review">
            OPEN REVIEW QUEUE
          </Link>
        </Panel>

        <Panel title="JLPT PRACTICE">
          <p className="muted">
            Grammar, kanji, vocabulary, reading and listening exercise sets by level.
          </p>
          <Link className="primary inline-cta" to="/learn/jlpt">
            BROWSE JLPT SETS
          </Link>
        </Panel>
      </div>
    </div>
  );
}

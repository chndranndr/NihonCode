import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { routineAction, routineLabel, type RoutineAction } from "../../domain/routine";
import { srsPoolIds } from "../../components/pools";
import { useLevel } from "../../components/level";
import { dashboardSrsData } from "../../storage/srsRepo";
import { db } from "../../storage/db";
import { activityRows, masteryByItems } from "../../storage/progressRepo";
import type { ActivityRow } from "../../domain/activity";
import { compactWindow } from "../../domain/activity";
import { dayKey } from "../../domain/progress";
import { ActivityCalendar } from "../../components/ActivityCalendar";
import { loadPrefs } from "../../storage/prefs";
import { ENABLED_LEVELS } from "../../content/loaders";
import type { JlptLevel } from "../../content/ids";

type KanjiBand = "mastered" | "learning" | "unseen";

/** Home's kanji panel previews this many cells; mastery totals use the whole pool. */
const KANJI_PREVIEW = 80;

interface DashboardData {
  action: RoutineAction;
  due: number;
  fresh: number;
  grammarDone: number;
  grammarTotal: number;
  grammarTitle: string | null;
  kanjiPreview: { char: string; band: KanjiBand }[];
  kanjiMastered: number;
  kanjiLearning: number;
  kanjiTotal: number;
  activity: ActivityRow[];
}

/**
 * Repository reads are tagged with the inputs that produced them, so a slow
 * read for a previous level or daily cap can never render as the current one;
 * an untagged result is treated as loading.
 */
type ContentState =
  | { status: "loading" }
  | { status: "ready"; level: JlptLevel; cap: number; data: DashboardData }
  | { status: "error"; level: JlptLevel; cap: number };

function momentumLine(due: number, fresh: number): string {
  if (due > 0) return `${due} cards are ready for another look.`;
  if (fresh > 0) return `${fresh} new cards are waiting to be introduced.`;
  return "Nothing is due right now. A short drill keeps it moving.";
}

export function DashboardPage() {
  const prefs = loadPrefs();
  const { pools, level, setLevel } = useLevel();
  const cap = prefs.srs.dailyNewCap;
  const [content, setContent] = useState<ContentState>({ status: "loading" });
  const [readKey, setReadKey] = useState(0);

  useEffect(() => {
    if (!pools) return;
    const loaded = pools;
    let current = true;

    void (async () => {
      try {
        const poolIds = srsPoolIds(loaded);
        const grammarIds = loaded.grammar.map((l) => l.id);
        const [{ queue }, grammarRows, mastery, activity] = await Promise.all([
          dashboardSrsData(poolIds, cap),
          db().grammarState.bulkGet(grammarIds),
          masteryByItems(loaded.kanji.map((k) => k.id)),
          activityRows(),
        ]);
        if (!current) return;
        const kanjiPreview: { char: string; band: KanjiBand }[] = [];
        let kanjiMastered = 0;
        let kanjiLearning = 0;
        for (const k of loaded.kanji) {
          const m = mastery.get(k.id);
          const band: KanjiBand =
            !m || m.attempts === 0 ? "unseen" : m.accuracy >= 0.8 ? "mastered" : "learning";
          if (band === "mastered") kanjiMastered += 1;
          else if (band === "learning") kanjiLearning += 1;
          if (kanjiPreview.length < KANJI_PREVIEW) kanjiPreview.push({ char: k.char, band });
        }
        const nextLesson =
          loaded.grammar.find((_l, i) => grammarRows[i]?.status !== "completed") ?? null;
        const due = queue.due.length;
        const fresh = queue.newCandidates.length;
        setContent({
          status: "ready",
          level,
          cap,
          data: {
            action: routineAction({
              dueCount: due,
              newCardCount: fresh,
              poolSize: poolIds.length,
            }),
            due,
            fresh,
            grammarDone: grammarRows.filter((r) => r?.status === "completed").length,
            grammarTotal: loaded.grammar.length,
            grammarTitle: nextLesson?.title ?? null,
            kanjiPreview,
            kanjiMastered,
            kanjiLearning,
            kanjiTotal: loaded.kanji.length,
            activity,
          },
        });
      } catch {
        if (!current) return;
        setContent({ status: "error", level, cap });
      }
    })();

    return () => {
      current = false;
    };
  }, [pools, level, cap, readKey]);

  if (!pools) {
    return (
      <p className="micro-label" data-testid="dashboard-loading">
        LOADING…
      </p>
    );
  }

  const matched =
    content.status !== "loading" && content.level === level && content.cap === cap ? content : null;
  const data = matched?.status === "ready" ? matched.data : null;
  const failed = matched?.status === "error";

  const today = dayKey(new Date());
  const window = compactWindow(today);

  return (
    <div className="dashboard" data-testid="dashboard">
      <div className="home-intro">
        <div className="page-head">
          <div>
            <p className="label">YOUR JAPANESE, A LITTLE EVERY DAY</p>
            <h1>Welcome back.</h1>
            <p className="description">A quiet place for drills, review, and steady progress.</p>
            <div className="status-strip" role="status">
              <span className="micro-label">JLPT {level.toUpperCase()}</span>
              <span className="micro-label" data-testid="streak">
                STREAK {prefs.progress.streakDays}
              </span>
              <span className="micro-label" data-testid="xp">
                <span aria-hidden="true">XP </span>
                <span className="sr-only">Experience points </span>
                <span data-testid="xp-value">{prefs.progress.xp}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="field" role="group" aria-label="study level">
          <span>Study level</span>
          <div className="segmented">
            {(["n5", "n4", "n3", "n2", "n1"] as JlptLevel[]).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={level === l}
                disabled={!ENABLED_LEVELS.includes(l)}
                title={
                  ENABLED_LEVELS.includes(l) ? undefined : "enabled after its curation pass lands"
                }
                onClick={() => setLevel(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <p className="muted">
            Choose the JLPT level you’re studying; it filters the practice pool and recommendations.
          </p>
        </div>
      </div>

      {data ? (
        <>
          <div className="grid-home">
            <section className="panel routine" data-testid="routine-card">
              <p className="label">TODAY’S PRACTICE</p>
              <h2>Keep your Japanese moving.</h2>
              <p className="muted">{momentumLine(data.due, data.fresh)}</p>
              <Link
                className="button primary routine-cta"
                data-testid="routine-cta"
                to={
                  data.action.kind === "review" || data.action.kind === "new-cards"
                    ? "/learn/review"
                    : data.action.kind === "progress"
                      ? "/progress"
                      : `/learn/drill/${data.action.kind === "drill" ? data.action.mode : "kana"}`
                }
              >
                {routineLabel(data.action)}
              </Link>
              <span className="muted">Choose your session before you begin.</span>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Your momentum</h2>
              </div>
              <ActivityCalendar
                rows={data.activity}
                startKey={window.start}
                endKey={window.end}
                todayKey={today}
                compact
              />
              <Link className="text-link" to="/progress">
                View full activity
              </Link>
            </section>

            <section className="panel span-all">
              <div className="panel-head">
                <h2>Choose a practice</h2>
              </div>
              <div className="practice-list">
                {[
                  ["あ", "Kana", "Hiragana & katakana", "kana"],
                  ["漢", "Kanji", "Characters & readings", "kanji"],
                  ["語", "Vocabulary", "Words & meanings", "vocab"],
                  ["123", "Numbers", "Counting practice", "numbers"],
                  ["日", "Dates", "Days & dates", "dates"],
                  ["活", "Conjugation", "Verbs & adjectives", "conjugation"],
                ].map(([glyph, name, desc, mode]) => (
                  <Link key={mode} className="practice-link" to={`/learn/drill/${mode}`}>
                    <span lang={mode === "numbers" ? undefined : "ja"}>{glyph}</span>
                    <span>
                      <b>{name}</b>
                      <small>{desc}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="compact-grid">
            <section className="panel">
              <div className="panel-head">
                <h2>{`Grammar · ${level.toUpperCase()}`}</h2>
              </div>
              <div className="lesson-preview">
                <p className="label" data-testid="grammar-position">
                  {data.grammarTotal > 0 && data.grammarDone >= data.grammarTotal
                    ? `ALL ${data.grammarTotal} COMPLETE`
                    : `LESSON ${Math.min(data.grammarDone + 1, data.grammarTotal || 1)}/${data.grammarTotal || "0"}`}
                </p>
                <p className="muted">
                  {data.grammarTitle ?? "Every grammar lesson at this level is complete."}
                </p>
                {data.grammarTitle && (
                  <Link className="button" to="/learn">
                    Continue lesson
                  </Link>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Your kanji</h2>
              </div>
              <div className="kanji-map" aria-hidden="true">
                {data.kanjiPreview.map((k, i) => (
                  <span key={`${k.char}-${i}`} className={`kanji-cell ${k.band}`} lang="ja">
                    {k.char}
                  </span>
                ))}
              </div>
              <p className="map-legend">
                <span className="mastered">MASTERED</span>
                <span className="learning">LEARNING</span>
                <span className="unseen">UNSEEN</span>
              </p>
              <p className="micro-label" data-testid="kanji-map-compact">
                MASTERED {data.kanjiMastered}/{data.kanjiTotal} · LEARNING {data.kanjiLearning}
              </p>
              <Link className="text-link" to="/progress">
                Full map and inspector
              </Link>
            </section>
          </div>
        </>
      ) : failed ? (
        <div className="panel" role="alert" data-testid="dashboard-error">
          <p className="label">COULDN’T LOAD YOUR DASHBOARD</p>
          <p className="muted">Your saved progress could not be read.</p>
          <button type="button" className="button" onClick={() => setReadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      ) : (
        <p className="micro-label" data-testid="dashboard-content-loading">
          LOADING…
        </p>
      )}
    </div>
  );
}

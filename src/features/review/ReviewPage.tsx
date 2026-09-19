import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DrillSession, type SessionItem, type SessionResult } from "../../components/DrillSession";
import { usePools, srsPoolIds } from "../../components/pools";
import { ratingFromCorrect } from "../../domain/scheduling";
import { XP } from "../../domain/progress";
import { awardXp, recordAttempt } from "../../storage/progressRepo";
import { buildDueQueue, reviewItem } from "../../storage/srsRepo";
import { currentPrefs } from "../../storage/progressRepo";

export function ReviewPage() {
  const navigate = useNavigate();
  const prefs = currentPrefs();
  const pools = usePools(prefs.level);
  const [queue, setQueue] = useState<{ due: string[]; fresh: string[] } | null>(null);
  const [session, setSession] = useState<SessionItem[] | null>(null);
  const [summary, setSummary] = useState<SessionResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!pools) return;
      const q = await buildDueQueue(srsPoolIds(pools), prefs.srs.dailyNewCap);
      if (!cancelled) setQueue({ due: q.due, fresh: q.newCandidates });
    })();
    return () => {
      cancelled = true;
    };
  }, [pools, prefs.srs.dailyNewCap]);

  const lookup = useMemo(() => {
    const map = new Map<
      string,
      { prompt: string; accepted: string[]; scripts: string[]; meaning: string; speak: string }
    >();
    if (!pools) return map;
    for (const k of pools.kanji)
      map.set(k.id, {
        prompt: k.char,
        accepted: k.answers,
        scripts: [k.char, k.reading],
        meaning: k.meaning,
        speak: k.char,
      });
    for (const v of pools.vocab)
      map.set(v.id, {
        prompt: v.kanji,
        accepted: [v.romaji],
        scripts: [v.kanji, v.kana],
        meaning: v.meaning,
        speak: v.kana,
      });
    return map;
  }, [pools]);

  function start(): void {
    if (!queue) return;
    const ids = [...queue.due, ...queue.fresh];
    const items: SessionItem[] = ids
      .map((id) => {
        const entry = lookup.get(id);
        if (!entry) return null;
        return {
          id,
          prompt: entry.prompt,
          accepted: entry.accepted,
          reveal: { scripts: entry.scripts, meaning: entry.meaning, group: "srs review" },
          speakText: entry.speak,
        };
      })
      .filter((x): x is SessionItem => x !== null);
    setSession(items);
  }

  async function finish(result: SessionResult): Promise<void> {
    for (const record of result.records) {
      const rating = ratingFromCorrect(record.correct);
      await reviewItem(record.id, rating);
      await recordAttempt(record.id, "srs", record.correct);
    }
    awardXp(result.correct * XP.srsReview);
    setSession(null);
    setSummary(result);
  }

  if (summary) {
    return (
      <div className="session" data-testid="summary">
        <h2 className="micro-label">REVIEW COMPLETE</h2>
        <p className="summary-score" data-testid="summary-score">
          {summary.total === 0 ? 0 : Math.round((summary.correct / summary.total) * 100)}%
        </p>
        <p className="micro-label">
          {summary.correct}/{summary.total} CORRECT · CARDS RESCHEDULED
        </p>
        <button type="button" className="primary" onClick={() => navigate("/")}>
          BACK TO DASHBOARD
        </button>
      </div>
    );
  }

  if (session) {
    return (
      <DrillSession
        title="SRS REVIEW"
        items={session}
        onFinish={(r) => void finish(r)}
        onAbort={() => {
          setSession(null);
          navigate("/");
        }}
      />
    );
  }

  return (
    <div className="setup" data-testid="review">
      <h2 className="micro-label">SRS REVIEW QUEUE</h2>
      {queue ? (
        <>
          <p className="micro-label">
            DUE {queue.due.length} · NEW {queue.fresh.length}
          </p>
          <button
            type="button"
            className="primary"
            onClick={start}
            disabled={queue.due.length + queue.fresh.length === 0}
          >
            START REVIEW
          </button>
          {queue.due.length + queue.fresh.length === 0 && (
            <p className="empty-teach">
              Nothing due. Cards return when their FSRS interval elapses.
            </p>
          )}
        </>
      ) : (
        <p className="micro-label">LOADING…</p>
      )}
    </div>
  );
}

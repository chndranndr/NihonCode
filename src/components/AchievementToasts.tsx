/**
 * Achievement toast notifications (PRD 10.13): when an achievement unlocks,
 * a toast announces it once. Unlocks are remembered in prefs
 * (`progress.seenAchievements`) so they fire exactly once per achievement,
 * surviving reloads. The toast host polls achievement inputs on an interval;
 * achievements derive from stored state, so polling is cheap and complete.
 */

import { useEffect, useRef, useState } from "react";
import { achievements, type AchievementInput } from "../domain/achievements";
import { sessionSummary } from "../storage/progressRepo";
import { loadPrefs, savePrefs } from "../storage/prefs";

interface Toast {
  id: string;
  label: string;
}

export function AchievementToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenRef = useRef<Set<string>>(new Set(loadPrefs().progress.seenAchievements));

  useEffect(() => {
    const timer = window.setInterval(() => {
      void (async () => {
        const prefs = loadPrefs();
        const sessions = await sessionSummary();
        const input: AchievementInput = {
          xp: prefs.progress.xp,
          streakDays: prefs.progress.streakDays,
          totalSessions: sessions.totalSessions,
          drillSessions: sessions.drillSessions,
          perfectSessions: sessions.perfectSessions,
          reviewsCompleted: sessions.reviewsCompleted,
          grammarCompleted: sessions.grammarCompleted,
          weeklyXp: prefs.progress.weeklyXp,
        };
        const fresh = achievements(input, new Date()).filter(
          (a) => a.unlocked && !seenRef.current.has(a.id),
        );
        if (fresh.length === 0) return;
        for (const a of fresh) seenRef.current.add(a.id);
        // Re-read prefs at save time and merge only seenAchievements: a
        // concurrent awardXp (session finishing mid-poll) must not be
        // clobbered by this whole-object write.
        const latest = loadPrefs();
        savePrefs({
          ...latest,
          progress: { ...latest.progress, seenAchievements: [...seenRef.current] },
        });
        setToasts((prev) => [...prev, ...fresh.map((a) => ({ id: a.id, label: a.label }))]);
      })();
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => setToasts((prev) => prev.slice(1)), 3500);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite" data-testid="toasts">
      <p className="toast panel">
        <span className="micro-label">ACHIEVEMENT UNLOCKED</span>
        <span>{toasts[0].label}</span>
      </p>
    </div>
  );
}

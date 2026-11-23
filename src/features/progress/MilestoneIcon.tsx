/**
 * Line icons for progress milestones, drawn in the same 24px / 1.5 stroke
 * style as the shared speaker icon. Keyed by achievement id; unknown ids
 * fall back to a plain marker so a new milestone never renders blank.
 */

const PATHS: Record<string, string> = {
  // first session: a flag planted
  "first-session": "M5 21V4m0 0h11l-2 4 2 4H5",
  // flawless: a star
  "first-perfect":
    "m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z",
  // keeper (SRS review): cycle arrows
  "first-review": "M20 11a8 8 0 0 0-14.3-4.9M4 4v3.5h3.5M4 13a8 8 0 0 0 14.3 4.9M20 20v-3.5h-3.5",
  // century (XP): lightning bolt
  "xp-100": "M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z",
  // three-day streak: flame
  "streak-3":
    "M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.9-3-6.5-4.8-9.8-.6 2.6-1.9 4-3.4 4.9C9.1 8.4 8.5 7 8.4 5.6 6.6 7.5 5.5 10.2 5.5 14.8 5.5 18.4 8.1 21 12 21Z",
  // weeklong streak: calendar
  "streak-7": "M4 6.5h16V20H4V6.5Zm0 4.5h16M8 3.5v5M16 3.5v5",
  // grammarian: open book
  "grammar-10":
    "M12 6.5c-2-1.5-4.8-2-8-2V18c3.2 0 6 .5 8 2 2-1.5 4.8-2 8-2V4.5c-3.2 0-6 .5-8 2Zm0 0V20",
  // today: sun
  daily:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
};

const FALLBACK = "M6 6h12v12H6V6Z";

export function MilestoneIcon({ id }: { id: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={PATHS[id] ?? FALLBACK}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Route tree. Secondary routes load lazily (implementation_plan Phase 3 DoD:
 * route/dataset lazy-loading) behind a shared Suspense fallback; the
 * dashboard and learn hub stay eager so first paint and the study entry are
 * never blocked. Dataset content is lazy separately (src/content/loaders).
 */

import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { LearnPage } from "../features/learn/LearnPage";

// One importer per secondary route: lazy() uses it, and warmRoutes() calls
// it once the browser is idle. React Router v7 runs navigations in a
// transition, so a cold chunk keeps the old view on screen (URL already
// changed) until the download lands; warming removes that gap.
const routeImports = {
  progress: () => import("../features/progress/ProgressPage"),
  drill: () => import("../features/drills/DrillPage"),
  grammar: () => import("../features/grammar/GrammarLessonPage"),
  review: () => import("../features/review/ReviewPage"),
  jlpt: () => import("../features/jlpt/JlptPage"),
  jlptRun: () => import("../features/jlpt/JlptRunPage"),
  config: () => import("../features/settings/ConfigPage"),
  stats: () => import("../features/stats/SrsStatsPage"),
};

const ProgressPage = lazy(() => routeImports.progress().then((m) => ({ default: m.ProgressPage })));
const DrillPage = lazy(() => routeImports.drill().then((m) => ({ default: m.DrillPage })));
const GrammarLessonPage = lazy(() =>
  routeImports.grammar().then((m) => ({ default: m.GrammarLessonPage })),
);
const ReviewPage = lazy(() => routeImports.review().then((m) => ({ default: m.ReviewPage })));
const JlptPage = lazy(() => routeImports.jlpt().then((m) => ({ default: m.JlptPage })));
const JlptRunPage = lazy(() => routeImports.jlptRun().then((m) => ({ default: m.JlptRunPage })));
const ConfigPage = lazy(() => routeImports.config().then((m) => ({ default: m.ConfigPage })));
const SrsStatsPage = lazy(() => routeImports.stats().then((m) => ({ default: m.SrsStatsPage })));

let warmed = false;
/** Prefetch every secondary route chunk once, after first paint, when idle. */
function warmRoutes(): void {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  const run = () => {
    for (const load of Object.values(routeImports)) void load().catch(() => {});
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

function RoutedContent() {
  const { pathname } = useLocation();
  return (
    <RouteErrorBoundary resetKey={pathname}>
      <Suspense
        fallback={
          <div className="route-state" role="status">
            <p>Loading this view…</p>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/drill/:mode" element={<DrillPage />} />
          <Route path="/learn/grammar/:lessonId" element={<GrammarLessonPage />} />
          <Route path="/learn/jlpt" element={<JlptPage />} />
          <Route path="/learn/jlpt/:category" element={<JlptPage />} />
          <Route path="/stats" element={<SrsStatsPage />} />
          <Route path="/learn/jlpt/:category/:setNumber" element={<JlptRunPage />} />
          <Route path="/learn/review" element={<ReviewPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function App() {
  useEffect(warmRoutes, []);
  return (
    <BrowserRouter>
      <AppShell>
        <RoutedContent />
      </AppShell>
    </BrowserRouter>
  );
}

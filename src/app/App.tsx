/**
 * Route tree. Secondary routes load lazily (implementation_plan Phase 3 DoD:
 * route/dataset lazy-loading) behind a shared Suspense fallback; the
 * dashboard and learn hub stay eager so first paint and the study entry are
 * never blocked. Dataset content is lazy separately (src/content/loaders).
 */

import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { LearnPage } from "../features/learn/LearnPage";

const ProgressPage = lazy(() =>
  import("../features/progress/ProgressPage").then((m) => ({ default: m.ProgressPage })),
);
const DrillPage = lazy(() =>
  import("../features/drills/DrillPage").then((m) => ({ default: m.DrillPage })),
);
const GrammarLessonPage = lazy(() =>
  import("../features/grammar/GrammarLessonPage").then((m) => ({ default: m.GrammarLessonPage })),
);
const ReviewPage = lazy(() =>
  import("../features/review/ReviewPage").then((m) => ({ default: m.ReviewPage })),
);
const JlptPage = lazy(() =>
  import("../features/jlpt/JlptPage").then((m) => ({ default: m.JlptPage })),
);
const JlptRunPage = lazy(() =>
  import("../features/jlpt/JlptRunPage").then((m) => ({ default: m.JlptRunPage })),
);
const ConfigPage = lazy(() =>
  import("../features/settings/ConfigPage").then((m) => ({ default: m.ConfigPage })),
);
const SrsStatsPage = lazy(() =>
  import("../features/stats/SrsStatsPage").then((m) => ({ default: m.SrsStatsPage })),
);

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<p className="micro-label">LOADING…</p>}>
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
      </AppShell>
    </BrowserRouter>
  );
}

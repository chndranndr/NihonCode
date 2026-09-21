import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ProgressPage } from "../features/progress/ProgressPage";
import { LearnPage } from "../features/learn/LearnPage";
import { DrillPage } from "../features/drills/DrillPage";
import { GrammarLessonPage } from "../features/grammar/GrammarLessonPage";
import { ReviewPage } from "../features/review/ReviewPage";
import { JlptPage } from "../features/jlpt/JlptPage";
import { JlptRunPage } from "../features/jlpt/JlptRunPage";
import { ConfigPage } from "../features/settings/ConfigPage";

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/drill/:mode" element={<DrillPage />} />
          <Route path="/learn/grammar/:lessonId" element={<GrammarLessonPage />} />
          <Route path="/learn/jlpt" element={<JlptPage />} />
          <Route path="/learn/jlpt/:category" element={<JlptPage />} />
          <Route path="/learn/jlpt/:category/:setNumber" element={<JlptRunPage />} />
          <Route path="/learn/review" element={<ReviewPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

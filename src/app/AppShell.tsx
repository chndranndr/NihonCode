import { useEffect, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LevelProvider, useLevel } from "../components/level";
import { ThemeProvider } from "../components/theme";
import { AchievementToasts } from "../components/AchievementToasts";
import "./app.css";

const SECTIONS = [
  { key: "1", to: "/", label: "Home", glyph: "⌂" },
  { key: "2", to: "/progress", label: "Progress", glyph: "▥" },
  { key: "3", to: "/learn", label: "Learn", glyph: "本" },
  { key: "4", to: "/config", label: "Config", glyph: "⚙" },
] as const;

function titleForPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "Home";
  if (path === "/progress") return "Progress";
  if (path === "/learn") return "Learn";
  if (path.startsWith("/learn/drill/")) return "Drill";
  if (path.startsWith("/learn/grammar/")) return "Grammar lesson";
  if (path === "/learn/jlpt" || path.startsWith("/learn/jlpt/")) return "JLPT practice";
  if (path === "/stats") return "SRS statistics";
  if (path === "/learn/review") return "Review";
  if (path === "/config") return "Config";
  return "Home";
}

function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { level } = useLevel();

  useEffect(() => {
    document.title = `${titleForPath(pathname)} · NihonCode`;
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      const section =
        event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
          ? SECTIONS.find((s) => s.key === event.key)
          : undefined;
      if (section) {
        event.preventDefault();
        navigate(section.to);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="rail">
        <NavLink to="/" className="brand" aria-label="Kita home">
          <span lang="ja">キタ</span>
          <b>KITA</b>
        </NavLink>
        <nav aria-label="Primary">
          {SECTIONS.map((s) => (
            <NavLink key={s.key} to={s.to} title={s.label} end={s.to === "/"}>
              <span aria-hidden="true">{s.glyph}</span>
              {s.label}
            </NavLink>
          ))}
        </nav>
        <div className="rail-note">
          <span lang="ja">毎日、少しずつ。</span>
          <p>A little, every day.</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="micro-label" data-testid="topbar-level">
            JLPT {level.toUpperCase()}
          </span>
          <span className="console-tag">LOCAL DATA ONLY</span>
        </header>
        <main className="app-content" id="main" tabIndex={-1}>
          <AchievementToasts />
          {children}
        </main>
        <footer className="bottom-bar">
          <span>
            キタ <span className="muted">/ No account. Your own pace.</span>
          </span>
          <div className="key-legend">
            {SECTIONS.map((s) => (
              <span key={s.key}>
                <kbd>Alt+{s.key}</kbd> {s.label}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LevelProvider>
        <Shell>{children}</Shell>
      </LevelProvider>
    </ThemeProvider>
  );
}

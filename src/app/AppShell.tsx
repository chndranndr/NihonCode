import { useEffect, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LevelProvider } from "../components/level";
import { ThemeProvider } from "../components/theme";
import { AchievementToasts } from "../components/AchievementToasts";
import "./app.css";

const SECTIONS = [
  { key: "1", to: "/", label: "Home", glyph: "⌂" },
  { key: "2", to: "/progress", label: "Progress", glyph: "▥" },
  { key: "3", to: "/learn", label: "Learn", glyph: "本" },
  { key: "4", to: "/config", label: "Config", glyph: "⚙" },
] as const;

const TICKER_TEXT =
  "NIHONCODE // KITA v0.1 // LOCAL-FIRST // NO ACCOUNT // NO CLOUD // DATA STAYS IN THIS BROWSER //";

function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <span className="ticker-run">{TICKER_TEXT}</span>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      const section = SECTIONS.find((s) => s.key === event.key);
      if (section) navigate(section.to);
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
          <span>
            JAPANESE PRACTICE <span className="muted">/ STUDY CONSOLE</span>
          </span>
          <span className="console-tag" aria-hidden="true">
            LOCAL DATA ONLY
          </span>
        </header>
        <main className="app-content" id="main" tabIndex={-1}>
          <AchievementToasts />
          {children}
        </main>
        <footer className="bottom-bar">
          <span>
            キタ <span className="muted">/ No account. Your own pace.</span>
          </span>
          <Ticker />
          <div className="key-legend" aria-hidden="true">
            {SECTIONS.map((s) => (
              <span key={s.key}>
                <kbd>{s.key}</kbd> {s.label}
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

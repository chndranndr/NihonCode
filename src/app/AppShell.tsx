import { useEffect, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ThemeProvider } from "../components/theme";
import "./app.css";

const SECTIONS = [
  { key: "1", to: "/", label: "HOME", glyph: "[H]" },
  { key: "2", to: "/progress", label: "PROGRESS", glyph: "[P]" },
  { key: "3", to: "/learn", label: "LEARN", glyph: "[L]" },
  { key: "4", to: "/config", label: "CONFIG", glyph: "[C]" },
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
    <div className="app-frame">
      <nav className="icon-rail" aria-label="Primary">
        {SECTIONS.map((s) => (
          <NavLink key={s.key} to={s.to} title={s.label} className="rail-link">
            <span aria-hidden="true">{s.glyph}</span>
            <span className="sr-only">{s.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="app-main">
        <main className="app-content">{children}</main>
        <footer className="bottom-bar">
          <nav aria-label="Primary mobile">
            {SECTIONS.map((s) => (
              <NavLink key={s.key} to={s.to} className="bar-link">
                {s.label}
              </NavLink>
            ))}
          </nav>
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
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Shell>{children}</Shell>
    </ThemeProvider>
  );
}

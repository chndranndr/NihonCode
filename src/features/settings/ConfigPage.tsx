import { useState } from "react";
import { Panel } from "../../components/Panel";
import { status } from "../../components/tts";
import { useTheme } from "../../components/theme";
import { APP_VERSION, CONTACT_PLACEHOLDER, CONTENT_SOURCES } from "../../content/sources";
import { loadPrefs, savePrefs, type AccentName } from "../../storage/prefs";

const ACCENTS: AccentName[] = ["amber", "green", "blue", "orange", "red"];

export function ConfigPage() {
  const theme = useTheme();
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [tab, setTab] = useState<"settings" | "about">("settings");
  const tts = status();

  function update(next: typeof prefs): void {
    setPrefs(next);
    savePrefs(next);
  }

  return (
    <div className="config" data-testid="config">
      <div className="limit-row" role="tablist" aria-label="config views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settings"}
          onClick={() => setTab("settings")}
        >
          SETTINGS
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "about"}
          onClick={() => setTab("about")}
        >
          ABOUT
        </button>
      </div>

      {tab === "settings" && (
        <div className="dash-grid">
          <Panel title="APPEARANCE">
            <div className="setting-row">
              <span className="micro-label">THEME</span>
              <button
                type="button"
                onClick={() => theme.setTheme(theme.theme === "dark" ? "light" : "dark")}
              >
                {theme.theme.toUpperCase()}
              </button>
            </div>
            <div className="setting-row" role="radiogroup" aria-label="accent color">
              <span className="micro-label">ACCENT</span>
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={theme.accent === a}
                  onClick={() => theme.setAccent(a)}
                >
                  {a.toUpperCase()}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="SRS PREFERENCES">
            <div className="setting-row">
              <label className="micro-label" htmlFor="new-cap">
                DAILY NEW CARDS
              </label>
              <input
                id="new-cap"
                type="number"
                min={1}
                max={100}
                value={prefs.srs.dailyNewCap}
                onChange={(e) =>
                  update({ ...prefs, srs: { ...prefs.srs, dailyNewCap: Number(e.target.value) } })
                }
              />
            </div>
            <div className="setting-row">
              <label className="micro-label" htmlFor="skip-steps">
                SKIP LEARNING STEPS
              </label>
              <input
                id="skip-steps"
                type="checkbox"
                checked={prefs.srs.skipLearningSteps}
                onChange={(e) =>
                  update({ ...prefs, srs: { ...prefs.srs, skipLearningSteps: e.target.checked } })
                }
              />
            </div>
          </Panel>

          <Panel title="AUDIO">
            <p className="micro-label" data-testid="tts-status">
              {tts.available ? "JAPANESE VOICE READY" : `UNAVAILABLE: ${tts.reason}`}
            </p>
          </Panel>
        </div>
      )}

      {tab === "about" && (
        <div className="about-readout">
          <Panel title="PRODUCT">
            <p>Kita (キタ) — local-first Japanese practice. Drills, grammar, SRS, progress.</p>
          </Panel>
          <Panel title="STANCE">
            <p>No account. No cloud. No server. Everything lives in this browser.</p>
          </Panel>
          <Panel title="STORAGE">
            <p>IndexedDB (Dexie): SRS cards, review logs, drill attempts, sessions.</p>
            <p>localStorage: theme, accent, level, SRS prefs, compact progress.</p>
            <p className="micro-label">CLEARING BROWSER DATA ERASES ALL PROGRESS. NO BACKUP.</p>
          </Panel>
          <Panel title="PLATFORM">
            <p>React 19 · TypeScript · Vite · ts-fsrs · Web Speech API</p>
          </Panel>
          <Panel title="CONTENT SOURCES">
            <ul className="sources" data-testid="sources">
              {CONTENT_SOURCES.map((s) => (
                <li key={s.name}>
                  <span>{s.name}</span>
                  <span className="micro-label">{s.origin}</span>
                  <span className="micro-label">{s.license}</span>
                  <span className={`micro-label ${s.clearance === "licensed" ? "ok" : "pending"}`}>
                    {s.clearance.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="CONTACT">
            <p className="micro-label">{CONTACT_PLACEHOLDER} (PLACEHOLDER — NOT A REAL INBOX)</p>
          </Panel>
          <Panel title="VERSION">
            <p className="micro-label" data-testid="version">
              v{APP_VERSION}
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}

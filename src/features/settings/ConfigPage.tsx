import { useState } from "react";
import { Panel } from "../../components/Panel";
import { status } from "../../components/tts";
import { useTheme } from "../../components/theme";
import { loadPrefs, savePrefs, type AccentName } from "../../storage/prefs";

const ACCENTS: AccentName[] = ["amber", "green", "blue", "orange", "red"];

const SOURCES = [
  { name: "Grammar lists", source: "amgidex", status: "pending clearance" },
  { name: "Example sentences", source: "Tatoeba (CC BY 2.0 FR)", status: "licensed" },
  { name: "JLPT exercises + audio", source: "japanesetest4you", status: "pending clearance" },
] as const;

export function ConfigPage() {
  const theme = useTheme();
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const tts = status();

  function update(next: typeof prefs): void {
    setPrefs(next);
    savePrefs(next);
  }

  return (
    <div className="config" data-testid="config">
      <h2 className="micro-label">CONFIG</h2>
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

        <Panel title="ABOUT / CONTENT SOURCES">
          <ul className="sources">
            {SOURCES.map((s) => (
              <li key={s.name}>
                <span>{s.name}</span>
                <span className="micro-label">{s.source}</span>
                <span className={`micro-label ${s.status === "licensed" ? "ok" : "pending"}`}>
                  {s.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
          <p className="micro-label">
            LOCAL-FIRST · PROGRESS LIVES IN THIS BROWSER ONLY · NO CLOUD BACKUP · v0.1
          </p>
          <p className="micro-label">
            CONTACT: contact@example.com (placeholder, visibly unregistered)
          </p>
        </Panel>
      </div>
    </div>
  );
}

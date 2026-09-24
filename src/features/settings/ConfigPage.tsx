import { useRef, useState } from "react";
import { status } from "../../components/tts";
import { useTheme } from "../../components/theme";
import { APP_VERSION, CONTACT_PLACEHOLDER, CONTENT_SOURCES } from "../../content/sources";
import { ACCENTS, loadPrefs, savePrefs } from "../../storage/prefs";
import { exportBackup, importBackup } from "../../storage/backup";

export function ConfigPage() {
  const theme = useTheme();
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [tab, setTab] = useState<"settings" | "about">("settings");
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tts = status();

  function update(next: typeof prefs): void {
    setPrefs(next);
    savePrefs(next);
  }

  return (
    <div className="config" data-testid="config">
      <div className="page-head">
        <div>
          <p className="label">キタ / CONFIG</p>
          <h1>Make space for your routine.</h1>
          <p className="description">Adjust the look and session preferences of this app.</p>
        </div>
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
      </div>

      {tab === "settings" && (
        <div className="settings">
          <section className="settings-section">
            <h2>Appearance</h2>
            <div className="setting">
              <div>
                <h3>Theme</h3>
                <p>The same study console, in daylight or after dark.</p>
              </div>
              <button
                type="button"
                onClick={() => theme.setTheme(theme.theme === "dark" ? "light" : "dark")}
              >
                {theme.theme.toUpperCase()}
              </button>
            </div>
            <div className="setting">
              <div>
                <h3>Accent</h3>
                <p>Used for selected controls and your next action.</p>
              </div>
              <div className="segmented" role="radiogroup" aria-label="accent color">
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
            </div>
          </section>

          <section className="settings-section">
            <h2>Review preferences</h2>
            <div className="setting">
              <div>
                <h3>
                  <label htmlFor="new-cap">DAILY NEW CARDS</label>
                </h3>
                <p>A comfortable number of new cards to introduce each day.</p>
              </div>
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
            <div className="setting">
              <div>
                <h3>
                  <label htmlFor="skip-steps">Skip learning steps</label>
                </h3>
                <p>Correct new cards graduate straight into the review schedule.</p>
              </div>
              <label className="checks">
                <input
                  id="skip-steps"
                  type="checkbox"
                  checked={prefs.srs.skipLearningSteps}
                  onChange={(e) =>
                    update({
                      ...prefs,
                      srs: { ...prefs.srs, skipLearningSteps: e.target.checked },
                    })
                  }
                />
                Enabled
              </label>
            </div>
            <div className="setting">
              <div>
                <h3>Audio</h3>
                <p>Japanese speech synthesis for prompt and example playback.</p>
              </div>
              <p className="micro-label" data-testid="tts-status">
                {tts.available ? "JAPANESE VOICE READY" : `UNAVAILABLE: ${tts.reason}`}
              </p>
            </div>
          </section>

          <section className="settings-section">
            <h2>Your data</h2>
            <p className="muted">
              Everything stays in this browser: IndexedDB holds cards, logs, attempts, grammar
              state, sessions, JLPT progress and activity; localStorage holds preferences.
            </p>
            <div className="setting">
              <div>
                <h3>Backup</h3>
                <p>Export replaces nothing until you import it. No cloud is involved.</p>
              </div>
              <div className="actions">
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const json = await exportBackup();
                      const blob = new Blob([json], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `nihoncode-backup-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setBackupStatus("EXPORTED");
                    })();
                  }}
                >
                  EXPORT PROGRESS
                </button>
                <button type="button" onClick={() => fileRef.current?.click()}>
                  IMPORT PROGRESS
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  aria-label="import backup file"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void file.text().then(async (text) => {
                      const result = await importBackup(text);
                      setBackupStatus(
                        result.ok
                          ? `IMPORTED: ${JSON.stringify(result.counts)}`
                          : `IMPORT FAILED: ${result.reason}`,
                      );
                      if (result.ok) window.location.reload();
                    });
                  }}
                />
              </div>
            </div>
            {backupStatus && (
              <p className="micro-label" data-testid="backup-status">
                {backupStatus}
              </p>
            )}
            <p className="notice">
              Import replaces everything in this browser. Clearing browser data without exporting
              first erases all progress.
            </p>
          </section>
        </div>
      )}

      {tab === "about" && (
        <div className="about-readout">
          <section className="panel">
            <div className="panel-head">
              <h2>PRODUCT</h2>
            </div>
            <p>Kita (キタ) — local-first Japanese practice. Drills, grammar, SRS, progress.</p>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>STANCE</h2>
            </div>
            <p>No account. No cloud. No server. Everything lives in this browser.</p>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>STORAGE</h2>
            </div>
            <p>
              IndexedDB (Dexie): SRS cards, review logs, drill attempts, grammar state, sessions,
              JLPT set progress, activity contributions.
            </p>
            <p>
              localStorage: theme, accent, level, SRS prefs, compact progress, seen achievements.
            </p>
            <p className="micro-label">
              CLEARING BROWSER DATA ERASES PROGRESS — USE EXPORT IN THE BACKUP SECTION FIRST.
            </p>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>PLATFORM</h2>
            </div>
            <p>React 19 · TypeScript · Vite · ts-fsrs · Web Speech API</p>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>CONTENT SOURCES</h2>
            </div>
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
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>CONTACT</h2>
            </div>
            <p className="micro-label">{CONTACT_PLACEHOLDER} (PLACEHOLDER — NOT A REAL INBOX)</p>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>VERSION</h2>
            </div>
            <p className="micro-label" data-testid="version">
              v{APP_VERSION}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

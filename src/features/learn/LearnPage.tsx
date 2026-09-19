import { Link } from "react-router-dom";
import { LockedPanel, Panel } from "../../components/Panel";
import { usePools } from "../../components/pools";
import { currentPrefs } from "../../storage/progressRepo";

export function LearnPage() {
  const prefs = currentPrefs();
  const pools = usePools(prefs.level);

  return (
    <div className="learn" data-testid="learn">
      <h2 className="micro-label">LEARN</h2>
      <div className="dash-grid">
        <Panel title="DRILLS">
          <ul className="mode-grid">
            <li>
              <Link to="/learn/drill/kana">KANA</Link>
            </li>
            <li>
              <Link to="/learn/drill/kanji">KANJI N5</Link>
            </li>
            <li>
              <Link to="/learn/drill/vocab">VOCAB N5</Link>
            </li>
            <li>
              <Link to="/learn/drill/numbers">NUMBERS</Link>
            </li>
            <li>
              <Link to="/learn/drill/dates">DATES</Link>
            </li>
          </ul>
        </Panel>

        <Panel title="GRAMMAR N5">
          {pools ? (
            <ul className="lesson-list">
              {pools.grammar.slice(0, 12).map((l) => (
                <li key={l.id}>
                  <Link to={`/learn/grammar/${l.lessonId}`}>{l.title}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="micro-label">LOADING…</p>
          )}
        </Panel>

        <Panel title="SRS REVIEW">
          <Link className="primary inline-cta" to="/learn/review">
            OPEN REVIEW QUEUE
          </Link>
        </Panel>

        <LockedPanel
          title="JLPT PRACTICE"
          reason="Deferred to Phase 2/3: remote images, truncated prompts, and unverified audio aliasing in the source sets."
        />
        <LockedPanel
          title="CONJUGATION"
          reason="Deferred to Phase 2: vocabulary lacks per-entry verb/adjective class metadata."
        />
      </div>
    </div>
  );
}

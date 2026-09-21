import { Link } from "react-router-dom";
import { Panel } from "../../components/Panel";
import { useLevel } from "../../components/level";

export function LearnPage() {
  const { pools, level } = useLevel();

  if (!pools) return <p className="micro-label">LOADING…</p>;

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
              <Link to="/learn/drill/kanji">{`KANJI ${level.toUpperCase()}`}</Link>
            </li>
            <li>
              <Link to="/learn/drill/vocab">{`VOCAB ${level.toUpperCase()}`}</Link>
            </li>
            <li>
              <Link to="/learn/drill/numbers">NUMBERS</Link>
            </li>
            <li>
              <Link to="/learn/drill/dates">DATES</Link>
            </li>
            <li>
              <Link to="/learn/drill/conjugation">CONJUGATION</Link>
            </li>
          </ul>
        </Panel>

        <Panel title={`GRAMMAR ${level.toUpperCase()}`}>
          <ul className="lesson-list">
            {pools.grammar.slice(0, 12).map((l) => (
              <li key={l.id}>
                <Link to={`/learn/grammar/${l.lessonId}`}>{l.title}</Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="SRS REVIEW">
          <Link className="primary inline-cta" to="/learn/review">
            OPEN REVIEW QUEUE
          </Link>
        </Panel>

        <Panel title="JLPT PRACTICE">
          <p className="micro-label">GRAMMAR · KANJI · VOCAB SETS BY LEVEL</p>
          <Link className="primary inline-cta" to="/learn/jlpt">
            BROWSE EXERCISE SETS
          </Link>
        </Panel>
        <Panel title="CONJUGATION">
          <Link to="/learn/drill/conjugation">VERB & ADJECTIVE FORMS</Link>
        </Panel>
      </div>
    </div>
  );
}

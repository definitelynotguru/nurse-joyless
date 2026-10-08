import type { ClinicResult } from '../../engine/api';
import Panel from './Panel';

export default function ValidationPanel({ clinic }: { clinic: ClinicResult | null }) {
  const rows = clinic?.validation ?? [];
  return (
    <Panel id="validation-section" num="11" title="Move Validation" blurb="Validate sets" art="move-validation.png" compact>
      {!clinic ? <div className="empty">Analyze a team first, then validate its sets.</div> : (
        <div className="validation-grid">
          {rows.map((v, i) => (
            <div key={i} className={`validation-card ${v.status === 'invalid' || v.issues?.length ? 'invalid' : v.warnings?.length ? 'warning' : 'valid'}`}>
              <strong>{v.species}</strong>
              <p className="meta">{v.status}{v.confidence ? ` · ${v.confidence}` : ''}</p>
              {v.issues?.length > 0 && <ul>{v.issues.map((x, j) => <li key={j} className="bad">{x}</li>)}</ul>}
              {v.warnings?.length > 0 && <ul>{v.warnings.map((x, j) => <li key={j} className="warn">{x}</li>)}</ul>}
              {v.valid?.length > 0 && (
                <details><summary>Valid ({v.valid.length})</summary>
                  <ul>{v.valid.map((x, j) => <li key={j}>{x}</li>)}</ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

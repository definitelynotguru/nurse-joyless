import type { ClinicResult } from '../../engine/api';
import Panel from './Panel';

export default function IdentityPanel({ clinic }: { clinic: ClinicResult | null }) {
  const id = clinic?.identity;
  return (
    <Panel id="identity-section" num="08" title="Team Identity" blurb="Archetype detector" art="team-identity.png" compact>
      {!id ? <div className="empty">Analyze a team first.</div> : (
        <>
          {id.primary && (
            <div className="archetype-card good" style={{ marginBottom: 16 }}>
              <h3>Primary identity — {id.primary.name}</h3>
              <div className="archetype-score">{id.primary.score}</div>
              {id.primary.evidence?.length > 0 && <ul>{id.primary.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>}
              {id.primary.plan && <p>{id.primary.plan}</p>}
            </div>
          )}
          <div className="archetype-grid">
            {(id.all || id.secondary || []).filter((x) => x !== id.primary).map((row) => (
              <div className={`archetype-card ${row.score >= 70 ? 'good' : row.score >= 40 ? 'warn' : ''}`} key={row.name}>
                <h3>{row.name}</h3>
                <div className="archetype-score">{row.score}</div>
                {row.evidence?.slice(0, 4).map((e, i) => <p key={i}>{e}</p>)}
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

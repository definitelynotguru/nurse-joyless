import type { ClinicResult } from '../../engine/api';
import { coverageMatrix } from '../../engine/api';
import Panel from './Panel';

const SEV_CLASS: Record<string, string> = { crit: 'bad', bad: 'bad', warn: 'warn', good: 'good' };

export default function Diagnosis({ clinic }: { clinic: ClinicResult | null }) {
  const a = clinic?.analysis;
  const cov = clinic ? coverageMatrix(clinic.team) : null;
  const uncovered = cov?.filter((r) => r.hitters.length === 0) ?? [];
  return (
    <Panel id="diagnosis-section" num="02" title="Diagnosis" blurb="Analyze weaknesses" compact>
      {!a ? <div className="empty">No diagnosis yet.</div> : (
        <>
          <div className="metric-grid">
            <div className={`metric-card ${a.issue > 60 ? 'bad' : a.issue > 30 ? 'warn' : 'good'}`}>
              <span>Issue load</span><strong>{a.issue}</strong>
            </div>
            <div className="metric-card"><span>Status</span><strong style={{ fontSize: 18 }}>{a.status}</strong></div>
            <div className={`metric-card ${a.missing.length ? 'warn' : 'good'}`}>
              <span>Missing roles</span><strong>{a.missing.length || '—'}</strong>
            </div>
            <div className={`metric-card ${a.red.length ? 'bad' : 'good'}`}>
              <span>Redundant</span><strong>{a.red.length || '—'}</strong>
            </div>
          </div>
          <h3 style={{ marginTop: 20 }}>Type liability chart</h3>
          <div className="triage-table">
            <table>
              <thead><tr><th>Type</th><th>Weak</th><th>4×</th><th>Resist</th><th>Immune</th><th>Score</th></tr></thead>
              <tbody>
                {a.rows.filter((r) => r.weak > 0 || r.four > 0).sort((x, y) => y.score - x.score).map((r) => (
                  <tr key={r.tp} className={SEV_CLASS[r.sev]}>
                    <td><strong>{r.tp}</strong></td><td>{r.weak}</td><td>{r.four || '—'}</td>
                    <td>{r.res}</td><td>{r.imm}</td><td>{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {uncovered.length > 0 && (
            <>
              <h3 style={{ marginTop: 20 }}>Offensive coverage gaps</h3>
              <p className="muted">Types your team cannot hit super-effectively: <strong>{uncovered.map((r) => r.type).join(', ')}</strong></p>
            </>
          )}
          {a.missing.length > 0 && (
            <p className="muted">Missing roles: {a.missing.join(', ')}</p>
          )}
        </>
      )}
    </Panel>
  );
}

import type { ClinicResult } from '../../engine/api';
import Panel from './Panel';

const SCORE_LABELS: [keyof ClinicResult['synergy']['scores'], string][] = [
  ['typeSynergy', 'Type synergy'],
  ['roleCompression', 'Role compression'],
  ['offensiveCoverage', 'Offensive coverage'],
  ['defensiveBackbone', 'Defensive backbone'],
  ['fieldControl', 'Field control'],
  ['speedControl', 'Speed control'],
  ['winReliability', 'Win reliability'],
];

export default function SynergyPanel({ clinic }: { clinic: ClinicResult | null }) {
  const s = clinic?.synergy;
  return (
    <Panel id="synergy-section" num="09" title="Synergy Checker" blurb="Structural scoring" art="synergy-checker.png" compact>
      {!s ? <div className="empty">Run Sparring Lab first.</div> : (
        <>
          <div className="metric-grid">
            {SCORE_LABELS.map(([k, label]) => {
              const v = s.scores?.[k] ?? 0;
              return (
                <div key={k} className={`metric-card ${v >= 70 ? 'good' : v >= 40 ? 'warn' : 'bad'}`}>
                  <span>{label}</span><strong>{v}</strong>
                </div>
              );
            })}
          </div>
          {s.issues?.length > 0 && (
            <>
              <h3 style={{ marginTop: 20 }}>Structural issues</h3>
              <ul>
                {s.issues.map((i, k) => (
                  <li key={k} className={i.severity}><strong>{i.title}</strong> — {i.detail}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Panel>
  );
}

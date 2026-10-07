import type { ClinicResult } from '../../engine/api';
import { speedTiers } from '../../engine/api';
import Panel from './Panel';

export default function SparringLab({ clinic }: { clinic: ClinicResult | null }) {
  const r = clinic?.report;
  const tiers = clinic ? speedTiers(clinic.team) : null;
  return (
    <Panel id="sim-section" num="07" title="Sparring Lab" blurb="Advanced team reasoning" art="matchup-matrix.png" compact>
      {!clinic ? <div className="empty">Analyze a team first to run the advanced Sparring Lab.</div> : (
        <>
          {r?.matchups && r.matchups.length > 0 && (
            <>
              <h3>Matchup matrix</h3>
              <div className="triage-table">
                <table>
                  <thead><tr><th>Threat archetype</th><th>Score</th><th>Class</th><th>Read</th><th>Plan</th></tr></thead>
                  <tbody>
                    {r.matchups.map((m) => (
                      <tr key={m.name} className={m.score < 40 ? 'bad' : m.score < 65 ? 'warn' : 'good'}>
                        <td><strong>{m.name}</strong></td><td>{m.score}</td><td>{m.class}</td>
                        <td>{m.reason}</td><td className="muted">{m.advice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {r?.needs && r.needs.length > 0 && (
            <>
              <h3 style={{ marginTop: 20 }}>Biggest needs</h3>
              <ul>{r.needs.map((n, i) => <li key={i}><strong>{n.label}</strong> — {n.why}</li>)}</ul>
            </>
          )}
          {tiers && (
            <>
              <h3 style={{ marginTop: 20 }}>Speed tiers</h3>
              <div className="triage-table">
                <table>
                  <thead><tr><th>#</th><th>Pokémon</th><th>Spe</th><th>Note</th></tr></thead>
                  <tbody>
                    {tiers.map((t, i) => (
                      <tr key={`${t.name}-${i}`} className={t.side === 'team' ? 'good' : ''}>
                        <td>{i + 1}</td><td><strong>{t.name}</strong>{t.side === 'meta' ? ' ·meta' : ''}</td>
                        <td>{t.speed}</td><td className="muted">{t.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  );
}

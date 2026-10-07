import type { ClinicResult } from '../../engine/api';
import Panel from './Panel';
import MonCard from './MonCard';

interface Props {
  teamText: string;
  setTeamText: (s: string) => void;
  clinic: ClinicResult | null;
  onAnalyze: () => void;
  onShare: () => void;
}

export default function TeamClinic({ teamText, setTeamText, clinic, onAnalyze, onShare }: Props) {
  return (
    <Panel id="team-clinic" num="01" title="Team Clinic" blurb="Paste the patient"
      action={<>
        <button className="primary small" onClick={onAnalyze}>Analyze patient</button>
        <button className="ghost small" onClick={onShare}>Copy share link</button>
      </>}>
      <div className="workbench two-column">
        <div className="terminal-card">
          <label className="label-title" htmlFor="teamInput">Showdown importable team</label>
          <textarea id="teamInput" spellCheck={false} value={teamText}
            onChange={(e) => setTeamText(e.target.value)}
            placeholder="Charizard @ Heavy-Duty Boots&#10;Ability: Blaze&#10;EVs: 4 Def / 252 SpA / 252 Spe&#10;Timid Nature&#10;- Flamethrower&#10;..." />
        </div>
        <div id="teamCards" className="cards">
          {clinic ? clinic.team.map((m, i) => <MonCard key={i} mon={m} />) : (
            <div className="empty">No patient on the chart yet. Paste a team or load the demo.</div>
          )}
        </div>
      </div>
    </Panel>
  );
}

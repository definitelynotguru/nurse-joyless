import type { ClinicResult } from '../../engine/api';

const NAV = [
  ['team-clinic', '◆', 'Team Clinic'],
  ['diagnosis-section', '◈', 'Diagnosis'],
  ['ko-section', '✚', 'KO Lab'],
  ['detective-section', '◉', 'Detective'],
  ['observer-section', '▲', 'Replay Observer'],
  ['sim-section', '✦', 'Sparring Lab'],
  ['identity-section', '★', 'Team Identity'],
  ['synergy-section', '●', 'Synergy'],
  ['assistant-section', '⬢', 'Assistant'],
  ['validation-section', '✔', 'Validation'],
  ['exports-section', '▣', 'Exports'],
];

export default function Sidebar({ clinic }: { clinic: ClinicResult | null }) {
  return (
    <div className="side-console">
      <div className="brand-chip">
        <div className="brand-heart">✚</div>
        <div><strong>NURSE<br />JOYLESS</strong><small>team clinic</small></div>
      </div>
      <nav className="pixel-menu">
        {NAV.map(([id, icon, label]) => (
          <button key={id} className="nav-btn" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </nav>
      <div className="status-cartridge">
        <span>Patient status</span>
        <strong>{clinic ? `${clinic.team.length} on chart` : 'No patient loaded'}</strong>
        <p>{clinic ? `Identity: ${clinic.identity?.primary?.name ?? 'reading…'} — issue load ${clinic.analysis.issue}` : 'Paste a team before I start judging you.'}</p>
      </div>
      <p className="mini-note">v4.0 — Vite + React + TypeScript engine. Fan-made; not affiliated with Nintendo, Game Freak, or Pokémon Showdown.</p>
    </div>
  );
}

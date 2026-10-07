import { useEffect, useState, useCallback } from 'react';
import {
  runClinic, parseTeam, SAMPLE, encodeTeamLink, decodeTeamLink,
  type ClinicResult,
} from '../engine/api';
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
import TeamClinic from './components/TeamClinic';
import Diagnosis from './components/Diagnosis';
import KoLab from './components/KoLab';
import DetectivePanel from './components/DetectivePanel';
import Prescription from './components/Prescription';
import ReplayPanel from './components/ReplayPanel';
import SparringLab from './components/SparringLab';
import IdentityPanel from './components/IdentityPanel';
import SynergyPanel from './components/SynergyPanel';
import Assistant from './components/Assistant';
import ValidationPanel from './components/ValidationPanel';
import Exports from './components/Exports';
import AgentConsole from './components/AgentConsole';

export default function App() {
  const [teamText, setTeamText] = useState('');
  const [clinic, setClinic] = useState<ClinicResult | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [error, setError] = useState('');

  // share-link boot: #team=... in the URL loads a team instantly
  useEffect(() => {
    const t = decodeTeamLink(window.location.hash);
    if (t) { setTeamText(t); }
  }, []);

  const analyze = useCallback((text: string) => {
    setError('');
    try {
      const team = parseTeam(text);
      if (!team.length) { setError('Could not parse a team — paste a Showdown importable.'); return; }
      setClinic(runClinic(text));
    } catch (e) {
      setError(`Analysis failed: ${String(e).slice(0, 200)}`);
      setClinic(null);
    }
  }, []);

  const share = async () => {
    const url = `${location.origin}${location.pathname}${encodeTeamLink(teamText)}`;
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }
    window.location.hash = encodeTeamLink(teamText);
  };

  const appendSet = (setText: string) => {
    const next = teamText.trimEnd() + '\n\n' + setText;
    setTeamText(next);
    analyze(next);
  };

  const adoptTeam = (text: string) => { setTeamText(text); analyze(text); };

  return (
    <div className="app-shell">
      <Sidebar clinic={clinic} />
      <main className="main-stage">
        <Hero onDemo={() => { setTeamText(SAMPLE); analyze(SAMPLE); }}
          onWipe={() => { setTeamText(''); setClinic(null); setError(''); }} />
        {error && <div className="panel" style={{ borderColor: 'var(--bad)' }}><p style={{ color: 'var(--bad)' }}>{error}</p></div>}
        <TeamClinic teamText={teamText} setTeamText={setTeamText} clinic={clinic}
          onAnalyze={() => analyze(teamText)} onShare={share} />
        <Diagnosis clinic={clinic} />
        <KoLab clinic={clinic} />
        <DetectivePanel clinic={clinic} />
        <Prescription clinic={clinic} onApply={adoptTeam} />
        <ReplayPanel />
        <SparringLab clinic={clinic} />
        <IdentityPanel clinic={clinic} />
        <SynergyPanel clinic={clinic} />
        <Assistant clinic={clinic} onApply={appendSet} />
        <ValidationPanel clinic={clinic} />
        <Exports clinic={clinic} />
        <footer>
          Fan-made competitive tool. Gen 9 singles focus. Not affiliated with Nintendo, Game Freak, Creatures Inc., The Pokémon Company, or Pokémon Showdown.
        </footer>
      </main>
      <AgentConsole clinic={clinic} open={agentOpen} onClose={() => setAgentOpen(false)} />
      {!agentOpen && <button className="agent-fab" title="Open Agent Console" onClick={() => setAgentOpen(true)}>⌘</button>}
    </div>
  );
}

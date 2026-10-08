import { useState, useCallback, useEffect, useRef } from 'react';
import {
  runClinic, parseTeam, teamToText, SAMPLE, encodeTeamLink, decodeTeamLink,
  warmLearnsetsFor, type ClinicResult,
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

const initialTeamText = decodeTeamLink(window.location.hash) || '';

export default function App() {
  // share-link boot: #team=... loads a team instantly AND runs the clinic
  const [teamText, setTeamText] = useState(() => initialTeamText);
  const [clinic, setClinic] = useState<ClinicResult | null>(() => {
    if (!initialTeamText) return null;
    try { return runClinic(initialTeamText); } catch { return null; }
  });
  const [agentOpen, setAgentOpen] = useState(false);
  const [error, setError] = useState('');
  // the text the currently displayed clinic was built from — lets refresh
  // actions re-run that snapshot without touching unsubmitted textarea edits
  const analyzedTextRef = useRef<string | null>(initialTeamText || null);

  const analyze = useCallback((text: string) => {
    setError('');
    try {
      const team = parseTeam(text);
      if (!team.length) { setError('Could not parse a team — paste a Showdown importable.'); return; }
      const result = runClinic(text);
      analyzedTextRef.current = text;
      setClinic(result);
      // warm learnsets in the background, then re-run so validation shows real
      // legality verdicts instead of "learnset data not loaded" warnings
      void warmLearnsetsFor(team.map((m) => m.species || '')).then(() => {
        setClinic((cur) => (cur === result ? runClinic(text) : cur));
      });
    } catch (e) {
      setError(`Analysis failed: ${String(e).slice(0, 200)}`);
      setClinic(null);
    }
  }, []);

  // boot-time learnset warm for share-link teams (async re-check, same as analyze)
  useEffect(() => {
    if (!initialTeamText) return;
    let cancelled = false;
    const bootClinic = clinic;
    const species = parseTeam(initialTeamText).map((m) => m.species || '');
    void warmLearnsetsFor(species).then(() => {
      // only re-run if the user hasn't already analyzed a different team
      if (!cancelled) setClinic((cur) => (cur === bootClinic ? runClinic(initialTeamText) : cur));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    const link = encodeTeamLink(teamText);
    if (!link) { setError('Team too large to share via link (48KB limit).'); return; }
    const url = `${location.origin}${location.pathname}${link}`;
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }
    window.location.hash = link;
  };

  const appendSet = (setText: string) => {
    const next = teamText.trimEnd() + '\n\n' + setText;
    setTeamText(next);
    analyze(next);
  };

  const replaceSet = (index: number, setText: string) => {
    const team = parseTeam(teamText);
    const add = parseTeam(setText)[0];
    if (!add || !team[index]) { appendSet(setText); return; }
    const next = teamToText(team.map((m, i) => (i === index ? add : m)));
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
        <Assistant clinic={clinic} onApply={appendSet} onReplace={replaceSet}
          onRefresh={() => { const t = analyzedTextRef.current; if (t) analyze(t); }} />
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

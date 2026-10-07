import { useState } from 'react';
import type { ClinicResult } from '../../engine/api';
import { teamToText } from '../../engine/api';
import Panel from './Panel';

export default function Exports({ clinic }: { clinic: ClinicResult | null }) {
  const [copied, setCopied] = useState('');

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1600); }
    catch { setCopied('clipboard blocked'); }
  };

  const downloadJson = () => {
    if (!clinic) return;
    const blob = new Blob([JSON.stringify(clinic.report, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nurse-joyless-report.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Panel id="exports-section" num="12" title="Exports" blurb="Export reports" art="exports-reports.png"
      action={<>
        <button className="primary small" disabled={!clinic} onClick={() => clinic && copy(clinic.markdown, 'markdown')}>Copy Markdown</button>
        <button className="ghost small" disabled={!clinic} onClick={downloadJson}>Download JSON</button>
        <button className="ghost small" disabled={!clinic} onClick={() => clinic && copy(teamToText(clinic.team), 'team')}>Copy team</button>
      </>}>
      {!clinic ? <div className="empty">Run Sparring Lab first to generate a structured report.</div> : (
        <>
          {copied && <p className="meta" style={{ color: 'var(--green)' }}>Copied {copied} ✓</p>}
          <pre className="code" style={{ maxHeight: 420, overflow: 'auto' }}>{clinic.markdown || 'Markdown report pending merge.'}</pre>
        </>
      )}
    </Panel>
  );
}

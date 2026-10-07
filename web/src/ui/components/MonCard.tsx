import type { TeamMon } from '../../engine/api';
import { spriteUrl, itemIconUrl, typeIconUrl, getSpecies } from '../../engine/api';

export default function MonCard({ mon, onRemove }: { mon: TeamMon; onRemove?: () => void }) {
  const sp = getSpecies(mon.species);
  return (
    <div className="card set">
      <div className="card-head">
        <img className="sprite" src={spriteUrl(mon.species)} alt={mon.species} width={96} height={96}
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
        <div>
          <strong>{mon.species || 'Unknown'}</strong>
          <p className="meta">
            {mon.item && <><img src={itemIconUrl(mon.item)} alt="" width={24} height={24} style={{ verticalAlign: 'middle', marginRight: 4 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />{mon.item} · </>}
            {mon.ability || 'no ability'}{mon.tera ? ` · Tera ${mon.tera}` : ''}
          </p>
          <p className="meta">
            {(sp?.types || []).map((t) => (
              <img key={t} src={typeIconUrl(t)} alt={t} title={t} height={14} style={{ marginRight: 4 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ))}
          </p>
        </div>
        {onRemove && <button className="ghost small" onClick={onRemove} title="Remove">✕</button>}
      </div>
      <ul className="moves">{mon.moves.map((mv, i) => <li key={i}>{mv}</li>)}</ul>
      <details>
        <summary>Set details</summary>
        <pre className="code">{[mon.nature && `${mon.nature} Nature`,
          mon.evs && Object.entries(mon.evs).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k.toUpperCase()}`).join(' / '),
          mon.level !== 50 && `Level: ${mon.level}`].filter(Boolean).join('\n') || 'Standard set'}</pre>
      </details>
    </div>
  );
}

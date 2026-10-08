import type { ReactNode } from 'react';

interface PanelProps {
  id: string;
  num: string;
  title: string;
  blurb: string;
  art?: string;
  action?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}

export default function Panel({ id, num, title, blurb, art, action, compact, children }: PanelProps) {
  return (
    <section className="panel stage-panel" id={id}>
      {art && <div className="section-art wide-art"><img src={`/assets/${art}`} alt={`${title} art`} /></div>}
      <div className={`panel-banner${compact ? ' compact' : ''}`}>
        <div>
          <p className="eyebrow">{num} · {title}</p>
          <h2>{blurb}</h2>
        </div>
        {action && <div className="actions">{action}</div>}
      </div>
      {children}
    </section>
  );
}

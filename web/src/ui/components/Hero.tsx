const FEATURES = [
  ['analyze-weaknesses.png', 'Diagnose', 'Type liability + role gaps'],
  ['ko-odds.png', 'KO Lab', 'Real damage engine + odds'],
  ['hidden-info.png', 'Detective', 'Hidden info from battle logs'],
  ['build-team.png', 'Rebuild', 'Targeted additions + swaps'],
];

export default function Hero({ onDemo, onWipe }: { onDemo: () => void; onWipe: () => void }) {
  return (
    <>
      <header className="hero" id="hero">
        <section className="hero-copy frame glow">
          <p className="eyebrow">Emergency intake · v4</p>
          <h1>Nurse<br />Joyless</h1>
          <p className="tagline">Nurse Joy heals Pokémon. Nurse Joyless heals bad decisions. Paste a Showdown team; get a diagnosis, a matchup matrix, KO odds, and a rebuild prescription.</p>
          <div className="actions">
            <button className="primary" onClick={onDemo}>Load demo patient</button>
            <button className="ghost" onClick={onWipe}>Wipe chart</button>
          </div>
        </section>
        <div className="hero-art frame"><img src="/assets/splash.png" alt="Nurse Joyless splash art" /></div>
      </header>
      <section className="feature-strip">
        {FEATURES.map(([img, title, sub]) => (
          <div className="feature-card" key={title} onClick={() => document.querySelector('.main-stage section')?.scrollIntoView({ behavior: 'smooth' })}>
            <img src={`/assets/${img}`} alt={title} />
            <strong>{title}</strong><span>{sub}</span>
          </div>
        ))}
      </section>
    </>
  );
}

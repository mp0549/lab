import React, { useEffect, useRef, useState } from 'react';
import GameCard from '../components/GameCard';
import games from '../gamesData';

function SysStatus() {
  const states = ['CALIBRATING…', 'MONITORING SUBJECT', 'ANOMALY DETECTED', 'STABLE'];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % states.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="lab-sys-badge">
      <span className="lab-sys-dot" />
      SYS: {states[idx]}
    </div>
  );
}

export default function MainMenu() {
  const [accessCount, setAccessCount] = useState(0);
  const [buildLabel, setBuildLabel] = useState('BUILD 0.1.3');
  const [buildFlicker, setBuildFlicker] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef(null);

  useEffect(() => {
    const reset = () => {
      setIsIdle(false);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIsIdle(true), 60000);
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, reset));
    reset();
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset));
      clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (accessCount >= 2) {
      setBuildFlicker(true);
      const t = setTimeout(() => {
        setBuildLabel('BUILD 0.1.4');
        setTimeout(() => setBuildFlicker(false), 400);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [accessCount]);

  return (
    <div className={`grid-bg${isIdle ? ' idle' : ''}`}>
      <a
        href="https://mp0549.github.io/my-portfolio/"
        target="_blank"
        rel="noopener noreferrer"
        className="lab-portfolio-link"
      >
        RESEARCHER PORTFOLIO ↗
      </a>
      <SysStatus />

      <main className="lab-main">
        <header className="lab-header">
          <p className="lab-eyebrow">INTERACTIVE EXPERIMENTAL BOARD</p>
          <h1 className="lab-wordmark">THE LAB</h1>
          <p className="lab-desc">{games.length} experiments active &mdash; proceed with curiosity</p>
          <div className={`lab-buildrow${buildFlicker ? ' flicker' : ''}`}>
            <span>{buildLabel}</span>
            <span className="lab-sep-dot">&middot;</span>
            <span>STATUS: OPERATIONAL</span>
          </div>
        </header>

        <div className="lab-rule" />

        <div className="annotations pointer-events-none" aria-hidden="true">
          <div className="note left-note">results may vary</div>
          <div className="note right-note">do not terminate test</div>
          <div className="note bottom-note">subject behaving unexpectedly</div>
        </div>

        <section className="lab-grid">
          {games.map((g, i) => (
            <GameCard
              key={g.id}
              title={g.title}
              subtitle={g.tagline}
              href={g.route}
              image={g.image}
              moduleId={`EXP-${String(i + 1).padStart(2, '0')}`}
              onAccess={() => setAccessCount((c) => c + 1)}
            />
          ))}
        </section>

        <footer className="lab-footer">
          <span>EXPERIMENTAL RESEARCH DIVISION</span>
          <span className="lab-sep-dot">&middot;</span>
          <span>ALL RESULTS UNVERIFIED</span>
          <span className="lab-sep-dot">&middot;</span>
          <span>{buildLabel}</span>
        </footer>
      </main>

      {isIdle && (
        <div className="lab-idle-overlay">
          <span>AWAITING INPUT<span className="lab-blink">_</span></span>
        </div>
      )}
    </div>
  );
}

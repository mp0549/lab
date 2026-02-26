import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const MESSAGES = [
  'SUBJECT HAS WANDERED OFF-GRID',
  'ROUTE NOT FOUND IN SPECIMEN CATALOG',
  'THIS PATH IS UNCHARTED TERRITORY',
  'EXPERIMENT DOES NOT EXIST',
  'NAVIGATION ANOMALY DETECTED',
];

export default function NotFound() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid-bg crypto-page">
      <div className="notfound-panel">

        {/* ── Header ── */}
        <div className="crypto-header">
          <Link to="/" className="crypto-back">← BACK</Link>
          <div className="crypto-header-center">
            <p className="crypto-eyebrow">EXPERIMENT — NAVIGATION FAILURE</p>
          </div>
          <span className="crypto-header-led" aria-hidden="true" />
        </div>

        <div className="crypto-rule" />

        {/* ── Body ── */}
        <div className="notfound-body">
          <p className="crypto-eyebrow">ERROR CODE</p>
          <h1 className="notfound-code">404</h1>

          <div className="crypto-rule notfound-rule" />

          <p className="notfound-status">
            STATUS: <strong>LOST</strong>
          </p>
          <p className="notfound-msg">
            {MESSAGES[msgIdx]}<span className="lab-blink">_</span>
          </p>

          <Link to="/" className="crypto-action-btn notfound-btn">
            RETURN TO LAB →
          </Link>
        </div>

        <div className="crypto-rule" />

        {/* ── Footer ── */}
        <div className="notfound-foot">
          <span>EXPERIMENTAL RESEARCH DIVISION</span>
          <span className="lab-sep-dot">&middot;</span>
          <span>ALL RESULTS UNVERIFIED</span>
        </div>

      </div>
    </div>
  );
}

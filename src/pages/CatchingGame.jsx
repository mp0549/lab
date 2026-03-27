import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ── Node type definitions ──────────────────────────────────────────
const TYPES = {
  standard: { color: "#e8c940", glow: "rgba(232,201,64,0.2)",   pts: 1, size: 26, dodge: false, power: null   },
  surge:    { color: "#9de8ff", glow: "rgba(157,232,255,0.22)", pts: 3, size: 22, dodge: false, power: null   },
  hazard:   { color: "#e84545", glow: "rgba(232,69,69,0.2)",    pts: 0, size: 24, dodge: true,  power: null   },
  slow:     { color: "#c084fc", glow: "rgba(192,132,252,0.2)",  pts: 1, size: 22, dodge: false, power: "slow" },
  wide:     { color: "#4ade80", glow: "rgba(74,222,128,0.2)",   pts: 1, size: 22, dodge: false, power: "wide" },
  bomb:     { color: "#fb923c", glow: "rgba(251,146,60,0.2)",   pts: 0, size: 28, dodge: false, power: "bomb" },
};

const POWER_DUR = { slow: 7000, wide: 8000 };

function pickType(elapsed) {
  const hazardRate = Math.min(elapsed / 80, 0.20);
  const r = Math.random();
  if (r < hazardRate)              return "hazard";
  if (r < hazardRate + 0.11)       return "surge";
  if (r < hazardRate + 0.17)       return "slow";
  if (r < hazardRate + 0.22)       return "wide";
  if (r < hazardRate + 0.26)       return "bomb";
  return "standard";
}

// ── Canvas draw helpers ────────────────────────────────────────────
function drawNode(ctx, node, ts) {
  const { x, y, size, type } = node;
  const def = TYPES[type];
  const cx = x + size / 2, cy = y + size / 2, r = size / 2;
  const pulse = 0.92 + 0.08 * Math.sin(ts / 360 + cx * 0.04);

  // Glow halo
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
  g.addColorStop(0, def.glow); g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2); ctx.fill();

  ctx.lineCap = "round";

  if (type === "hazard") {
    ctx.beginPath(); ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = def.color; ctx.lineWidth = 1.8; ctx.stroke();
    const arm = r * 0.62; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - arm, cy - arm); ctx.lineTo(cx + arm, cy + arm); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + arm, cy - arm); ctx.lineTo(cx - arm, cy + arm); ctx.stroke();
    return;
  }

  // Base orb
  ctx.beginPath(); ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
  ctx.fillStyle = def.color; ctx.fill();

  if (type === "surge") {
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = def.color; ctx.lineWidth = 1; ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1;
  } else if (type === "slow") {
    [1.55, 2.0].forEach(s => {
      ctx.beginPath(); ctx.arc(cx, cy, r * s * (0.97 + 0.03 * Math.sin(ts / 200)), 0, Math.PI * 2);
      ctx.strokeStyle = def.color; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.28; ctx.stroke();
    }); ctx.globalAlpha = 1;
  } else if (type === "wide") {
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy); ctx.lineTo(cx + r * 0.55, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.3); ctx.lineTo(cx - r * 0.58, cy); ctx.lineTo(cx - r * 0.3, cy + r * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r * 0.3); ctx.lineTo(cx + r * 0.58, cy); ctx.lineTo(cx + r * 0.3, cy + r * 0.3); ctx.stroke();
  } else if (type === "bomb") {
    ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy + r * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.stroke();
  }

  // Highlight
  ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.42)"; ctx.fill();
}

const MILESTONE_MSGS = [
  "SAMPLE BATCH ACQUIRED", "ANOMALY CONTAINED", "INTAKE RATE OPTIMAL",
  "THRESHOLD EXCEEDED",   "FIELD AGENT EFFICIENT", "DATA CLUSTER SECURED",
  "YIELD ABOVE PROJECTED", "SIGNAL LOCK MAINTAINED",
];

// ── Component ──────────────────────────────────────────────────────
export default function CatchingGame() {
  const canvasRef = useRef(null);
  const [gameKey, setGameKey] = useState(0);

  // Display state — synced from refs via interval, NOT from inside the RAF loop
  const [display, setDisplay] = useState({
    score: 0, lives: 5, combo: 0, gameOver: false,
  });
  const [milestone, setMilestone]         = useState("");
  const [showMilestone, setShowMilestone] = useState(false);
  const prevDisplayScoreRef = useRef(0);

  // Game-logic refs (the game loop reads/writes these — no setState inside rAF)
  const scoreRef     = useRef(0);
  const livesRef     = useRef(5);
  const comboRef     = useRef(0);
  const gameOverRef  = useRef(false);
  const startTimeRef = useRef(null);
  const flashRef     = useRef(0);
  const powerRef     = useRef({ slow: 0, wide: 0 });
  const basketRef    = useRef({ x: 240, width: 92, height: 10, speed: 9 });
  const nodesRef     = useRef([]);
  const particlesRef = useRef([]);
  const popupsRef    = useRef([]);
  const keys         = useRef({ left: false, right: false });

  // ── Keyboard ──────────────────────────────────────────────────
  useEffect(() => {
    const dn = e => {
      if (e.key === "ArrowLeft"  || e.key === "a") keys.current.left  = true;
      if (e.key === "ArrowRight" || e.key === "d") keys.current.right = true;
    };
    const up = e => {
      if (e.key === "ArrowLeft"  || e.key === "a") keys.current.left  = false;
      if (e.key === "ArrowRight" || e.key === "d") keys.current.right = false;
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // ── Touch ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const onMove = e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const tx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      basketRef.current.x = Math.max(0,
        Math.min(canvas.width - basketRef.current.width, tx - basketRef.current.width / 2));
    };
    canvas.addEventListener("touchmove", onMove, { passive: false });
    return () => canvas.removeEventListener("touchmove", onMove);
  }, []);

  // ── Milestone watcher (runs on display.score change) ─────────
  useEffect(() => {
    const s = display.score;
    if (s > 0 && s % 5 === 0 && s !== prevDisplayScoreRef.current) {
      prevDisplayScoreRef.current = s;
      setMilestone(MILESTONE_MSGS[Math.floor(Math.random() * MILESTONE_MSGS.length)]);
      setShowMilestone(true);
      setTimeout(() => setShowMilestone(false), 1800);
    }
  }, [display.score]);

  // ── Game loop ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    let lastSpawnTime = 0;
    let raf;
    startTimeRef.current = null;

    const loop = (ts) => {
      if (gameOverRef.current) return;

      if (!startTimeRef.current) startTimeRef.current = ts;
      const elapsed = (ts - startTimeRef.current) / 1000;

      const slowActive = powerRef.current.slow > ts;
      const wideActive = powerRef.current.wide > ts;

      // ── Difficulty ──────────────────────────────────────────
      const baseSpeed     = Math.min(1.5 + elapsed * 0.014, 4.0);
      const speedJitter   = 0.25 + Math.min(elapsed * 0.004, 0.6);
      const spawnInterval = Math.max(700, 1800 - elapsed * 11);
      const maxConcurrent = Math.min(1 + Math.floor(elapsed / 30), 4);

      // ── Background + grid ───────────────────────────────────
      ctx.fillStyle = "#0d0d12";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < canvas.width; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
      }
      for (let gy = 0; gy < canvas.height; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
      }

      // Slow tint
      if (slowActive) {
        ctx.fillStyle = "rgba(192,132,252,0.055)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Flash
      if (flashRef.current > ts) {
        const a = ((flashRef.current - ts) / 420) * 0.35;
        ctx.fillStyle = `rgba(200,30,30,${a})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Danger border
      if (livesRef.current <= 2) {
        ctx.strokeStyle = `rgba(232,69,69,${0.14 + 0.1 * Math.sin(ts / 270)})`;
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      }

      // ── Spawn ────────────────────────────────────────────────
      const liveCount = nodesRef.current.filter(n => !n.missed && !n.toDelete).length;
      if (ts - lastSpawnTime > spawnInterval && liveCount < maxConcurrent) {
        const type = pickType(elapsed);
        const def  = TYPES[type];
        const spd  = Math.max(0.5, baseSpeed + (Math.random() - 0.5) * speedJitter);
        nodesRef.current.push({
          x: 20 + Math.random() * (canvas.width - def.size - 40),
          y: -def.size - 4,
          size: def.size, speed: spd, type,
          missed: false, missedTimer: 0, toDelete: false,
        });
        lastSpawnTime = ts;
      }

      // ── Basket ──────────────────────────────────────────────
      if (keys.current.left)  basketRef.current.x -= basketRef.current.speed;
      if (keys.current.right) basketRef.current.x += basketRef.current.speed;
      const bw = wideActive ? 160 : 92;
      basketRef.current.x = Math.max(0, Math.min(canvas.width - bw, basketRef.current.x));
      const bx = basketRef.current.x;
      const bh = basketRef.current.height;
      const by = canvas.height - bh - 12;

      // ── Update + draw nodes ──────────────────────────────────
      for (const node of nodesRef.current) {
        if (node.toDelete) continue;

        if (!node.missed) {
          node.y += slowActive ? node.speed * 0.42 : node.speed;

          const ncx = node.x + node.size / 2;
          const caught =
            node.y + node.size >= by &&
            node.y + node.size <= by + bh + 8 &&
            ncx >= bx - 4 && ncx <= bx + bw + 4;

          if (caught) {
            const def = TYPES[node.type];
            node.toDelete = true;

            if (def.dodge) {
              // Hazard caught → lose life
              flashRef.current = ts + 420;
              comboRef.current = 0;
              livesRef.current = Math.max(0, livesRef.current - 1);
              if (livesRef.current <= 0) { gameOverRef.current = true; continue; }

            } else if (def.power === "bomb") {
              // PURGE: clear screen, big bonus
              let cleared = 0;
              for (const n of nodesRef.current) {
                if (!n.toDelete && !n.missed && n.type !== "hazard") { n.toDelete = true; cleared++; }
              }
              const bonus = cleared * 2 + 5;
              scoreRef.current += bonus;
              comboRef.current += 1;
              for (let i = 0; i < 24; i++) {
                const angle = (Math.PI * 2 * i) / 24;
                particlesRef.current.push({
                  x: canvas.width / 2, y: canvas.height / 2,
                  vx: Math.cos(angle) * (2 + Math.random() * 3.5),
                  vy: Math.sin(angle) * (2 + Math.random() * 3.5),
                  life: 1.2, color: TYPES.bomb.color,
                });
              }
              popupsRef.current.push({
                x: ncx, y: by - 8,
                text: `PURGE  +${bonus}`, life: 1.6, color: TYPES.bomb.color, big: true,
              });

            } else {
              // Collectible (standard / surge / slow / wide)
              comboRef.current += 1;
              const mult = 1 + Math.floor(comboRef.current / 5);
              const pts  = def.pts * mult;
              scoreRef.current += pts;

              if (def.power) {
                powerRef.current[def.power] = ts + POWER_DUR[def.power];
                popupsRef.current.push({
                  x: ncx, y: by - 8,
                  text: `${def.power.toUpperCase()} ACTIVE`,
                  life: 1.3, color: def.color, big: true,
                });
              } else {
                popupsRef.current.push({
                  x: ncx, y: by - 8,
                  text: `+${pts}`, life: 1, color: mult > 1 ? "#9de8ff" : def.color, big: false,
                });
              }

              for (let i = 0; i < 10; i++) {
                const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
                const spd = 1.5 + Math.random() * 2.5;
                particlesRef.current.push({
                  x: ncx, y: node.y + node.size / 2,
                  vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
                  life: 1, color: def.color,
                });
              }
            }
            continue; // skip draw for this node
          }

          // Fell past basket
          if (node.y > canvas.height - 8) {
            node.missed = true;
            node.missedTimer = ts + 620;
            if (!TYPES[node.type].dodge) {
              flashRef.current = ts + 280;
              comboRef.current = 0;
            }
          }
        }

        if (node.missed) {
          const mcx = node.x + node.size / 2;
          const mcy = canvas.height - 16;
          const arm = node.size * 0.3;
          ctx.strokeStyle = "rgba(192,57,43,0.6)";
          ctx.lineWidth = 2; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(mcx - arm, mcy - arm); ctx.lineTo(mcx + arm, mcy + arm); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(mcx + arm, mcy - arm); ctx.lineTo(mcx - arm, mcy + arm); ctx.stroke();

          if (ts > node.missedTimer) {
            if (!TYPES[node.type].dodge) {
              livesRef.current = Math.max(0, livesRef.current - 1);
              if (livesRef.current <= 0) { gameOverRef.current = true; node.toDelete = true; continue; }
            }
            node.toDelete = true;
          }
        } else {
          drawNode(ctx, node, ts);
        }
      }

      nodesRef.current = nodesRef.current.filter(n => !n.toDelete);

      // ── Particles ────────────────────────────────────────────
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.91; p.vy *= 0.91;
        p.life -= 0.038;
        if (p.life <= 0) continue;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.8 * Math.min(p.life, 1), 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.min(p.life, 1); ctx.fill();
      }
      ctx.globalAlpha = 1;
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // ── Score popups ─────────────────────────────────────────
      ctx.textAlign = "center";
      for (const pop of popupsRef.current) {
        pop.y -= 0.85; pop.life -= 0.028;
        ctx.globalAlpha = Math.min(pop.life * 2, 1);
        ctx.fillStyle = pop.color;
        ctx.font = pop.big ? "bold 12px 'Courier New'" : "bold 11px 'Courier New'";
        ctx.fillText(pop.text, pop.x, pop.y);
      }
      ctx.globalAlpha = 1; ctx.textAlign = "left";
      popupsRef.current = popupsRef.current.filter(p => p.life > 0);

      // ── Basket draw ──────────────────────────────────────────
      if (wideActive) {
        ctx.fillStyle = "rgba(74,222,128,0.07)";
        ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
      }
      ctx.fillStyle = "#f0f0ee";
      ctx.fillRect(bx, by, bw, bh);
      const basketAccent = wideActive ? "#4ade80" : slowActive ? "#c084fc" : "#e8c940";
      ctx.fillStyle = basketAccent;
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillRect(bx, by, 3, bh);
      ctx.fillRect(bx + bw - 3, by, 3, bh);

      // ── Canvas HUD overlays ──────────────────────────────────
      // Combo
      if (comboRef.current >= 5) {
        const mult = 1 + Math.floor(comboRef.current / 5);
        ctx.font = "700 10px 'Courier New'"; ctx.fillStyle = "#9de8ff"; ctx.globalAlpha = 0.9;
        ctx.fillText(`COMBO ×${mult}`, 10, canvas.height - 14);
        ctx.globalAlpha = 1;
      }

      // Power-up timers (top-left bars)
      ctx.font = "9px 'Courier New'"; ctx.textAlign = "left";
      let py = 18;
      if (slowActive) {
        const frac = Math.max(0, (powerRef.current.slow - ts) / POWER_DUR.slow);
        ctx.fillStyle = "rgba(192,132,252,0.75)"; ctx.fillRect(8, py - 8, 80 * frac, 3);
        ctx.fillStyle = "rgba(192,132,252,0.55)"; ctx.globalAlpha = 0.8;
        ctx.fillText("SLOW", 8, py + 6); ctx.globalAlpha = 1; py += 20;
      }
      if (wideActive) {
        const frac = Math.max(0, (powerRef.current.wide - ts) / POWER_DUR.wide);
        ctx.fillStyle = "rgba(74,222,128,0.75)"; ctx.fillRect(8, py - 8, 80 * frac, 3);
        ctx.fillStyle = "rgba(74,222,128,0.55)"; ctx.globalAlpha = 0.8;
        ctx.fillText("WIDE", 8, py + 6); ctx.globalAlpha = 1;
      }

      // Legend (bottom-right, very subtle)
      ctx.font = "8px 'Courier New'"; ctx.globalAlpha = 0.25; ctx.textAlign = "right";
      const lx = canvas.width - 8;
      let ly = canvas.height - 72;
      [["#e8c940","● STD +1"], ["#9de8ff","● SRG +3"], ["#c084fc","● SLOW"],
       ["#4ade80","● WIDE"],   ["#fb923c","● PURGE"],  ["#e84545","✕ DODGE"]].forEach(([c,t]) => {
        ctx.fillStyle = c; ctx.fillText(t, lx, ly); ly += 12;
      });
      ctx.globalAlpha = 1; ctx.textAlign = "left";

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameKey]);

  // ── Display sync: interval-based, fully decoupled from the RAF loop ──
  useEffect(() => {
    const id = setInterval(() => {
      setDisplay({
        score:    scoreRef.current,
        lives:    livesRef.current,
        combo:    comboRef.current,
        gameOver: gameOverRef.current,
      });
    }, 50);
    return () => clearInterval(id);
  }, []);

  // ── Restart ────────────────────────────────────────────────────
  const restartGame = () => {
    nodesRef.current = []; particlesRef.current = []; popupsRef.current = [];
    scoreRef.current = 0; livesRef.current = 5; comboRef.current = 0;
    gameOverRef.current = false; startTimeRef.current = null; flashRef.current = 0;
    powerRef.current = { slow: 0, wide: 0 };
    basketRef.current.x = 240;
    prevDisplayScoreRef.current = 0;
    setDisplay({ score: 0, lives: 5, combo: 0, gameOver: false });
    setGameKey(k => k + 1);
  };

  const { score, lives, combo, gameOver } = display;
  const comboMult = 1 + Math.floor(combo / 5);
  // Compute live power-up remaining ms at render time (performance.now() matches RAF timestamps)
  const slowMs = Math.max(0, powerRef.current.slow - performance.now());
  const wideMs = Math.max(0, powerRef.current.wide - performance.now());

  return (
    <div className="crypto-page">
      <div className="bb-panel" style={{ maxWidth: 700 }}>

        {/* Header */}
        <div className="crypto-header">
          <Link to="/" className="crypto-back">← Back</Link>
          <div className="crypto-header-center">
            <p className="crypto-eyebrow">EXP-03 · DATA COLLECTION ARRAY</p>
            <h1 className="crypto-title">NODE CATCH</h1>
          </div>
          <div style={{ width: 28 }} />
        </div>
        <div className="crypto-rule" />

        {/* Status bar */}
        <div className="bb-status">
          <div className="bb-stat-group">
            <span className="bb-stat-label">SCORE</span>
            <span className="bb-stat-val">{String(score).padStart(3, "0")}</span>
          </div>
          <div className="bb-stat-group">
            <span className="bb-stat-label">INTEGRITY</span>
            <span className="bb-stat-val" style={{ letterSpacing: "0.3em" }}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} style={{ color: i < lives ? "#e8c940" : "#252525" }}>■</span>
              ))}
            </span>
          </div>
          {combo >= 5 && (
            <div className="bb-stat-group">
              <span className="bb-stat-label">COMBO</span>
              <span className="bb-stat-val" style={{ color: "#9de8ff" }}>×{comboMult}</span>
            </div>
          )}
        </div>

        {/* Power-up bars */}
        {(slowMs > 0 || wideMs > 0) && (
          <div style={{
            padding: "0.4rem 1rem 0.5rem",
            display: "flex", gap: "1.25rem", flexWrap: "wrap",
            borderTop: "1px solid #ebebeb",
          }}>
            {slowMs > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flex: 1, minWidth: 120 }}>
                <span style={{ fontFamily: "'Courier New',monospace", fontSize: "0.55rem", letterSpacing: "0.14em", color: "#c084fc", textTransform: "uppercase", flexShrink: 0 }}>SLOW</span>
                <div style={{ flex: 1, height: 2, background: "#e8e8e8", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, right: `${(1 - slowMs / POWER_DUR.slow) * 100}%`, background: "#c084fc" }} />
                </div>
              </div>
            )}
            {wideMs > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flex: 1, minWidth: 120 }}>
                <span style={{ fontFamily: "'Courier New',monospace", fontSize: "0.55rem", letterSpacing: "0.14em", color: "#4ade80", textTransform: "uppercase", flexShrink: 0 }}>WIDE</span>
                <div style={{ flex: 1, height: 2, background: "#e8e8e8", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, right: `${(1 - wideMs / POWER_DUR.wide) * 100}%`, background: "#4ade80" }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="crypto-rule" />

        {/* Canvas */}
        <div className="bb-canvas-wrap" style={{ position: "relative" }}>
          <canvas ref={canvasRef} width={650} height={460} className="bb-canvas" />

          {showMilestone && (
            <div style={{
              position: "absolute", bottom: "2.2rem", left: 0, right: 0,
              textAlign: "center", fontFamily: "'Courier New',monospace",
              fontSize: "0.6rem", letterSpacing: "0.24em", textTransform: "uppercase",
              color: "#e8c940", pointerEvents: "none",
              animation: "nodePop 0.5s ease-out, nodeFade 1.3s ease-out 0.5s forwards",
            }}>
              {milestone}
            </div>
          )}

          {gameOver && (
            <div className="bb-end-overlay">
              <p className="bb-end-eyebrow">EXPERIMENT TERMINATED</p>
              <h2 className="bb-end-title">SESSION OVER</h2>
              <div className="crypto-rule bb-end-rule" />
              <p className="bb-end-score">NODES COLLECTED · {String(score).padStart(3, "0")}</p>
              <div className="bb-end-actions">
                <button onClick={restartGame} className="crypto-action-btn">RESTART</button>
                <Link to="/" className="crypto-action-btn">← LAB</Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bb-instructions">
          A / ← · MOVE LEFT &nbsp;·&nbsp; D / → · MOVE RIGHT &nbsp;·&nbsp; DODGE RED ✕
        </div>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "0.3rem 1.1rem",
          padding: "0.5rem 1rem 0.7rem", borderTop: "1px solid #f0f0f0",
          fontFamily: "'Courier New',monospace", fontSize: "0.55rem",
          letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa",
        }}>
          {[
            ["#e8c940", "● Standard  +1"],
            ["#9de8ff", "● Surge  +3"],
            ["#c084fc", "● Slow  – slows all nodes"],
            ["#4ade80", "● Wide  – bigger basket"],
            ["#fb923c", "● Purge  – clears screen"],
            ["#e84545", "✕ Hazard  – dodge it"],
          ].map(([color, label]) => (
            <span key={label}><span style={{ color }}>{label.slice(0, 1)}</span>{label.slice(1)}</span>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes nodePop  { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1)} }
        @keyframes nodeFade { 0%{opacity:1} 100%{opacity:0} }
      `}</style>
    </div>
  );
}

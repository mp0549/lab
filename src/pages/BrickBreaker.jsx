import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import cuteHeart  from "../assets/photos/cuteheart.png";
import brokenHeart from "../assets/photos/cutebrokenheart.png";

import sfxBreak from "../assets/sfx/breaking.mp3";
import sfxNooo  from "../assets/sfx/noooo.mp3";
import sfxPop   from "../assets/sfx/pop.mp3";
import sfxStart from "../assets/sfx/mixkit-retro-arcade-casino-notification-211.wav";

/* ── Module-level constants (visual only, no gameplay impact) ── */

const BRICK_VISUAL = {
  normal: { fill: "#2a2a3a", border: "#484864", text: "#8888aa", label: "STD" },
  strong: { fill: "#1a2a3a", border: "#2a5a8a", text: "#4a8ac0", label: "HRD" },
  steel:  { fill: "#1e1e1e", border: "#484848", text: "#707070", label: "STL" },
  power:  { fill: "#0a2a0a", border: "#1a681a", text: "#40a040", label: "PWR" },
};

const POW_COLORS = { expand: "#e8c940", multiball: "#a0a0e8", slow: "#40b8d0" };
const POW_LABELS = { expand: "WIDE",    multiball: "MULTI",   slow: "SLOW"    };

const BRICK_SCORES = { normal: 10, strong: 25, steel: 40, power: 15 };

const MUT_INFO = {
  invert:  { label: "CONTROLS INVERTED",    color: "#e8c940", dur: 4200 },
  gravity: { label: "GRAVITY DISTORTION",   color: "#e06040", dur: 5000 },
  regen:   { label: "SPECIMEN REGENERATED", color: "#40b840", dur: 3000 },
};

/* ─────────────────────────────────────────────────────────────── */

export default function BrickBreaker() {
  const canvasRef = useRef(null);

  /* ── Existing state (unchanged) ── */
  const [gameOver,       setGameOver]       = useState(false);
  const [lives,          setLives]          = useState(3);
  const [lifeLostFlash,  setLifeLostFlash]  = useState(false);
  const [labEnabled,     setLabEnabled]     = useState(false);
  const [showTimer,      setShowTimer]      = useState(true);
  const [mutationCountdown, setMutationCountdown] = useState(null);

  /* ── New state ── */
  const [score,          setScore]          = useState(0);
  const [activeMutation, setActiveMutation] = useState(null); // { label, color }
  const [glitching,      setGlitching]      = useState(false);

  /* ── Existing refs (unchanged) ── */
  const pausedRef        = useRef(false);
  const gameRunning      = useRef(true);
  const animationRef     = useRef(null);
  const labRef           = useRef(false);
  const nextMutationRef  = useRef(0);
  const mutationStartRef = useRef(0);

  /* ── New refs ── */
  const showTimerRef          = useRef(showTimer);   // fix stale-closure bug
  const scoreRef              = useRef(0);
  const lastCountdownRef      = useRef(null);        // throttle countdown updates
  const glitchTimerRef        = useRef(null);
  const mutIndicatorTimerRef  = useRef(null);

  /* ── Keep showTimerRef in sync (doesn't restart game) ── */
  useEffect(() => { showTimerRef.current = showTimer; }, [showTimer]);

  /* ── Sync labRef (unchanged logic) ── */
  useEffect(() => {
    labRef.current = labEnabled;
    if (labEnabled) scheduleNextMutation();
    else setMutationCountdown(null);
  }, [labEnabled]);

  /* ── scheduleNextMutation (unchanged) ── */
  function scheduleNextMutation() {
    const duration = 4500 + Math.random() * 3000;
    nextMutationRef.current  = duration;
    mutationStartRef.current = performance.now();
  }

  /* ══════════════════════════════════════════════════════════════
     MAIN GAME EFFECT
     deps: [] — FIX: was [showTimer], which restarted the game
     every time the timer toggle was clicked.
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    canvas.width  = 500;
    canvas.height = 600;

    const img   = new Image();
    img.src     = cuteHeart;

    /* ── Sounds ── */
    const breakSound = new Audio(sfxBreak);
    const popSound   = new Audio(sfxPop);
    const noooSound  = new Audio(sfxNooo);
    const startSound = new Audio(sfxStart);

    startSound.volume = 0.3;
    startSound.play().catch(() => {}); // FIX: was missing .catch

    /* ── Ball constants (unchanged) ── */
    const BALL_BASE_SPEED  = 5;
    const BALL_MAX_SPEED   = 9;
    const BALL_ACCELERATION = 0.04;

    /* ── Paddle (unchanged) ── */
    const paddle = {
      width:  100,
      height: 15,
      x: canvas.width / 2 - 50,
      y: canvas.height - 40,
      speed: 7,
      dx: 0,
    };

    let balls    = [];
    let powerUps = [];
    let bricks   = [];

    /* ── Ball helpers (unchanged) ── */
    function createBall(x, y, dx, dy, speed = BALL_BASE_SPEED) {
      balls.push({ x, y, radius: 10, dx, dy, speed });
    }

    function resetBall() {
      balls = [];
      const angle = (Math.random() * Math.PI) / 3 + Math.PI / 6;
      const dir   = Math.random() > 0.5 ? 1 : -1;
      createBall(
        canvas.width / 2,
        canvas.height - 60,
        Math.cos(angle) * BALL_BASE_SPEED * dir,
        -Math.abs(Math.sin(angle) * BALL_BASE_SPEED),
        BALL_BASE_SPEED
      );
    }

    resetBall();

    /* ── Brick types (unchanged) ── */
    const BRICK_TYPES = {
      normal: { hits: 1, color: "#f472b6" },
      strong: { hits: 2, color: "#fb7185" },
      steel:  { hits: 3, color: "#94a3b8" },
      power:  { hits: 1, color: "#34d399" },
    };

    const brickRows    = 5;
    const brickCols    = 7;
    const brickWidth   = 60;
    const brickHeight  = 20;
    const brickPadding = 10;
    const offsetX      = 30;
    const offsetY      = 40;

    function randomBrickType() {
      const rand = Math.random();
      if (rand < 0.6)  return "normal";
      if (rand < 0.8)  return "strong";
      if (rand < 0.95) return "steel";
      return "power";
    }

    function initBricks() {
      bricks = [];
      for (let r = 0; r < brickRows; r++) {
        for (let c = 0; c < brickCols; c++) {
          const type = randomBrickType();
          bricks.push({
            x: offsetX + c * (brickWidth + brickPadding),
            y: offsetY + r * (brickHeight + brickPadding),
            width: brickWidth,
            height: brickHeight,
            type,
            hitsLeft: BRICK_TYPES[type].hits,
          });
        }
      }
    }

    initBricks();

    /* ── Power-ups (unchanged) ── */
    function spawnPowerUp(x, y) {
      const types = ["expand", "multiball", "slow"];
      const type  = types[Math.floor(Math.random() * types.length)];
      powerUps.push({ x, y, type, size: 14, dy: 2 });
    }

    function applyPowerUp(type) {
      if (type === "expand") {
        paddle.width = Math.min(paddle.width + 40, 180);
        setTimeout(() => (paddle.width = 100), 8000);
      }
      if (type === "multiball") {
        const clones = balls.map((b) => ({ ...b, dx: -b.dx }));
        balls.push(...clones);
      }
      if (type === "slow") {
        balls.forEach((b) => { b.speed *= 0.7; b.dx *= 0.7; b.dy *= 0.7; });
        setTimeout(() => { balls.forEach((b) => (b.speed = BALL_BASE_SPEED)); }, 6000);
      }
    }

    /* ── Mutation trigger (physics unchanged; visual effects added after) ── */
    function triggerMutation() {
      const types = ["invert", "gravity", "regen"];
      const type  = types[Math.floor(Math.random() * types.length)];

      /* --- Existing gameplay logic (DO NOT TOUCH) --- */
      if (type === "invert") {
        paddle.speed *= -1;
        setTimeout(() => (paddle.speed *= -1), 4000);
      }
      if (type === "gravity") {
        balls.forEach((b) => (b.dy += 1));
      }
      if (type === "regen") {
        bricks.forEach((b) => {
          if (b.hitsLeft === 0 && Math.random() < 0.25) b.hitsLeft = 1;
        });
      }
      /* --- End unchanged block --- */

      /* --- NEW: visual indicator + glitch (additive, no gameplay change) --- */
      const info = MUT_INFO[type];
      if (info) {
        setGlitching(true);
        clearTimeout(glitchTimerRef.current);
        glitchTimerRef.current = setTimeout(() => setGlitching(false), 580);

        setActiveMutation(info);
        clearTimeout(mutIndicatorTimerRef.current);
        mutIndicatorTimerRef.current = setTimeout(() => setActiveMutation(null), info.dur);
      }
    }

    /* ── Collision helper (unchanged) ── */
    function collideBallBrick(ball, b) {
      const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.width));
      const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.height));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      return dx * dx + dy * dy <= ball.radius * ball.radius;
    }

    /* ── loseLife — FIX: was `< 0`, player got 4 lives instead of 3 ── */
    function loseLife() {
      if (pausedRef.current) return;
      pausedRef.current = true;
      setLifeLostFlash(true);

      noooSound.currentTime = 0;
      noooSound.play().catch(() => {});

      setLives((prev) => {
        const newLives = prev - 1;
        if (newLives <= 0) {          // FIX: was `< 0`
          setGameOver(true);
          stopGame();
          return 0;                   // FIX: was `return prev` (kept stale display)
        }
        setTimeout(() => {
          resetBall();
          setLifeLostFlash(false);
          pausedRef.current = false;
        }, 1200);
        return newLives;
      });
    }

    /* ── stopGame (unchanged) ── */
    function stopGame() {
      gameRunning.current = false;
      cancelAnimationFrame(animationRef.current);
    }

    /* ── updateBalls — score tracking added (additive only) ── */
    function updateBalls() {
      balls.forEach((ball) => {
        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width)
          ball.dx *= -1;
        if (ball.y - ball.radius <= 0)
          ball.dy *= -1;

        if (
          ball.y + ball.radius >= paddle.y &&
          ball.x >= paddle.x &&
          ball.x <= paddle.x + paddle.width &&
          ball.dy > 0
        ) {
          const hitPoint = (ball.x - paddle.x) / paddle.width;
          const angle    = (hitPoint - 0.5) * Math.PI * 0.9;

          ball.speed = Math.min(ball.speed + BALL_ACCELERATION, BALL_MAX_SPEED);
          ball.dx    = Math.sin(angle) * ball.speed;
          ball.dy    = -Math.cos(angle) * ball.speed;

          popSound.currentTime = 0;
          popSound.play().catch(() => {});
        }

        bricks.forEach((b) => {
          if (b.hitsLeft > 0 && collideBallBrick(ball, b)) {
            b.hitsLeft--;

            if (b.type === "power" && b.hitsLeft === 0)
              spawnPowerUp(b.x + b.width / 2, b.y + b.height / 2);

            if (b.hitsLeft === 0) {
              breakSound.currentTime = 0;
              breakSound.play().catch(() => {});

              /* NEW: score (additive, no gameplay change) */
              scoreRef.current += BRICK_SCORES[b.type] || 10;
              setScore(scoreRef.current);
            }

            ball.dy *= -1;
          }
        });
      });

      balls = balls.filter((b) => b.y - b.radius <= canvas.height);
      if (balls.length === 0) loseLife();
    }

    /* ── updatePowerUps (unchanged) ── */
    function updatePowerUps() {
      powerUps.forEach((p) => {
        p.y += p.dy;
        if (
          p.y + p.size >= paddle.y &&
          p.x >= paddle.x &&
          p.x <= paddle.x + paddle.width
        ) {
          applyPowerUp(p.type);
          p.collected = true;
        }
      });
      powerUps = powerUps.filter((p) => !p.collected && p.y < canvas.height);
    }

    /* ── update — FIX: showTimer stale closure + throttle re-renders ── */
    function update() {
      if (!gameRunning.current) return;

      if (!pausedRef.current) {
        paddle.x += paddle.dx;
        paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
        updateBalls();
        updatePowerUps();
      }

      if (labRef.current) {
        const now       = performance.now();
        const elapsed   = now - mutationStartRef.current;
        const remaining = nextMutationRef.current - elapsed;

        /* FIX: was `showTimer` (stale closure) → `showTimerRef.current`
           FIX: was setState every frame → throttle to only when value changes */
        if (showTimerRef.current) {
          const val = Math.max(0, (remaining / 1000).toFixed(1));
          if (val !== lastCountdownRef.current) {
            lastCountdownRef.current = val;
            setMutationCountdown(val);
          }
        }

        if (remaining <= 0) {
          triggerMutation();
          scheduleNextMutation();
        }
      }

      draw();
      animationRef.current = requestAnimationFrame(update);
    }

    /* ── draw — restyled for lab theme (no gameplay change) ── */
    function draw() {
      /* Dark canvas background */
      ctx.fillStyle = "#0d0d12";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* Subtle graph-paper grid overlay */
      ctx.beginPath();
      for (let x = 0; x <= canvas.width;  x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
      for (let y = 0; y <= canvas.height; y += 20) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);   }
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth   = 0.5;
      ctx.stroke();

      /* Paddle — white with soft glow */
      ctx.shadowColor = "rgba(240,240,238,0.3)";
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = "#f0f0ee";
      ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
      ctx.shadowBlur  = 0;

      /* Bricks — lab colour scheme with type labels */
      ctx.font         = '7px "Courier New", monospace';
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";

      bricks.forEach((b) => {
        if (b.hitsLeft <= 0) return;
        const v       = BRICK_VISUAL[b.type] || BRICK_VISUAL.normal;
        const maxHits = BRICK_TYPES[b.type].hits;
        const damage  = 1 - b.hitsLeft / maxHits;

        ctx.fillStyle = v.fill;
        ctx.fillRect(b.x, b.y, b.width, b.height);

        /* Darken damaged bricks */
        if (damage > 0) {
          ctx.fillStyle = `rgba(0,0,0,${(damage * 0.45).toFixed(2)})`;
          ctx.fillRect(b.x, b.y, b.width, b.height);
        }

        ctx.strokeStyle = v.border;
        ctx.lineWidth   = 1;
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.width - 1, b.height - 1);

        /* Type label (shows remaining HP for multi-hit bricks) */
        ctx.fillStyle = v.text;
        const lbl = maxHits > 1 && b.hitsLeft < maxHits
          ? `${v.label}:${b.hitsLeft}`
          : v.label;
        ctx.fillText(lbl, b.x + b.width / 2, b.y + b.height / 2);
      });

      ctx.textAlign    = "left";
      ctx.textBaseline = "alphabetic";

      /* Balls — keep cute heart image */
      balls.forEach((ball) => {
        ctx.drawImage(img, ball.x - ball.radius, ball.y - ball.radius,
          ball.radius * 2, ball.radius * 2);
      });

      /* Power-ups — lab capsule style */
      ctx.font         = '7px "Courier New", monospace';
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";

      powerUps.forEach((p) => {
        const col = POW_COLORS[p.type] || "#ffffff";
        const lbl = POW_LABELS[p.type] || p.type.toUpperCase();
        const pw  = 38, ph = 14;

        ctx.strokeStyle = col;
        ctx.lineWidth   = 1;
        ctx.strokeRect(p.x - pw / 2, p.y - ph / 2, pw, ph);
        ctx.fillStyle   = col + "18";
        ctx.fillRect(p.x - pw / 2, p.y - ph / 2, pw, ph);
        ctx.fillStyle   = col;
        ctx.fillText(lbl, p.x, p.y);
      });

      ctx.textAlign    = "left";
      ctx.textBaseline = "alphabetic";
    }

    update();

    /* ── Keyboard (unchanged) ── */
    function keyDown(e) {
      if (["ArrowRight", "d", "D"].includes(e.key)) paddle.dx =  paddle.speed;
      else if (["ArrowLeft", "a", "A"].includes(e.key)) paddle.dx = -paddle.speed;
    }
    function keyUp() { paddle.dx = 0; }

    /* ── Mouse control (additive — was missing) ── */
    function onMouseMove(e) {
      const rect   = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const mx     = (e.clientX - rect.left) * scaleX;
      paddle.x     = Math.max(0, Math.min(canvas.width - paddle.width, mx - paddle.width / 2));
    }

    document.addEventListener("keydown",   keyDown);
    document.addEventListener("keyup",     keyUp);
    canvas.addEventListener("mousemove",   onMouseMove);

    return () => {
      document.removeEventListener("keydown",  keyDown);
      document.removeEventListener("keyup",    keyUp);
      canvas.removeEventListener("mousemove",  onMouseMove);
      cancelAnimationFrame(animationRef.current);
      clearTimeout(glitchTimerRef.current);
      clearTimeout(mutIndicatorTimerRef.current);
    };
  }, []); /* FIX: was [showTimer] — caused full game restart on timer toggle */

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="grid-bg crypto-page">
      <div className="bb-panel">

        {/* ── Header ── */}
        <div className="crypto-header">
          <Link to="/" className="crypto-back">← BACK</Link>
          <div className="crypto-header-center">
            <p className="crypto-eyebrow">EXPERIMENT — SPECIMEN CONTAINMENT</p>
            <h1 className="crypto-title">BREAKOUT</h1>
          </div>
          <span className="crypto-header-led" aria-hidden="true" />
        </div>

        <div className="crypto-rule" />

        {/* ── Status bar ── */}
        <div className="bb-status">
          <div className="bb-stat-group">
            <span className="bb-stat-label">SCORE</span>
            <span className="bb-stat-val">{String(score).padStart(5, "0")}</span>
          </div>

          <div className="bb-stat-group">
            <span className="bb-stat-label">LIVES</span>
            <span className="bb-lives">
              {Array.from({ length: 3 }).map((_, i) => (
                <img
                  key={i}
                  src={i < lives ? cuteHeart : brokenHeart}
                  className="bb-life-pip"
                  alt={i < lives ? "life" : "lost"}
                />
              ))}
            </span>
          </div>

          <div className="bb-ctrl-group">
            <button
              onClick={() => setLabEnabled((p) => !p)}
              className={`bb-toggle${labEnabled ? " on" : ""}`}
            >
              LAB {labEnabled ? "ON" : "OFF"}
            </button>
            {labEnabled && (
              <button
                onClick={() => setShowTimer((p) => !p)}
                className="bb-toggle"
              >
                TIMER {showTimer ? "ON" : "OFF"}
              </button>
            )}
          </div>
        </div>

        {/* ── Mutation countdown ── */}
        {labEnabled && showTimer && mutationCountdown !== null && (
          <div className="bb-countdown">
            NEXT MUTATION IN {mutationCountdown}s
          </div>
        )}

        {/* ── Per-mutation indicator ── */}
        {activeMutation && (
          <div
            className="bb-mutation-bar"
            style={{ "--mut-color": activeMutation.color }}
          >
            <span className="bb-mut-warn">!</span>
            MUTATION ACTIVE &mdash; {activeMutation.label}
          </div>
        )}

        <div className="crypto-rule" />

        {/* ── Canvas ── */}
        <div className="bb-canvas-wrap">
          <canvas
            ref={canvasRef}
            className={`bb-canvas${glitching ? " bb-glitch" : ""}`}
          />

          {/* Life-lost flash */}
          {lifeLostFlash && !gameOver && (
            <div className="bb-flash-overlay">SPECIMEN LOST</div>
          )}

          {/* Game over */}
          {gameOver && (
            <div className="bb-end-overlay">
              <p className="bb-end-eyebrow">EXPERIMENT TERMINATED</p>
              <h2 className="bb-end-title">GAME OVER</h2>
              <div className="crypto-rule bb-end-rule" />
              <p className="bb-end-score">FINAL SCORE &nbsp; {String(score).padStart(5, "0")}</p>
              <div className="bb-end-actions">
                <button onClick={() => window.location.reload()} className="crypto-action-btn">
                  RESTART
                </button>
                <Link to="/" className="crypto-action-btn">RETURN TO LAB</Link>
              </div>
            </div>
          )}
        </div>

        <div className="crypto-rule" />

        {/* ── Instructions ── */}
        <div className="bb-instructions">
          ← → / A D / MOUSE &nbsp;·&nbsp; MOVE PADDLE &nbsp;·&nbsp; LAB MODE ACTIVATES MUTATIONS
        </div>

      </div>
    </div>
  );
}

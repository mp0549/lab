import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import cuteHeart  from "../assets/photos/cuteheart.png";
import brokenHeart from "../assets/photos/cutebrokenheart.png";

import sfxBreak from "../assets/sfx/breaking.mp3";
import sfxNooo  from "../assets/sfx/noooo.mp3";
import sfxPop   from "../assets/sfx/pop.mp3";
import sfxStart from "../assets/sfx/mixkit-retro-arcade-casino-notification-211.wav";

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
  invert:  { label: "INVERTED",   color: "#e8c940" },
  gravity: { label: "GRAVITY",    color: "#e06040" },
  regen:   { label: "REGEN",      color: "#40b840" },
  shrink:  { label: "SHRINK",     color: "#c040e8" },
  speed:   { label: "ACCELERATE", color: "#40d0e8" },
  wind:    { label: "WIND",       color: "#4080e8" },
  shake:   { label: "TREMOR",     color: "#e08040" },
};

/* ─────────────────────────────────────────────────────────────── */

export default function BrickBreaker() {
  const canvasRef = useRef(null);

  const [gameKey,           setGameKey]           = useState(0);
  const [gameOver,          setGameOver]          = useState(false);
  const [lives,             setLives]             = useState(3);
  const [lifeLostFlash,     setLifeLostFlash]     = useState(false);
  const [labEnabled,        setLabEnabled]        = useState(false);
  const [showTimer,         setShowTimer]         = useState(true);
  const [mutationCountdown, setMutationCountdown] = useState(null);
  const [score,             setScore]             = useState(0);
  const [activeMutations,   setActiveMutations]   = useState(new Set());
  const [glitching,         setGlitching]         = useState(false);

  const pausedRef          = useRef(false);
  const gameRunning        = useRef(true);
  const animationRef       = useRef(null);
  const labRef             = useRef(false);
  const nextMutationRef    = useRef(0);
  const mutationStartRef   = useRef(0);
  const showTimerRef       = useRef(showTimer);
  const scoreRef           = useRef(0);
  const lastCountdownRef   = useRef(null);
  const glitchTimerRef     = useRef(null);
  const activeMutationsRef = useRef(new Set());
  const gravityRef         = useRef(false);
  const windRef            = useRef({ active: false, dir: 1 });
  const shakeRef           = useRef(false);
  const speedMultRef       = useRef(1);
  const regenLastRef       = useRef(0);
  const toggleMutationRef   = useRef(null);
  const clearAllMutationsRef = useRef(null);
  const livesRef             = useRef(3);

  useEffect(() => { showTimerRef.current = showTimer; }, [showTimer]);

  useEffect(() => {
    labRef.current = labEnabled;
    if (labEnabled) {
      scheduleNextMutation();
    } else {
      setMutationCountdown(null);
      clearAllMutationsRef.current?.();
    }
  }, [labEnabled]);

  function scheduleNextMutation() {
    const duration = 4500 + Math.random() * 3000;
    nextMutationRef.current  = duration;
    mutationStartRef.current = performance.now();
  }

  function handleRestart() {
    // Reset all mutation refs so the new game loop starts clean
    activeMutationsRef.current = new Set();
    gravityRef.current         = false;
    windRef.current            = { active: false, dir: 1 };
    shakeRef.current           = false;
    speedMultRef.current       = 1;
    regenLastRef.current       = 0;
    gameRunning.current        = true;
    pausedRef.current          = false;
    scoreRef.current           = 0;
    livesRef.current           = 3;
    lastCountdownRef.current   = null;
    // Reset React state (lab/timer preserved intentionally)
    setActiveMutations(new Set());
    setScore(0);
    setLives(3);
    setGameOver(false);
    setLifeLostFlash(false);
    setGlitching(false);
    setMutationCountdown(null);
    // Kick off a fresh game loop
    setGameKey(k => k + 1);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    canvas.width  = 500;
    canvas.height = 600;

    // If lab was already on when we restarted, kick off the mutation timer
    if (labRef.current) scheduleNextMutation();

    const img = new Image();
    img.src   = cuteHeart;

    const breakSound = new Audio(sfxBreak);
    const popSound   = new Audio(sfxPop);
    const noooSound  = new Audio(sfxNooo);
    const startSound = new Audio(sfxStart);

    startSound.volume = 0.3;
    startSound.play().catch(() => {});

    const BALL_BASE_SPEED   = 5;
    const BALL_MAX_SPEED    = 9;
    const BALL_ACCELERATION = 0.04;

    const paddle = {
      width:  100,
      height: 15,
      x: canvas.width / 2 - 50,
      y: canvas.height - 40,
      speed: 10,
      dx: 0,
    };

    let balls    = [];
    let powerUps = [];
    let bricks   = [];

    function createBall(x, y, dx, dy, speed = BALL_BASE_SPEED) {
      balls.push({ x, y, radius: 10, dx, dy, speed });
    }

    function resetBall() {
      balls = [];
      const angle = (Math.random() * Math.PI) / 3 + Math.PI / 6;
      const dir   = Math.random() > 0.5 ? 1 : -1;
      const spd   = Math.min(BALL_BASE_SPEED * speedMultRef.current, BALL_MAX_SPEED);
      createBall(
        canvas.width / 2,
        canvas.height - 60,
        Math.cos(angle) * spd * dir,
        -Math.abs(Math.sin(angle) * spd),
        spd
      );
    }

    resetBall();

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

    function spawnPowerUp(x, y) {
      const types = ["expand", "multiball", "slow"];
      const type  = types[Math.floor(Math.random() * types.length)];
      powerUps.push({ x, y, type, size: 14, dy: 2 });
    }

    function applyPowerUp(type) {
      if (type === "expand") {
        paddle.width = Math.min(paddle.width + 40, 180);
        const baseW  = activeMutationsRef.current.has("shrink") ? 70 : 100;
        setTimeout(() => (paddle.width = baseW), 8000);
      }
      if (type === "multiball") {
        const clones = balls.map((b) => ({ ...b, dx: -b.dx }));
        balls.push(...clones);
      }
      if (type === "slow") {
        balls.forEach((b) => { b.speed *= 0.7; b.dx *= 0.7; b.dy *= 0.7; });
        setTimeout(() => {
          const spd = Math.min(BALL_BASE_SPEED * speedMultRef.current, BALL_MAX_SPEED);
          balls.forEach((b) => (b.speed = spd));
        }, 6000);
      }
    }

    function triggerMutation(forcedType) {
      let type = forcedType;
      if (type === undefined) {
        const all      = Object.keys(MUT_INFO);
        const inactive = all.filter(t => !activeMutationsRef.current.has(t));
        if (inactive.length === 0) return;
        type = inactive[Math.floor(Math.random() * inactive.length)];
      }
      if (activeMutationsRef.current.has(type)) return;
      activeMutationsRef.current.add(type);
      setActiveMutations(new Set(activeMutationsRef.current));

      if (type === "invert") {
        paddle.speed *= -1;
      }
      if (type === "gravity") {
        gravityRef.current = true;
      }
      if (type === "regen") {
        regenLastRef.current = performance.now();
        bricks.forEach(b => {
          if (b.hitsLeft === 0 && Math.random() < 0.3) b.hitsLeft = 1;
        });
      }
      if (type === "shrink") {
        paddle.width = Math.max(40, paddle.width - 30);
      }
      if (type === "speed") {
        speedMultRef.current = 1.6;
        balls.forEach(b => {
          const mag    = Math.hypot(b.dx, b.dy);
          const target = Math.min(mag * 1.6, BALL_MAX_SPEED);
          if (mag > 0) { b.dx = b.dx / mag * target; b.dy = b.dy / mag * target; }
          b.speed = target;
        });
      }
      if (type === "wind") {
        windRef.current = { active: true, dir: Math.random() > 0.5 ? 1 : -1 };
      }
      if (type === "shake") {
        shakeRef.current = true;
      }

      setGlitching(true);
      clearTimeout(glitchTimerRef.current);
      glitchTimerRef.current = setTimeout(() => setGlitching(false), 580);
    }

    function deactivateMutation(type) {
      activeMutationsRef.current.delete(type);
      setActiveMutations(new Set(activeMutationsRef.current));

      if (type === "invert")  paddle.speed *= -1;
      if (type === "gravity") gravityRef.current = false;
      if (type === "shrink")  paddle.width = Math.min(paddle.width + 30, 100);
      if (type === "speed") {
        speedMultRef.current = 1;
        balls.forEach(b => {
          const mag = Math.hypot(b.dx, b.dy);
          if (mag > 0) { b.dx = b.dx / mag * BALL_BASE_SPEED; b.dy = b.dy / mag * BALL_BASE_SPEED; }
          b.speed = BALL_BASE_SPEED;
        });
      }
      if (type === "wind")  windRef.current.active = false;
      if (type === "shake") shakeRef.current = false;
    }

    toggleMutationRef.current = (type) => {
      if (activeMutationsRef.current.has(type)) deactivateMutation(type);
      else triggerMutation(type);
    };

    clearAllMutationsRef.current = () => {
      [...activeMutationsRef.current].forEach(t => deactivateMutation(t));
    };


    function collideBallBrick(ball, b) {
      const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.width));
      const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.height));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      return dx * dx + dy * dy <= ball.radius * ball.radius;
    }

    function loseLife() {
      if (pausedRef.current) return;
      pausedRef.current = true;
      setLifeLostFlash(true);

      noooSound.currentTime = 0;
      noooSound.play().catch(() => {});

      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);

      if (newLives <= 0) {
        setGameOver(true);
        stopGame();
        return;
      }

      setTimeout(() => {
        resetBall();
        setLifeLostFlash(false);
        pausedRef.current = false;
      }, 1200);
    }

    function stopGame() {
      gameRunning.current = false;
      cancelAnimationFrame(animationRef.current);
    }

    function updateBalls() {
      balls.forEach((ball) => {
        if (gravityRef.current) ball.dy += 0.12;
        if (windRef.current.active) {
          ball.dx += windRef.current.dir * 0.07;
          ball.dx = Math.max(-BALL_MAX_SPEED, Math.min(BALL_MAX_SPEED, ball.dx));
        }

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

    function update() {
      if (!gameRunning.current) return;

      if (!pausedRef.current) {
        if (shakeRef.current) paddle.x += (Math.random() - 0.5) * 6;
        paddle.x += paddle.dx;
        paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
        updateBalls();
        updatePowerUps();
      }

      if (labRef.current) {
        const now       = performance.now();
        const elapsed   = now - mutationStartRef.current;
        const remaining = nextMutationRef.current - elapsed;

        if (showTimerRef.current) {
          const val = Math.max(0, (remaining / 1000).toFixed(1));
          if (val !== lastCountdownRef.current) {
            lastCountdownRef.current = val;
            setMutationCountdown(val);
          }
        }

        if (activeMutationsRef.current.has("regen")) {
          const now2 = performance.now();
          if (now2 - regenLastRef.current > 6000) {
            regenLastRef.current = now2;
            bricks.forEach(b => {
              if (b.hitsLeft === 0 && Math.random() < 0.2) b.hitsLeft = 1;
            });
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

    function draw() {
      ctx.fillStyle = "#0d0d12";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      for (let x = 0; x <= canvas.width;  x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
      for (let y = 0; y <= canvas.height; y += 20) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);   }
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth   = 0.5;
      ctx.stroke();

      ctx.shadowColor = "rgba(240,240,238,0.3)";
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = "#f0f0ee";
      ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
      ctx.shadowBlur  = 0;

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

        if (damage > 0) {
          ctx.fillStyle = `rgba(0,0,0,${(damage * 0.45).toFixed(2)})`;
          ctx.fillRect(b.x, b.y, b.width, b.height);
        }

        ctx.strokeStyle = v.border;
        ctx.lineWidth   = 1;
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.width - 1, b.height - 1);

        ctx.fillStyle = v.text;
        const lbl = maxHits > 1 && b.hitsLeft < maxHits
          ? `${v.label}:${b.hitsLeft}`
          : v.label;
        ctx.fillText(lbl, b.x + b.width / 2, b.y + b.height / 2);
      });

      ctx.textAlign    = "left";
      ctx.textBaseline = "alphabetic";

      balls.forEach((ball) => {
        ctx.drawImage(img, ball.x - ball.radius, ball.y - ball.radius,
          ball.radius * 2, ball.radius * 2);
      });

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

    function keyDown(e) {
      if (["ArrowRight", "d", "D"].includes(e.key)) paddle.dx =  paddle.speed;
      else if (["ArrowLeft", "a", "A"].includes(e.key)) paddle.dx = -paddle.speed;
    }
    function keyUp() { paddle.dx = 0; }

    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup",   keyUp);

    return () => {
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup",   keyUp);
      cancelAnimationFrame(animationRef.current);
      clearTimeout(glitchTimerRef.current);
    };
  }, [gameKey]); // re-runs on restart; lab/timer state intentionally excluded (stable refs)

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
                  className={`bb-life-pip${i >= lives ? " lost" : ""}`}
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
        {labEnabled && (
          <div
            className="bb-countdown"
            style={{ visibility: showTimer && mutationCountdown !== null ? "visible" : "hidden" }}
          >
            NEXT MUTATION IN {mutationCountdown ?? 0}s
          </div>
        )}

        {/* ── Mutation status chips ── */}
        {labEnabled && (
          <div className="bb-mut-indicators">
            {Object.entries(MUT_INFO).map(([type, info]) => (
              <div
                key={type}
                className={`bb-mut-chip${activeMutations.has(type) ? " active" : ""}`}
                style={{ "--mut-color": info.color }}
                onClick={() => toggleMutationRef.current?.(type)}
              >
                {info.label}
              </div>
            ))}
          </div>
        )}

        <div className="crypto-rule" />

        {/* ── Canvas ── */}
        <div className="bb-canvas-wrap">
          <canvas
            ref={canvasRef}
            className={`bb-canvas${glitching ? " bb-glitch" : ""}`}
          />

          {lifeLostFlash && !gameOver && (
            <div className="bb-flash-overlay">SPECIMEN LOST</div>
          )}

          {gameOver && (
            <div className="bb-end-overlay">
              <p className="bb-end-eyebrow">EXPERIMENT TERMINATED</p>
              <h2 className="bb-end-title">GAME OVER</h2>
              <div className="crypto-rule bb-end-rule" />
              <p className="bb-end-score">FINAL SCORE &nbsp; {String(score).padStart(5, "0")}</p>
              <div className="bb-end-actions">
                <button onClick={handleRestart} className="crypto-action-btn">
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
          ← → / A D &nbsp;·&nbsp; MOVE PADDLE &nbsp;·&nbsp; LAB MODE ACTIVATES MUTATIONS
        </div>

      </div>
    </div>
  );
}

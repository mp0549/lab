import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";

// TODO: import game-specific assets here
// import myImage from "../assets/photos/cuteheart.png";
// import sfxBounce from "../assets/sfx/pop.mp3";

// ─── Constants ───────────────────────────────────────────────────────────────
// TODO: define your game constants here
const CANVAS_W = 500;
const CANVAS_H = 500;

// ─── Component ───────────────────────────────────────────────────────────────
export default function GameTemplate() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  // gameKey forces the useEffect to re-run on restart
  const [gameKey,  setGameKey]  = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score,    setScore]    = useState(0);

  // Use refs for values the game loop reads every frame (avoids stale closures)
  const scoreRef      = useRef(0);
  const gameRunning   = useRef(true);

  // ── Restart ──────────────────────────────────────────────────────────────
  function handleRestart() {
    scoreRef.current    = 0;
    gameRunning.current = true;
    setScore(0);
    setGameOver(false);
    setGameKey((k) => k + 1);
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    // TODO: initialize game objects here
    // e.g. const player = { x: CANVAS_W / 2, y: CANVAS_H - 40, w: 60, h: 12 };

    function endGame() {
      gameRunning.current = false;
      cancelAnimationFrame(animRef.current);
      setGameOver(true);
    }

    function update() {
      if (!gameRunning.current) return;

      // TODO: update game state each frame
      // e.g. player.x += player.dx;

      draw();
      animRef.current = requestAnimationFrame(update);
    }

    function draw() {
      // Clear
      ctx.fillStyle = "#0d0d12";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Subtle grid lines (matches lab aesthetic)
      ctx.beginPath();
      for (let x = 0; x <= CANVAS_W; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); }
      for (let y = 0; y <= CANVAS_H; y += 20) { ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); }
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth   = 0.5;
      ctx.stroke();

      // TODO: draw game objects here
      // e.g. ctx.fillStyle = "#f0f0ee"; ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    // ── Input ──────────────────────────────────────────────────────────────
    // TODO: adjust keys for your game
    function onKeyDown(e) {
      // e.g. if (e.key === "ArrowLeft") player.dx = -6;
    }
    function onKeyUp(e) {
      // e.g. player.dx = 0;
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup",   onKeyUp);

    update();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup",   onKeyUp);
      cancelAnimationFrame(animRef.current);
    };
  }, [gameKey]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="grid-bg crypto-page">
      <div className="gt-panel">

        {/* Header */}
        <div className="crypto-header">
          <Link to="/" className="crypto-back">← BACK</Link>
          <div className="crypto-header-center">
            {/* TODO: update eyebrow and title */}
            <p className="crypto-eyebrow">EXPERIMENT — SPECIMEN TYPE</p>
            <h1 className="crypto-title">GAME TITLE</h1>
          </div>
          <span className="crypto-header-led" aria-hidden="true" />
        </div>

        <div className="crypto-rule" />

        {/* Status bar */}
        <div className="gt-status">
          <div className="gt-stat">
            <span className="gt-stat-label">SCORE</span>
            <span className="gt-stat-val">{String(score).padStart(5, "0")}</span>
          </div>
          {/* TODO: add more stats (lives, level, timer, etc.) */}
        </div>

        <div className="crypto-rule" />

        {/* Canvas */}
        <div className="gt-canvas-wrap">
          <canvas ref={canvasRef} className="gt-canvas" />

          {/* Game-over overlay */}
          {gameOver && (
            <div className="bb-end-overlay">
              <p className="bb-end-eyebrow">EXPERIMENT TERMINATED</p>
              {/* TODO: swap in a win message when applicable */}
              <h2 className="bb-end-title">GAME OVER</h2>
              <div className="crypto-rule bb-end-rule" />
              <p className="bb-end-score">FINAL SCORE &nbsp; {String(score).padStart(5, "0")}</p>
              <div className="bb-end-actions">
                <button onClick={handleRestart} className="crypto-action-btn">RESTART</button>
                <Link to="/" className="crypto-action-btn">RETURN TO LAB</Link>
              </div>
            </div>
          )}
        </div>

        <div className="crypto-rule" />

        {/* Instructions */}
        {/* TODO: update controls description */}
        <div className="gt-instructions">
          ← → / A D &nbsp;·&nbsp; MOVE &nbsp;·&nbsp; SPACE &nbsp;·&nbsp; ACTION
        </div>

      </div>
    </div>
  );
}

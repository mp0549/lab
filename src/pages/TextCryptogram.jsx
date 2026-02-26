import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";

/* ============================================================
   GLOBAL PUZZLE CACHE (persists across navigation)
============================================================ */

const puzzleCache = {};
let hasPreloaded = false;

/* ============================================================
   TEXT BUILDING (multi-sentence splice, 90–160 chars)
============================================================ */

function buildPlayableText(text, min = 90, max = 160) {
  const sentences = text.split(/(?<=[.!?])\s+/);

  let result = "";

  for (let s of sentences) {
    const cleaned = s
      .replace(/\([^)]*\)/g, "")
      .replace(/[^a-zA-Z0-9\s.,!?'-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) continue;

    if ((result + " " + cleaned).length > max) break;

    result += (result ? " " : "") + cleaned;

    if (result.length >= min) break;
  }

  if (result.length < min) return null;

  return result.toUpperCase();
}

/* ============================================================ */

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/* ============================================================ */

function matchesCategory(data, category) {
  if (category === "general") return true;

  const desc = data.description?.toLowerCase() || "";

  if (category === "people") {
    return (
      desc.includes("born") ||
      desc.includes("actor") ||
      desc.includes("writer") ||
      desc.includes("scientist")
    );
  }

  if (category === "places") {
    return desc.match(/city|country|town|village|capital|state/);
  }

  return true;
}

/* ============================================================ */

async function getRandomPuzzle(category) {
  while (true) {
    const res = await fetch(
      "https://en.wikipedia.org/api/rest_v1/page/random/summary"
    );
    const data = await res.json();

    if (!data.extract || data.type !== "standard") continue;
    if (!matchesCategory(data, category)) continue;

    const playable = buildPlayableText(data.extract);
    if (!playable) continue;

    return playable;
  }
}

async function getDailyPuzzle(category) {
  const seed = `${getTodayString()}-${category}`;
  const number = hashString(seed);
  const pageId = (number % 1000000) + 1;

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${pageId}`
    );
    const data = await res.json();

    if (!data.extract || data.type !== "standard")
      return getRandomPuzzle(category);

    if (!matchesCategory(data, category))
      return getRandomPuzzle(category);

    const playable = buildPlayableText(data.extract);
    if (!playable) return getRandomPuzzle(category);

    return playable;
  } catch {
    return getRandomPuzzle(category);
  }
}

/* ============================================================ */

function generateCipherNumbers(plaintext) {
  const letters = [...new Set(
    plaintext
      .toUpperCase()
      .split("")
      .filter((ch) => /[A-Z]/.test(ch))
  )];

  const nums = Array.from({ length: 26 }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  const map = {};
  letters.forEach((letter, idx) => {
    map[letter] = nums[idx];
  });

  return map;
}

function buildPuzzleData(plaintext, cipherMap) {
  return plaintext.split("").map((ch) => {
    const up = ch.toUpperCase();
    if (/[A-Z]/.test(up)) {
      return { type: "letter", plain: up, code: cipherMap[up] };
    }
    if (ch === " ") return { type: "space" };
    return { type: "punct", char: ch };
  });
}

function moveToNextLetter(data, index) {
  for (let i = index + 1; i < data.length; i++) {
    if (data[i].type === "letter") return i;
  }
  return index;
}

function moveToPrevLetter(data, index) {
  for (let i = index - 1; i >= 0; i--) {
    if (data[i].type === "letter") return i;
  }
  return index;
}

/* ============================================================ */

export default function Cryptogram() {
  const [restartKey, setRestartKey] = useState(0);
  const [activeIndex, setActiveIndex] = useState(null);
  const [guesses, setGuesses] = useState({});
  const [phrase, setPhrase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revealsUsed, setRevealsUsed] = useState(0);

  const [mode, setMode] = useState("random");
  const [category, setCategory] = useState("general");
  const [difficulty, setDifficulty] = useState("easy");

  /* ============================================================
     CACHED FETCH (GLOBAL CACHE)
  ============================================================ */

  useEffect(() => {
    const key = `${mode}-${category}`;

    const loadPuzzle = async () => {
      setRevealsUsed(0);

      if (puzzleCache[key]) {
        setPhrase(puzzleCache[key]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const text =
          mode === "daily"
            ? await getDailyPuzzle(category)
            : await getRandomPuzzle(category);

        puzzleCache[key] = text;
        setPhrase(text);
      } catch {
        setPhrase("FALLBACK PHRASE");
      }

      setLoading(false);
    };

    loadPuzzle();
  }, [mode, category, restartKey]);

  /* ============================================================
     BACKGROUND PRELOAD (RUNS ONCE PER APP SESSION)
  ============================================================ */

  useEffect(() => {
    if (hasPreloaded) return;
    hasPreloaded = true;

    const preloadAll = async () => {
      const modes = ["random", "daily"];
      const categories = ["general", "people", "places"];

      for (let m of modes) {
        for (let c of categories) {
          const key = `${m}-${c}`;
          if (puzzleCache[key]) continue;

          const text =
            m === "daily"
              ? await getDailyPuzzle(c)
              : await getRandomPuzzle(c);

          puzzleCache[key] = text;
        }
      }
    };

    preloadAll();
  }, []);

  /* ============================================================ */

  const puzzle = useMemo(() => {
    if (!phrase) return { phrase: "", data: [] };
    const cipher = generateCipherNumbers(phrase);
    return { phrase, data: buildPuzzleData(phrase, cipher) };
  }, [phrase]);

  const { data } = puzzle;

  const isSolved =
    data.length > 0 &&
    data.every((cell, i) => {
      if (cell.type !== "letter") return true;

      const guess =
        difficulty === "easy"
          ? guesses[cell.code]
          : guesses[i];

      return guess && guess.toUpperCase() === cell.plain;
    });

  /* ============================================================
     KEYBOARD
  ============================================================ */

  useEffect(() => {
    const handler = (e) => {
      if (activeIndex === null) return;

      if (e.key.match(/^[a-zA-Z]$/)) handleGuess(e.key.toUpperCase());
      if (e.key === "ArrowLeft") handleArrowLeft();
      if (e.key === "ArrowRight") handleArrowRight();
      if (e.key === "Backspace") handleBackspace();
      if (e.key === "Delete") handleDelete();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  useEffect(() => {
    setGuesses({});
    setActiveIndex(null);
  }, [difficulty, phrase]);

  const handleGuess = (letter) => {
    if (activeIndex == null || data[activeIndex].type !== "letter") return;

    if (difficulty === "easy") {
      const code = data[activeIndex].code;
      setGuesses((prev) => ({ ...prev, [code]: letter }));
    } else {
      setGuesses((prev) => ({ ...prev, [activeIndex]: letter }));
    }

    setActiveIndex(moveToNextLetter(data, activeIndex));
  };

  const handleArrowLeft = () => {
    if (activeIndex != null)
      setActiveIndex(moveToPrevLetter(data, activeIndex));
  };

  const handleArrowRight = () => {
    if (activeIndex != null)
      setActiveIndex(moveToNextLetter(data, activeIndex));
  };

  const handleDelete = () => {
    if (activeIndex == null) return;

    if (difficulty === "easy") {
      const code = data[activeIndex].code;
      setGuesses((prev) => ({ ...prev, [code]: "" }));
    } else {
      setGuesses((prev) => ({ ...prev, [activeIndex]: "" }));
    }
  };

  const handleBackspace = () => {
    handleDelete();
    handleArrowLeft();
  };

  const handleRestart = () => {
    setActiveIndex(null);
    setGuesses({});
    setRestartKey((x) => x + 1);
  };

  const revealRandomLetter = () => {
    const unrevealed = data.filter((cell, i) => {
      if (cell.type !== "letter") return false;

      const guess =
        difficulty === "easy"
          ? guesses[cell.code]
          : guesses[i];

      return !guess;
    });

    if (!unrevealed.length) return;

    const chosen =
      unrevealed[Math.floor(Math.random() * unrevealed.length)];

    const index = data.findIndex((c) => c === chosen);

    if (difficulty === "easy") {
      setGuesses((prev) => ({
        ...prev,
        [chosen.code]: chosen.plain,
      }));
    } else {
      setGuesses((prev) => ({
        ...prev,
        [index]: chosen.plain,
      }));
    }

    setRevealsUsed((r) => r + 1);
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="grid-bg crypto-page">
      <div className="crypto-panel">

        {/* ── Header ── */}
        <div className="crypto-header">
          <Link to="/" className="crypto-back">← BACK</Link>
          <div className="crypto-header-center">
            <p className="crypto-eyebrow">EXPERIMENT — CIPHER DECRYPTION</p>
            <h1 className="crypto-title">CRYPTOGRAM</h1>
          </div>
          <span className="crypto-header-led" aria-hidden="true" />
        </div>

        <div className="crypto-rule" />

        {/* ── Controls ── */}
        <div className="crypto-controls">
          <div className="crypto-ctrl-row">
            <span className="crypto-ctrl-label">MODE</span>
            <div className="crypto-toggle-group">
              {["random", "daily"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`crypto-toggle${mode === m ? " on" : ""}`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="crypto-ctrl-row">
            <span className="crypto-ctrl-label">CATEGORY</span>
            <div className="crypto-toggle-group">
              {["general", "people", "places"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`crypto-toggle${category === c ? " on" : ""}`}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="crypto-ctrl-row">
            <span className="crypto-ctrl-label">DIFFICULTY</span>
            <div className="crypto-toggle-group">
              {["easy", "hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`crypto-toggle${difficulty === d ? " on" : ""}`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="crypto-rule" />

        {/* ── Puzzle area ── */}
        {loading ? (
          <div className="crypto-loading">
            LOADING EXPERIMENT DATA<span className="lab-blink">_</span>
          </div>
        ) : (
          <>
            <div className="crypto-cells-wrap">
              {data.map((cell, i) => {
                if (cell.type === "space")
                  return <div key={i} className="crypto-space" />;

                if (cell.type === "punct")
                  return <div key={i} className="crypto-punct">{cell.char}</div>;

                const guess =
                  difficulty === "easy"
                    ? guesses[cell.code] || ""
                    : guesses[i] || "";

                const isActive = i === activeIndex;
                const isCorrect = guess !== "" && guess.toUpperCase() === cell.plain;

                return (
                  <div
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`crypto-cell${isActive ? " active" : ""}${isCorrect ? " correct" : ""}`}
                  >
                    <div className="crypto-cell-guess">{guess}</div>
                    <div className="crypto-cell-divider" />
                    <div className="crypto-cell-code">{cell.code}</div>
                  </div>
                );
              })}
            </div>

            <div className="crypto-rule" />

            <CryptoKeyboard
              onLetter={handleGuess}
              onLeft={handleArrowLeft}
              onRight={handleArrowRight}
              onBackspace={handleBackspace}
              onDelete={handleDelete}
            />

            <div className="crypto-rule" />

            <div className="crypto-actions">
              <button onClick={revealRandomLetter} className="crypto-action-btn">
                REVEAL LETTER
              </button>
              <button onClick={handleRestart} className="crypto-action-btn">
                NEW PUZZLE
              </button>
              {revealsUsed > 0 && (
                <span className="crypto-reveal-count">REVEALS: {revealsUsed}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Solved overlay ── */}
      <AnimatePresence>
        {isSolved && (
          <motion.div
            className="crypto-solved-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Confetti
              recycle={false}
              numberOfPieces={220}
              colors={["#1a1a1a", "#e8c940", "#f0f0f0", "#666", "#fff"]}
            />
            <div className="crypto-solved-panel">
              <p className="crypto-solved-eyebrow">EXPERIMENT COMPLETE</p>
              <h2 className="crypto-solved-title">CIPHER DECODED</h2>
              <div className="crypto-rule" />
              <p className="crypto-solved-phrase">"{puzzle.phrase}"</p>
              {revealsUsed > 0 && (
                <p className="crypto-solved-meta">REVEALS USED: {revealsUsed}</p>
              )}
              <div className="crypto-solved-actions">
                <button onClick={handleRestart} className="crypto-action-btn">
                  RUN NEW EXPERIMENT
                </button>
                <Link to="/" className="crypto-action-btn">
                  RETURN TO LAB
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   KEYBOARD
============================================================ */

function CryptoKeyboard({ onLetter, onLeft, onRight, onBackspace, onDelete }) {
  const rows = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    "ZXCVBNM".split(""),
  ];

  return (
    <div className="crypto-keyboard">
      {rows.map((row, i) => (
        <div key={i} className="crypto-key-row">
          {row.map((l) => (
            <button key={l} onClick={() => onLetter(l)} className="crypto-key">
              {l}
            </button>
          ))}
        </div>
      ))}
      <div className="crypto-key-row">
        <button onClick={onLeft}      className="crypto-key ctrl">←</button>
        <button onClick={onRight}     className="crypto-key ctrl">→</button>
        <button onClick={onBackspace} className="crypto-key ctrl">⌫</button>
        <button onClick={onDelete}    className="crypto-key ctrl">DEL</button>
      </div>
    </div>
  );
}

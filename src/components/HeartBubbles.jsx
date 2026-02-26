import React, { useEffect, useRef, useState } from 'react';
import heartImg from '../assets/photos/whiteheart1.png';

// Heart particle that spawns at the bottom of the viewport and floats up.
export default function HeartBubbles({ spawnInterval = 360 }) {
  const [hearts, setHearts] = useState([]);
  const idRef = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;


    const spawn = () => {
      const id = ++idRef.current;
      const size = Math.round(10 + Math.random() * 26); // px size
      const duration = +(3 + Math.random() * 2.4).toFixed(2); // seconds
      const opacity = +(0.6 + Math.random() * 0.4).toFixed(2);

      // try to find the main grid bounds so we can spawn outside of it
      const wrapper = document.querySelector('.main-grid-wrapper');
      const vw = window.innerWidth || document.documentElement.clientWidth;
      let spawnX = null; // in px from left
      let side = 'left';
      const margin = 24; // pixels away from the grid

      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const leftGap = rect.left - margin; // space to left of grid
        const rightGap = vw - rect.right - margin; // space to right of grid

        const leftAvailable = leftGap > 40; // require some minimum space
        const rightAvailable = rightGap > 40;

        if (leftAvailable && rightAvailable) {
          side = Math.random() < 0.5 ? 'left' : 'right';
        } else if (leftAvailable) {
          side = 'left';
        } else if (rightAvailable) {
          side = 'right';
        } else {
          // no space on either side (mobile/full-width) — spawn near edges but outside small margins
          if (Math.random() < 0.5) side = 'left';
          else side = 'right';
        }

        if (side === 'left') {
          const maxX = Math.max(8, leftGap - 8);
          spawnX = Math.round(Math.random() * maxX);
        } else {
          const minX = Math.min(vw - 8, rect.right + margin + 8);
          const maxX = Math.max(minX + 8, vw - 8);
          spawnX = Math.round(minX + Math.random() * (maxX - minX));
        }
      }

      // fallback when wrapper not found
      if (spawnX === null) {
        // spawn near the viewport edges (left 0-10% or right 90-100%)
        if (Math.random() < 0.5) {
          side = 'left';
          spawnX = Math.round((Math.random() * 0.12) * vw);
        } else {
          side = 'right';
          spawnX = Math.round(vw - (Math.random() * 0.12) * vw);
        }
      }

      const heart = { id, side, x: spawnX, size, duration, opacity };

      setHearts((s) => [...s, heart]);

      // remove after animation completes
      setTimeout(() => {
        if (!mounted.current) return;
        setHearts((s) => s.filter((h) => h.id !== id));
      }, (duration + 0.5) * 1000);
    };

    // initial burst
    for (let i = 0; i < 6; i++) {
      setTimeout(spawn, i * 120);
    }

    const interval = setInterval(spawn, spawnInterval);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [spawnInterval]);

  return (
    <>
      {hearts.map((h) => {
        const style = {
          position: 'fixed',
          bottom: 6,
          left: `${h.x}px`,
          pointerEvents: 'none',
          width: `${h.size}px`,
          height: 'auto',
          opacity: h.opacity,
          transform: 'translateY(0)',
          animation: `hbFloat ${h.duration}s ease-out forwards`,
          zIndex: 6,
        };

        return (
          <img
            key={h.id}
            src={heartImg}
            alt=""
            className="heart-bubble-img"
            style={style}
            aria-hidden
          />
        );
      })}
    </>
  );
}

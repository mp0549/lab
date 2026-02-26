import React from 'react';

export default function CuteButton({ onClick, children }) {
  return (
    <button onClick={onClick} className="cute-button" style={{padding:'8px 12px',borderRadius:999,border:'none',background:'#ff6b9a',color:'#fff'}}>
      {children}
    </button>
  );
}

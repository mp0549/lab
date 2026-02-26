import React from 'react';

export default function GameCard({ title, subtitle, href, image, moduleId, onAccess }) {
  const handleClick = () => {
    try { if (onAccess) onAccess(); } catch (_) {}
  };

  return (
    <article className="module-card group">
      <div className="module-card-top">
        <span className="module-id-tag">{moduleId}</span>
        <span className="module-led" aria-hidden="true" />
      </div>

      <div className="module-thumb-wrap">
        {image ? (
          <img src={image} alt={title} className="module-thumb-img" />
        ) : (
          <div className="module-thumb-empty">{title}</div>
        )}
      </div>

      <div className="module-body">
        <div className="module-sep" />
        <h3 className="module-title-text">{title}</h3>
        {subtitle && <p className="module-tagline-text">{subtitle}</p>}
      </div>

      <div className="module-foot">
        <a href={href} onClick={handleClick} className="module-btn">
          RUN EXPERIMENT <span className="module-btn-arrow">→</span>
        </a>
      </div>
    </article>
  );
}

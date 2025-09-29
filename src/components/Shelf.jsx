import React from 'react';
import './Shelf.css';

const formatCupTitle = (cup) => {
  const type = typeof cup === 'string' ? cup : cup.type;
  const awardedAt = typeof cup === 'string' ? null : cup.awardedAt;
  const durationSec = typeof cup === 'string' ? null : cup.durationSec;
  let parts = [type.toUpperCase()];
  if (awardedAt) {
    const d = new Date(awardedAt);
    if (!isNaN(d.valueOf())) {
      parts.push(d.toLocaleString());
    }
  }
  if (typeof durationSec === 'number' && durationSec > 0) {
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    parts.push(`${m}m ${s}s`);
  }
  return parts.join(' • ');
};

const Shelf = ({ cups = [], onBack, isSignedIn = false }) => {
  return (
    <div className="shelf-container">
      <div className="shelf-header">
  <h2 className="shelf-title" title="Cup info">CUP SHELF</h2>
      </div>
      {!isSignedIn && (
        <div className="shelf-hint">
          To keep your cups saved across sessions and devices, please register or log in.
        </div>
      )}
      <div className="shelf-row">
        {cups.length === 0 && <div className="shelf-empty">No cups yet. Finish a session!</div>}
        {cups.map((cup, idx) => {
          const type = typeof cup === 'string' ? cup : cup.type;
          return (
            <div
              key={idx}
              className={`cup-icon ${type}`}
              title={formatCupTitle(cup)}
              data-title={formatCupTitle(cup)}
            ></div>
          );
        })}
      </div>
      <button className="back-btn" onClick={onBack}>BACK</button>
    </div>
  );
};

export default Shelf;

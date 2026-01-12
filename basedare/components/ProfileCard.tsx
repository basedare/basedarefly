'use client';

import React, { useCallback, useRef } from 'react';
import './ProfileCard.css';

type ProfileCardProps = {
  avatarUrl?: string;
  logoUrl?: string;
  name?: string;
  title?: string;
  handle?: string;
  onContactClick?: () => void;
};

const ProfileCard = ({
  avatarUrl = '/assets/peebear-head.png',
  logoUrl = '/assets/basedaresolid.png',
  name = 'MANAGER',
  title = 'Chief Honey Officer',
  handle = '@BaseDareManager',
  onContactClick,
}: ProfileCardProps) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const posx = (x / rect.width) * 100;
    const posy = (y / rect.height) * 100;

    const ry = (posx - 50) / 10;
    const rx = (posy - 50) / -14;
    
    const hyp = Math.sqrt(Math.pow(posx - 50, 2) + Math.pow(posy - 50, 2)) / 50;

    card.style.setProperty('--posx', `${posx}%`);
    card.style.setProperty('--posy', `${posy}%`);
    card.style.setProperty('--rx', `${rx}deg`);
    card.style.setProperty('--ry', `${ry}deg`);
    card.style.setProperty('--hyp', `${Math.min(hyp, 1)}`);
    card.style.setProperty('--opacity', '1');
  }, []);

  const handleLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--opacity', '0');
  }, []);

  return (
    <div className="pc-container">
      <div 
        ref={cardRef} 
        className="pc-card" 
        onMouseMove={handleMove} 
        onMouseLeave={handleLeave} 
      >
        <div className="pc-inner">
          <div className="pc-holo-container">
            <div className="pc-holo" />
            <div className="pc-watermark">BASEDARE</div>
          </div>
          <div className="pc-grain" />

          <div className="pc-content">
            <div className="pc-header">
              <img src={logoUrl} alt="BaseDare" className="pc-logo" />
            </div>

            <div className="pc-avatar-box"><img src={avatarUrl} alt="Manager" className="pc-avatar" /></div>

            <div className="pc-info">
              <h2 className="pc-name">{name}</h2>
              <p className="pc-title">{title}</p>
              <div className="pc-handle-box">{handle}</div>
              <button className="pc-btn" onClick={onContactClick}>Contact</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;

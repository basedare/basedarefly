import React, { useState } from "react";
import { Zap, Clock, MessageCircle } from "lucide-react";

export default function ConveyorBar({ dares, onOpenChat, onOpenLeaderboard }) {
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredDare, setHoveredDare] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const recentDares = dares
    .filter(d => d.status === "pending" || d.status === "accepted")
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  const getTimeLeft = (expiry) => {
    if (!expiry) return "";
    const now = new Date();
    const end = new Date(expiry);
    const diff = end - now;
    if (diff < 0) return "expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h left` : `${mins}m left`;
  };

  const handleDareClick = (dare) => {
    if (onOpenChat) {
      onOpenChat(dare);
    }
  };

  const handlePillHover = (dare, e) => {
    setIsPaused(true);
    setHoveredDare(dare);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
  };

  const handlePillLeave = () => {
    setIsPaused(false);
    setHoveredDare(null);
  };

  return (
    <>
      <style>{`
        .conveyor-bar-container {
          position: sticky;
          top: 64px;
          z-index: 50;
          width: 100%;
          height: 5rem;
          backdrop-filter: blur(14px) brightness(1.05);
          -webkit-backdrop-filter: blur(14px) brightness(1.05);
          background: rgba(10, 10, 15, 0.75);
          border-bottom: 1px solid rgba(168, 85, 247, 0.3);
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          overflow: hidden;
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        @media (max-width: 640px) {
          .conveyor-bar-container {
            margin-bottom: 0.5rem;
          }
        }

        .conveyor-header {
          position: absolute;
          left: 0;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          z-index: 48;
          padding: 0.75rem 0;
          overflow: hidden;
          pointer-events: none;
        }

        .header-scroll-wrapper {
          display: flex;
          animation: scroll-glass-cycle 17s linear infinite;
          white-space: nowrap;
        }

        .header-scroll-item {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          height: 3.5rem;
          padding: 0.75rem 1.5rem;
          
          /* Apple Glass Morphism - ULTRA ROUNDED CAPSULE */
          backdrop-filter: blur(40px) saturate(180%) brightness(1.2);
          -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(1.2);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.25) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.15) 100%
          );
          
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.37),
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2),
            0 0 40px rgba(168, 85, 247, 0.3);
          
          /* Magnifying glass distortion effect */
          transform: scale(1.05);
          filter: drop-shadow(0 6px 12px rgba(168, 85, 247, 0.4));
          
          position: relative;
          overflow: hidden;
        }

        .header-scroll-item .lightning-icon {
          width: 0.75rem;
          height: 0.75rem;
        }

        .header-scroll-item .fire-text {
          font-size: 0.875rem !important;
          font-weight: 700;
        }

        /* OFF-WHITE INSPIRED HAZARD LIGHTS - INTENSIFIED 2X */
        .header-scroll-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 10px;
          height: 10px;
          background: #FFD700;
          border-radius: 50%;
          animation: hazard-flash-intense 0.3s ease-in-out infinite;
          box-shadow: 
            0 0 20px #FFD700,
            0 0 40px #FFD700,
            0 0 60px rgba(255, 215, 0, 0.8);
        }

        .header-scroll-item::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 10px;
          height: 10px;
          background: #FFD700;
          border-radius: 50%;
          animation: hazard-flash-intense 0.3s ease-in-out infinite 0.15s;
          box-shadow: 
            0 0 20px #FFD700,
            0 0 40px #FFD700,
            0 0 60px rgba(255, 215, 0, 0.8);
        }

        /* Yellow hazard stripe overlay - MORE INTENSE */
        .hazard-stripe {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 10px,
            rgba(255, 215, 0, 0.2) 10px,
            rgba(255, 215, 0, 0.2) 20px
          );
          pointer-events: none;
          border-radius: 100px;
          opacity: 0;
          animation: stripe-pulse-intense 1s ease-in-out infinite;
        }

        @keyframes hazard-flash-intense {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            background: #FFD700;
            box-shadow: 
              0 0 24px #FFD700,
              0 0 48px #FFD700,
              0 0 72px rgba(255, 215, 0, 0.9),
              0 0 96px rgba(255, 215, 0, 0.6);
          }
          50% {
            opacity: 0.2;
            transform: scale(1.5);
            background: #FFEB3B;
            box-shadow: 
              0 0 40px #FFEB3B,
              0 0 80px #FFD700,
              0 0 120px rgba(255, 215, 0, 1),
              0 0 160px rgba(255, 215, 0, 0.8);
          }
        }

        @keyframes stripe-pulse-intense {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.7;
          }
        }

        .glass-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 70%
          );
          animation: glass-shimmer 3s ease-in-out infinite;
          pointer-events: none;
          border-radius: 100px;
        }

        @keyframes glass-shimmer {
          0%, 100% {
            transform: translateX(-100%) rotate(45deg);
            opacity: 0;
          }
          50% {
            transform: translateX(100%) rotate(45deg);
            opacity: 1;
          }
        }

        @keyframes scroll-glass-cycle {
          0% {
            transform: translateX(calc(100vw + 300px));
            opacity: 0;
          }
          3% {
            opacity: 1;
          }
          41% {
            transform: translateX(-300px);
            opacity: 1;
          }
          44% {
            opacity: 0;
          }
          100% {
            transform: translateX(-300px);
            opacity: 0;
          }
        }

        .conveyor-track {
          display: inline-flex;
          gap: 1.5rem;
          animation: scroll 30s linear infinite;
          white-space: nowrap;
          padding: 0 1rem;
          z-index: 46;
          position: relative;
          width: 100%;
        }

        .conveyor-track.paused {
          animation-play-state: paused;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .conveyor-pill {
          height: 3.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 9999px;
          backdrop-filter: blur(14px) brightness(1.08);
          -webkit-backdrop-filter: blur(14px) brightness(1.08);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255,255,255,0.1);
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 380px;
          max-width: 480px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          pointer-events: auto;
          z-index: 47;
        }

        .conveyor-pill::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: no-preference) {
          .conveyor-pill:hover {
            transform: scale(1.05) translateY(-2px);
            box-shadow: 
              0 0 30px rgba(168, 85, 247, 0.5),
              0 8px 24px rgba(0,0,0,0.4);
            border-color: rgba(168, 85, 247, 0.5);
            background: rgba(255, 255, 255, 0.1);
          }

          .conveyor-pill:hover::before {
            opacity: 1;
          }
        }

        .tooltip-preview {
          position: fixed;
          width: 18rem;
          backdrop-filter: blur(20px) brightness(1.1);
          background: rgba(20, 20, 30, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 1rem;
          box-shadow: 
            0 12px 48px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255,255,255,0.1);
          z-index: 100;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .tooltip-preview img {
          width: 100%;
          height: 9rem;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 0.75rem;
        }

        .tooltip-title {
          color: white;
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }

        .tooltip-stake {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #F59E0B;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .tooltip-btn {
          margin-top: 0.75rem;
          width: 100%;
          padding: 0.625rem;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10B981;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tooltip-btn:hover {
          background: rgba(16, 185, 129, 0.3);
        }

        .status-badge {
          padding: 0.4rem 0.875rem;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .status-badge-pending {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .status-badge-accepted {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        @media (max-width: 768px) {
          .conveyor-bar-container {
            height: 4rem;
          }
          .conveyor-header {
            font-size: 1rem;
            padding: 0.5rem 0;
          }
          .header-scroll-item {
            height: 3rem;
            padding: 0.5rem 1rem;
          }
          .header-scroll-item::before,
          .header-scroll-item::after {
            width: 8px;
            height: 8px;
          }
          .conveyor-track {
            padding-left: 0;
          }
          .conveyor-pill {
            height: 3rem;
            padding: 0.5rem 1rem;
            min-width: 300px;
            gap: 0.5rem;
          }
          .tooltip-preview {
            width: 14rem;
          }
        }
      `}</style>

      <div className="conveyor-bar-container">
        {/* SCROLLING HEADER - Glass capsule with INTENSE Off-White hazard lights */}
        <div className="conveyor-header">
          <div className="header-scroll-wrapper">
            <div className="header-scroll-item">
              <div className="hazard-stripe"></div>
              <div className="glass-shimmer"></div>
              <Zap className="lightning-icon" />
              <span className="fire-text" data-fire-text style={{ display: 'inline-block' }}>
                🔥 Live BOUNTY POTS
              </span>
            </div>
          </div>
        </div>

        {/* Conveyor Track - Pills scroll slower underneath */}
        {recentDares.length === 0 ? (
          <div className="w-full flex items-center justify-center">
            <div className="conveyor-pill">
              <span className="text-white font-semibold">🚀 Fresh BOUNTY POTS incoming—create the first one!</span>
            </div>
          </div>
        ) : (
          <div className={`conveyor-track ${isPaused ? 'paused' : ''}`}>
            {[...recentDares, ...recentDares].map((dare, index) => (
              <div
                key={`${dare.id}-${index}`}
                onClick={() => handleDareClick(dare)}
                onMouseEnter={(e) => handlePillHover(dare, e)}
                onMouseLeave={handlePillLeave}
                className="conveyor-pill"
              >
                <span className="text-white font-bold truncate flex-1 text-sm">
                  {dare.title}
                </span>
                <div className="flex items-center gap-1 text-orange-400">
                  <span className="text-xs font-bold">${dare.stake_amount || 0}</span>
                  <Zap className="w-3 h-3" />
                </div>
                <span className={dare.status === "accepted" ? "status-badge status-badge-accepted" : "status-badge status-badge-pending"}>
                  {dare.status === "accepted" ? "✅" : "🔥"}
                </span>
                {dare.streamer_name && (
                  <span className="text-purple-300 text-xs font-medium">@{dare.streamer_name}</span>
                )}
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{getTimeLeft(dare.expiry_timer)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tooltip Preview */}
        {hoveredDare && (
          <div
            className="tooltip-preview"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`
            }}
          >
            {hoveredDare.image_url && (
              <img src={hoveredDare.image_url} alt={hoveredDare.title} />
            )}
            <div className="tooltip-title">{hoveredDare.title}</div>
            <div className="tooltip-stake">
              <Zap className="w-4 h-4" />
              <span>BOUNTY POT: ${hoveredDare.stake_amount || 0}</span>
            </div>
            <div className="tooltip-btn" onClick={() => handleDareClick(hoveredDare)}>
              <MessageCircle className="w-3 h-3 inline mr-1" />
              Chat Now
            </div>
          </div>
        )}
      </div>
    </>
  );
}
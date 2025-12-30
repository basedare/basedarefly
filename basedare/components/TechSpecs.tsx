'use client';

import React from 'react';

const TechSpecs = () => {
  return (
    <section className="tech-specs-minimal">
      <div className="specs-content">
        
        {/* Spec 01: The Eye */}
        <div className="spec-column">
          <div className="spec-header">
            <span className="spec-label">VERIFICATION</span>
            <div className="status-dot green"></div>
          </div>
          <h3>zkML Referee</h3>
          <p>On-chain proof of performance. Real-time bot filtration.</p>
        </div>

        {/* Vertical Hairline Divider */}
        <div className="spec-hairline"></div>

        {/* Spec 02: The Speed */}
        <div className="spec-column">
          <div className="spec-header">
            <span className="spec-label">SETTLEMENT</span>
            <div className="status-dot gold"></div>
          </div>
          <h3>Atomic &lt;200ms</h3>
          <p>Base L2 finality. Zero delays. Instant liquidity.</p>
        </div>

        {/* Vertical Hairline Divider */}
        <div className="spec-hairline"></div>

        {/* Spec 03: The Network */}
        <div className="spec-column">
          <div className="spec-header">
            <span className="spec-label">NETWORK</span>
            <div className="status-dot purple"></div>
          </div>
          <h3>10k+ Verified</h3>
          <p>Cryptographically proven identity. Zero deepfakes.</p>
        </div>

      </div>
    </section>
  );
};

export default TechSpecs;






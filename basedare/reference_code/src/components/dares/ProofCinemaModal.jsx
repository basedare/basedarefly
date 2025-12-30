import React, { useRef, useState, useEffect } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProofCinemaModal({ proofUrl, isOpen, onClose, votes }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (videoRef.current && isOpen) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isOpen]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(percent);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = videoRef.current.duration * percent;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0) setIsMuted(false);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  if (!isOpen) return null;

  const totalVotes = votes.up + votes.down;
  const votePercentage = totalVotes > 0 ? (votes.up / totalVotes) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              zIndex: 999,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '70vw',
              maxWidth: '1200px',
              height: 'auto',
              maxHeight: '80vh',
              background: '#000',
              borderRadius: '8px',
              boxShadow: '0 0 20px rgba(147, 112, 219, 0.5)',
              zIndex: 1000,
              overflow: 'hidden',
            }}
            className="cinema-modal"
          >
            <style>{`
              @media (max-width: 768px) {
                .cinema-modal {
                  width: 90vw !important;
                  height: auto !important;
                  max-height: 80vh !important;
                }
              }

              .custom-controls {
                background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
              }

              .progress-bar {
                cursor: pointer;
              }

              .volume-slider {
                accent-color: #9370DB;
              }
            `}</style>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                zIndex: 1001,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(147, 112, 219, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video */}
            <video
              ref={videoRef}
              src={proofUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />

            {/* Custom Controls */}
            <div className="custom-controls" style={{ padding: '1rem' }}>
              {/* Progress Bar */}
              <div
                className="progress-bar"
                onClick={handleSeek}
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(147, 112, 219, 0.3)',
                  borderRadius: '3px',
                  marginBottom: '1rem',
                  position: 'relative',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: '#9370DB',
                    borderRadius: '3px',
                    transition: 'width 0.1s',
                  }}
                />
              </div>

              {/* Control Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={handlePlayPause}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9370DB',
                    cursor: 'pointer',
                    padding: '0.5rem',
                  }}
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>

                <button
                  onClick={handleMuteUnmute}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9370DB',
                    cursor: 'pointer',
                    padding: '0.5rem',
                  }}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                  style={{ width: '100px' }}
                />

                <button
                  onClick={handleFullscreen}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9370DB',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    marginLeft: 'auto',
                  }}
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Vote UI */}
            {votes && (
              <div style={{ padding: '1rem', borderTop: '1px solid rgba(147, 112, 219, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#00FF00', fontSize: '0.875rem' }}>{votes.up} up</span>
                  <span style={{ color: '#9370DB', fontSize: '0.875rem' }}>{votePercentage.toFixed(0)}%</span>
                  <span style={{ color: '#FF0000', fontSize: '0.875rem' }}>{votes.down} down</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(100, 100, 120, 0.3)', borderRadius: '2px' }}>
                  <div
                    style={{
                      width: `${votePercentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #9b59b6, #e91e63)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
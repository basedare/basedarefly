"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProofCinemaModalProps {
  proofUrl: string;
  isOpen: boolean;
  onClose: () => void;
  votes?: { up: number; down: number };
}

export default function ProofCinemaModal({ proofUrl, isOpen, onClose, votes }: ProofCinemaModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (videoRef.current && isOpen) {
      videoRef.current.play().catch(() => console.log("Autoplay blocked"));
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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = videoRef.current.duration * percent;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0) setIsMuted(false);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  if (!isOpen) return null;

  const totalVotes = votes ? votes.up + votes.down : 0;
  const votePercentage = totalVotes > 0 && votes ? (votes.up / totalVotes) * 100 : 0;

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
            className="fixed inset-0 bg-black/90 z-[999]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[70vw] max-w-[1200px] bg-black rounded-lg shadow-[0_0_20px_rgba(147,112,219,0.5)] z-[1000] overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-[1001] w-10 h-10 rounded-full bg-black/70 border border-purple-500/50 flex items-center justify-center text-white hover:bg-black/90 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video */}
            <video
              ref={videoRef}
              src={proofUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-auto max-h-[70vh] object-contain block bg-black"
            />

            {/* Custom Controls */}
            <div className="bg-gradient-to-t from-black/90 to-transparent p-4">
              {/* Progress Bar */}
              <div
                onClick={handleSeek}
                className="w-full h-1.5 bg-purple-500/30 rounded-full mb-4 cursor-pointer relative"
              >
                <div
                  style={{ width: `${progress}%` }}
                  className="h-full bg-purple-500 rounded-full transition-all duration-100"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-4">
                <button onClick={handlePlayPause} className="text-purple-400 hover:text-purple-300 transition">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>

                <button onClick={handleMuteUnmute} className="text-purple-400 hover:text-purple-300 transition">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 accent-purple-500"
                />

                <button onClick={handleFullscreen} className="ml-auto text-purple-400 hover:text-purple-300 transition">
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Vote UI */}
            {votes && (
              <div className="p-4 border-t border-purple-500/30 bg-black">
                <div className="flex justify-between mb-2 text-sm font-bold">
                  <span className="text-green-400">{votes.up} up</span>
                  <span className="text-purple-400">{votePercentage.toFixed(0)}%</span>
                  <span className="text-red-400">{votes.down} down</span>
                </div>
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${votePercentage}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
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



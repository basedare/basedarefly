'use client';

import React from 'react';

type ZkStats = {
  score: number;
  deepfakeProb: number;
};

type ProofViewerProps = {
  videoUrl: string;
  zkStats?: ZkStats;
  onClose: () => void;
};

function canUseNativeVideo(url: string) {
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg');
}

export default function ProofViewer({ videoUrl, zkStats, onClose }: ProofViewerProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#060010]/90 backdrop-blur-xl">
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.2)]">
        {zkStats ? (
          <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
            <div className="bg-green-500/20 border border-green-500/40 px-3 py-1 rounded-full backdrop-blur-md">
              <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest">
                AUTHENTICITY SCORE: {zkStats.score}%
              </span>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/40 px-3 py-1 rounded-full backdrop-blur-md">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">
                DEEPFAKE PROBABILITY: {zkStats.deepfakeProb}%
              </span>
            </div>
          </div>
        ) : null}

        {canUseNativeVideo(videoUrl) ? (
          <video src={videoUrl} className="w-full h-full" controls autoPlay playsInline />
        ) : (
          <iframe src={videoUrl} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" />
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 text-white/40 hover:text-white uppercase font-mono text-xs"
        >
          [ EXIT_PROTOCOL ]
        </button>
      </div>
    </div>
  );
}


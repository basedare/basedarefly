'use client';
import React from 'react';
import { Loader2, Check, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TxProps {
  isOpen: boolean;
  status: 'PROCESSING' | 'SUCCESS' | 'ERROR';
  title: string;
  hash?: string;
  onClose: () => void;
}

export default function TransactionModal({ isOpen, status, title, hash, onClose }: TxProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(168,85,247,0.2)]"
        >
          
          {/* STATUS ICON */}
          <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
            {status === 'PROCESSING' && <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />}
            {status === 'SUCCESS' && <Check className="w-10 h-10 text-green-500" />}
            {status === 'ERROR' && <AlertOctagon className="w-10 h-10 text-red-500" />}
          </div>

          {/* TEXT */}
          <h3 className="text-xl font-black text-white uppercase mb-2 tracking-wide">{title}</h3>
          
          {status === 'PROCESSING' && (
            <div className="space-y-2">
              <p className="text-gray-500 font-mono text-sm">Confirming on Base L2...</p>
              <div className="text-[10px] text-gray-700 font-mono uppercase">Waiting for signature</div>
            </div>
          )}
          
          {status === 'SUCCESS' && (
            <div className="space-y-4">
              <p className="text-gray-500 font-mono text-sm">Transaction confirmed successfully.</p>
              <div className="bg-white/5 p-3 rounded-lg text-xs font-mono text-gray-400 break-all border border-white/5">
                Hash: {hash || "0x8a7f...2b9C"}
              </div>
              <button onClick={onClose} className="w-full py-3 bg-white text-black font-bold uppercase rounded-xl hover:bg-gray-200 transition-colors">
                Close
              </button>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="space-y-4">
              <p className="text-gray-500 font-mono text-sm">Transaction failed. Please try again.</p>
              <button onClick={onClose} className="w-full py-3 bg-red-600 text-white font-bold uppercase rounded-xl hover:bg-red-700 transition-colors">
                Close
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

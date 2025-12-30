"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const WALLETS = [
  { name: "MetaMask", icon: "🦊", id: "metamask" },
  { name: "Coinbase Wallet", icon: "🔵", id: "coinbase" },
  { name: "WalletConnect", icon: "🔗", id: "walletconnect" },
];

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (data: { walletId: string; address: string }) => void;
}

export default function WalletConnectModal({ isOpen, onClose, onConnect }: WalletConnectModalProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const handleConnect = async (walletId: string) => {
    setConnecting(walletId);
    setError(null);

    try {
      // Simulate connection
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          // Success on 2nd try or random chance
          if (Math.random() > 0.3 || retryCount > 0) {
            resolve();
          } else {
            reject(new Error("Connection failed"));
          }
        }, 2000);
      });

      toast({
        title: "Wallet connected – ready to dare!",
        description: "Your wallet is now connected to BaseDare",
        className: "bg-green-500/20 border-green-500/50 text-white",
      });

      if (onConnect) {
        onConnect({ walletId, address: "0x1234...abcd" });
      }
      onClose();
    } catch (err) {
      setError("Connection failed. Please try again.");
      setRetryCount(prev => prev + 1);
    } finally {
      setConnecting(null);
    }
  };

  const handleRetry = () => {
    if (connecting) {
      handleConnect(connecting);
    } else {
      // Default to metamask or clear error
      setError(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1a1a2e] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Connect Wallet</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold">{error}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Button 
                    onClick={() => handleConnect("metamask")} // Simplification: retry last attempted or default
                    size="sm" 
                    className="bg-red-500 hover:bg-red-600 border-0"
                  >
                    Retry
                  </Button>
                  <span className="text-gray-400 text-sm">
                    Slow? Try mobile app
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {WALLETS.map(wallet => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnect(wallet.id)}
                  disabled={connecting !== null}
                  className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-colors disabled:opacity-50 border border-transparent hover:border-purple-500/30"
                >
                  <span className="text-3xl">{wallet.icon}</span>
                  <span className="text-white font-semibold flex-1 text-left">{wallet.name}</span>
                  {connecting === wallet.id && <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700 text-center">
              <p className="text-gray-400 text-sm mb-2">Don&apos;t have a wallet?</p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center justify-center gap-1"
              >
                Install MetaMask <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



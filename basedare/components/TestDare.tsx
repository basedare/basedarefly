'use client';

import { useState } from 'react';
import { useBaseDare } from '@/hooks/useBaseDare';
import { useAccount } from 'wagmi';

export default function TestDareButton() {
  const { createDare, isConfirming } = useBaseDare();
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  const handleSeed = async () => {
    if (!address) {
      alert("Connect Wallet first!");
      return;
    }
    
    // SEED DATA
    const streamer = address; // You dare yourself for testing
    const amount = "1";       // 1 USDC
    const referrer = "0x0000000000000000000000000000000000000000";

    try {
      setIsLoading(true);
      console.log("🌱 Seeding Dare...");
      await createDare(streamer, amount, referrer);
      alert("✅ Dare Created on Base Sepolia!");
    } catch (e) {
      console.error(e);
      alert("❌ Failed. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  const isProcessing = isLoading || isConfirming;

  return (
    <div className="p-4 border border-green-500 rounded bg-black text-white">
      <h3 className="text-xl font-bold mb-2">🌱 Seed Test Dare</h3>
      <p className="text-sm text-gray-400 mb-4">
        Creates a 1 USDC dare for yourself.
      </p>
      
      <button 
        onClick={handleSeed}
        disabled={isProcessing}
        className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
      >
        {isProcessing ? "Processing (Approve + Deposit)..." : "Create 1 USDC Dare 🚀"}
      </button>
    </div>
  );
}



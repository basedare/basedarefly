'use client';

import ElectricCard from "@/components/ui/electric-card";
import { useBountyStake } from '@/hooks/useBountyStake';
import { useAccount } from 'wagmi';

interface DareProps {
  title: string;
  price: string;
  userAvatar: string;
  isGold?: boolean;
  dareId?: number;
  streamerAddress?: string;
  amount?: string; // Amount in USDC (e.g., "100")
}

export default function DareCard({ 
  title, 
  price, 
  userAvatar, 
  isGold = false,
  dareId,
  streamerAddress,
  amount 
}: DareProps) {
  const { isConnected } = useAccount();
  const { stake, hash } = useBountyStake();

  const handleStake = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!dareId || !streamerAddress || !amount) {
      alert("Dare information is incomplete. Please try again later.");
      return;
    }

    try {
      // Referrer is 0x0... (the platform) for now, or use a specific wallet
      const referrer = "0x0000000000000000000000000000000000000000"; 
      
      console.log(`Initiating stake for Dare #${dareId}...`);
      await stake(dareId, streamerAddress, referrer, amount);
      
      // The wallet will now pop up for Approval, then for Staking.
    } catch (error) {
      console.error("Staking failed or was rejected by user:", error);
    }
  };
  // Determine color based on "Gold" status
  const cardColor = isGold ? "#FACC15" : "#A855F7"; 
  const variant = isGold ? "hue" : "swirl"; // Gold gets the crazy "hue" energy, Purple gets "swirl"

  return (
    <div className="h-[300px] w-full">
        <ElectricCard 
            color={cardColor} 
            variant={variant}
            className="h-full"
        >
            <div className="flex flex-col h-full justify-between items-center text-center p-2">
                
                {/* Avatar */}
                <div className={`w-16 h-16 rounded-full border-2 p-1 relative z-20 ${isGold ? 'border-[#FACC15]' : 'border-[#A855F7]'}`}>
                    <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden relative">
                         <img 
                            src={userAvatar} 
                            alt="User" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-2 z-20">
                    <h3 className="text-white font-bold text-lg leading-tight min-h-[3rem] flex items-center justify-center font-serif">
                        {title}
                    </h3>
                    <div className={`text-4xl font-black tracking-tighter drop-shadow-lg ${isGold ? 'text-[#FACC15]' : 'text-[#A855F7]'}`}>
                        {price}
                    </div>
                </div>

                {/* Button */}
                <button 
                    onClick={handleStake}
                    className={`w-full py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-transform hover:scale-105 active:scale-95 ${
                        isGold ? 'bg-[#FACC15] text-black' : 'bg-[#A855F7]/20 border border-[#A855F7] text-white'
                    }`}
                >
                    {amount ? `Back this Dare (${amount} USDC)` : 'Stake Now'}
                </button>
            </div>
        </ElectricCard>
    </div>
  );
}

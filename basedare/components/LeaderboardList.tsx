'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import ReputationCapsule from './ui/ReputationCapsule';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ElectricCard from './ui/electric-card';

interface LeaderboardUser {
    rank: number;
    user: string;
    avatar: string;
    staked: string;
    repPoints: number; // Used for the Reputation Capsule (0-100)
    color?: string; // For the top 3 glow
}

interface LeaderboardListProps {
    data: LeaderboardUser[];
}

const listVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.3 } },
};

const rankStyles = (rank: number) => {
    if (rank === 1) return { className: "text-3xl font-black text-[#FACC15] drop-shadow-[0_0_10px_#FACC15]", icon: Trophy };
    if (rank === 2) return { className: "text-2xl font-bold text-[#94a3b8] drop-shadow-[0_0_8px_#94a3b8]", icon: Medal };
    if (rank === 3) return { className: "text-xl font-semibold text-[#cd7f32] drop-shadow-[0_0_6px_#cd7f32]", icon: Medal };
    return { className: "text-lg text-gray-400 font-medium", icon: null };
};

const LeaderboardList: React.FC<LeaderboardListProps> = ({ data }) => {
  const initialCount = 4; 
  const [isExpanded, setIsExpanded] = useState(false);
  const remainingUsers = data.filter(user => user.rank > 3);

  const renderListItem = (user: LeaderboardUser) => (
    <motion.div
      key={user.rank}
      layout
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={listVariants}
      className="p-4 md:p-6 mb-4 w-full"
    >
      <ElectricCard color="#3B82F6" variant="swirl" className="p-4 md:p-6 hover:bg-white/[0.05] transition-colors cursor-pointer">
        <div className="flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 w-2/5">
            <div className="text-xl font-black text-purple-400 w-6 text-center">{user.rank}</div>
            {/* ADDED PROFILE IMAGE */}
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative">
                <Image src={user.avatar} alt={user.user} fill sizes="40px" style={{ objectFit: 'cover' }} priority />
            </div>
            <span className="font-bold text-lg text-white font-serif tracking-wide">{user.user}</span>
          </div>
          
          <div className="text-right font-black text-xl text-[#FACC15] w-1/5">
            {user.staked}
          </div>

          <div className="w-2/5 flex justify-end">
            {/* FIX: Explicitly set height (h-24) to accommodate the ReputationCapsule size */}
            <div className="w-full max-w-[200px] h-24 flex items-center justify-end">
              <ReputationCapsule value={user.repPoints} className="w-full" />
            </div>
          </div>
          
        </div>
      </ElectricCard>
    </motion.div>
  );

  return (
    <div className="w-full">
      
      {/* List Items */}
      <motion.div layout className="divide-y divide-white/5">
        <AnimatePresence>
          {remainingUsers.slice(0, isExpanded ? remainingUsers.length : initialCount).map(renderListItem)}
        </AnimatePresence>
      </motion.div>

      {/* Expand/Collapse Button */}
      {remainingUsers.length > initialCount && (
        <div className="text-center mt-8">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-bold text-gray-500 hover:text-purple-400 uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp size={16} />
              </>
            ) : (
              <>
                View Full Rankings ({remainingUsers.length} total) <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
};

export default LeaderboardList;

import React from "react";
import { Crown, Medal, Flame, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

export default function RankBadge({ rank, previousRank }) {
  const change = previousRank ? previousRank - rank : 0;
  
  const getRankIcon = () => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-400" />;
    if (rank <= 10) return <Flame className="w-5 h-5 text-red-500" />;
    return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
  };

  const getRankStyle = () => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50";
    if (rank === 2) return "bg-gray-500/10 border-gray-400/50";
    if (rank === 3) return "bg-orange-500/10 border-orange-400/50";
    if (rank <= 10) return "bg-red-500/10 border-red-500/30";
    return "bg-gray-800/50 border-gray-700";
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getRankStyle()}`}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
      >
        {getRankIcon()}
      </motion.div>
      
      {change !== 0 && (
        <motion.div
          initial={{ opacity: 0, y: change > 0 ? 10 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center text-xs font-bold ${change > 0 ? "text-green-400" : "text-red-400"}`}
        >
          {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(change)}</span>
        </motion.div>
      )}
    </div>
  );
}
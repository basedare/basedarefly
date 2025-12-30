"use client";

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface DareTimerProps {
  deadline?: string | Date | null; // Allow null/undefined to prevent crashes
  status: string;
}

export default function DareTimer({ deadline, status }: DareTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (status === "completed" || status === "failed" || !deadline) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft("Expired");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [deadline, status]);

  if (status === "completed") {
    return (
      <div className="flex items-center gap-1 text-green-400 text-xs font-bold uppercase tracking-wider bg-green-500/10 px-2 py-1 rounded">
        <CheckCircle2 className="w-3 h-3" />
        <span>Done</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex items-center gap-1 text-red-400 text-xs font-bold uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded">
        <XCircle className="w-3 h-3" />
        <span>Failed</span>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold uppercase tracking-wider bg-yellow-500/10 px-2 py-1 rounded">
        <AlertCircle className="w-3 h-3" />
        <span>Pending</span>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="flex items-center gap-1 text-purple-400 text-xs font-bold uppercase tracking-wider bg-purple-500/10 px-2 py-1 rounded">
        <Clock className="w-3 h-3" />
        <span>{timeLeft || "Calculated..."}</span>
      </div>
    );
  }

  return null;
}



"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { buildXSharePayload } from '@/lib/social-share';

interface ShareWinButtonProps {
  dare?: string;
  amount?: string | number;
  streamer?: string;
  shortId?: string;
  placeName?: string;
}

export default function ShareWinButton({ dare, amount, streamer, shortId, placeName }: ShareWinButtonProps) {
  const handleShare = () => {
    const payload = buildXSharePayload({
      title: dare || 'Verified BaseDare completion',
      amountWon: amount,
      streamerTag: streamer,
      shortId,
      placeName,
      status: 'verified',
    });

    window.open(
      payload.url,
      "_blank",
      "width=600,height=400"
    );
  };

  return (
    <Button
      onClick={handleShare}
      className="bg-gradient-to-r from-[#00ff41] to-green-500 hover:from-green-500 hover:to-[#00ff41] text-black font-black gap-2"
    >
      <Share2 className="w-4 h-4" />
      Share Your Win
    </Button>
  );
}


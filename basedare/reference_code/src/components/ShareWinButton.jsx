import React from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

export default function ShareWinButton({ dare, amount, streamer }) {
  const handleShare = () => {
    const text = `Just won 2x pot on @basedare – forced ${streamer || "@streamer"} to ${dare || "complete an epic dare"} 🔥 LFG #BaseDare #XDARE`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
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
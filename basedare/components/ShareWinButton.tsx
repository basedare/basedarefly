"use client";

import React from "react";
import ShareComposerButton from "@/components/ShareComposerButton";

interface ShareWinButtonProps {
  dare?: string;
  amount?: string | number;
  streamer?: string;
  shortId?: string;
  placeName?: string | null;
  compact?: boolean;
}

export default function ShareWinButton({
  dare,
  amount,
  streamer,
  shortId,
  placeName,
  compact = false,
}: ShareWinButtonProps) {
  return (
    <ShareComposerButton
      title={dare}
      amountWon={amount}
      streamerTag={streamer}
      shortId={shortId}
      placeName={placeName}
      status="verified"
      buttonLabel={compact ? 'Share Win' : 'Share Your Win'}
      compact={compact}
    />
  );
}

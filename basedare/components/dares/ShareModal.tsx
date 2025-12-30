"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, X as XIcon, MessageSquare, Share2, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ShareModalProps {
  dare: any;
  creator?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ dare, creator, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!dare) return null;

  const shareUrl = `https://basedare.app/dare/${dare.id}`;
  const shareText = `Check out this dare: "${dare.title}" by ${creator || dare.streamer_name || 'streamer'} on BASEDARE! 🔥`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText + '\n' + shareUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "DM your friend.",
        className: "bg-green-500/20 border-green-500/50 text-white",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Failed to copy",
        description: "Please try again manually.",
        className: "bg-red-500/20 border-red-500/50 text-white",
      });
    }
  };

  const handleShareX = () => {
    const tweetText = `I just saw this dare on @BASEDARE! 💀\n\n"${dare.title}"\n\n$${dare.stake_amount || 0} at stake\n\n${shareUrl}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const handleFacebookShare = () => {
    window.open(
      `https://www.facebook.com/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const handleInstagramShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Dare Invite!',
          text: shareText.slice(0, 100),
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      handleCopy();
      toast({
        title: "Instagram sharing not supported",
        description: "Link copied to clipboard, paste it on Instagram!",
        className: "bg-yellow-500/20 border-yellow-500/50 text-white",
      });
    }
  };

  const handleSMSShare = () => {
    const smsText = encodeURIComponent(shareText + '\n' + shareUrl);
    window.open(`sms:?body=${smsText}`, '_blank');
  };

  const handleEmailShare = () => {
    const email = prompt('Friend\'s email?');
    if (email) {
      const subject = encodeURIComponent('Dare You!');
      const body = encodeURIComponent(shareText + '\n\n' + shareUrl);
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#14141c] border-purple-500/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Share2 className="w-6 h-6 text-purple-400" />
            Share Dare
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-[#1e1e24] rounded-lg p-4">
            <p className="text-sm text-gray-300 mb-3 line-clamp-3">{shareText}</p>
            <Input
              value={shareUrl}
              readOnly
              className="bg-[#14141c] border-purple-500/30 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleShareX}
              className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white flex items-center gap-2"
            >
              <XIcon className="w-4 h-4" />
              X/Twitter
            </Button>
            
            <Button
              onClick={handleFacebookShare}
              className="bg-[#4267B2] hover:bg-[#365899] text-white flex items-center gap-2"
            >
              {/* Facebook Icon */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>

            <Button
              onClick={handleInstagramShare}
              className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white flex items-center gap-2"
            >
              {/* Instagram Icon */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram
            </Button>

            <Button
              onClick={handleSMSShare}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              SMS
            </Button>

            <Button
              onClick={handleEmailShare}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Gmail
            </Button>

            <Button
              onClick={handleCopy}
              className="bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



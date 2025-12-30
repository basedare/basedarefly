"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Send, Zap, Shield, Mic, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// --- MOCK DATA ---
const MOCK_USER = { 
  email: "you@basedare.com", 
  full_name: "Based God",
  handle: "BasedGod"
};

const MOCK_DARES_LOOKUP: Record<string, any> = {
  "1": {
    id: "1",
    title: "Eat a Ghost Pepper",
    description: "No milk allowed for 5 minutes.",
    stake_amount: 100,
    streamer_name: "KaiCenat",
    status: "accepted",
    image_url: "/bear-mascot.png"
  },
  // Fallback for any other ID
  "default": {
    id: "99",
    title: "Generic Dare Chat",
    description: "This is a simulated dare.",
    stake_amount: 50,
    streamer_name: "StreamerX",
    status: "pending",
    image_url: "/bear-mascot.png"
  }
};

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dareId = searchParams.get("dareId");
  const fromParam = searchParams.get("from");
  const { toast } = useToast();
  
  const [user, setUser] = useState<any>(null);
  const [dare, setDare] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- AUTH & LOAD LOGIC ---
  useEffect(() => {
    if (!dareId) {
      toast({
        title: "No dare ID",
        description: "Redirecting...",
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    // Simulate API fetch
    setTimeout(() => {
      setUser(MOCK_USER);
      
      const foundDare = MOCK_DARES_LOOKUP[dareId] || MOCK_DARES_LOOKUP["default"];
      setDare(foundDare);

      // Load Mock Messages
      setMessages([
        {
          id: 1,
          text: `${foundDare.streamer_name} just dropped this dare! 🔥`,
          userId: 'bot',
          handle: 'StakeDare Bot',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          rep: 999,
        },
        {
          id: 2,
          text: `@${foundDare.streamer_name} You got this! 💪`,
          userId: 'user1',
          handle: 'HyperFan',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          rep: 150,
        },
        {
          id: 3,
          text: 'Stake locked—prove it! 😂',
          userId: 'user2',
          handle: 'ChallengeSeeker',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          rep: 75,
          reactions: { thumb: 5 },
        },
      ]);

      if (fromParam === "card" || fromParam === "feed") {
        setTimeout(() => {
          inputRef.current?.focus();
          toast({
            title: "In the room—banter on! 🗣️",
            description: "Chat is live",
            className: "bg-green-500/20 border-green-500/50 text-white",
          });
        }, 500);
      }
    }, 500);
  }, [dareId, fromParam, router, toast]);

  // --- SCROLL LOGIC ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- HANDLERS ---
  const handleSendMessage = () => {
    if (!message.trim() || !user) return;

    if (message.length > 200) {
      toast({
        title: "Max 200 chars",
        description: "Keep it short",
        variant: "destructive",
      });
      return;
    }

    const newMessage = {
      id: Date.now(),
      text: message,
      userId: user.email,
      handle: user.handle,
      timestamp: new Date().toISOString(),
      rep: 15,
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage("");
    
    toast({
      title: "Dropped! 💬",
      className: "bg-green-500/20 border-green-500/50 text-white",
    });
  };

  const handleReaction = (msgId: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === msgId) {
        return {
          ...msg,
          reactions: {
            ...msg.reactions,
            thumb: (msg.reactions?.thumb || 0) + 1
          }
        };
      }
      return msg;
    }));
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const highlightMentions = (text: string) => {
    return text.replace(/@(\w+)/g, '<span class="text-purple-300 font-bold underline">@$1</span>');
  };

  if (!dare) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white animate-pulse">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative" style={{ paddingBottom: "80px" }}>
      <style>{`
        .glass-header {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(168, 85, 247, 0.3);
        }

        .glass-card {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .message-bubble-self {
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 16px 16px 4px 16px;
        }

        .message-bubble-other {
          background: rgba(107, 114, 128, 0.1);
          border: 1px solid rgba(107, 114, 128, 0.2);
          border-radius: 16px 16px 16px 4px;
        }

        .reaction-chip {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .reaction-chip:hover { transform: scale(1.1); }
      `}</style>

      {/* Header */}
      <div className="glass-header h-16 flex justify-between items-center px-4 fixed top-0 left-0 right-0 z-50 mt-[70px] md:mt-[80px]">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-white text-lg truncate max-w-[150px] md:max-w-none">
            {dare.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {dare.status === "accepted" && (
            <div className="glass-card px-3 py-1 flex items-center gap-1 text-green-300 text-xs">
              <Shield className="w-3 h-3" />
              <span className="hidden sm:inline">${dare.stake_amount}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-green-300"
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Spacer for header */}
      <div className="h-16 mt-[70px] md:mt-[80px]"></div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="h-20 flex items-center justify-center text-gray-400">
            Kick off the drama...
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg) => {
              const isSelf = user && msg.userId === user.email;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
                    <AvatarFallback className="bg-transparent text-white font-bold">
                      {msg.handle[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[80%]`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-semibold">{msg.handle}</span>
                      <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className={isSelf ? 'message-bubble-self' : 'message-bubble-other'}>
                      <p
                        className="text-white p-3 text-sm"
                        dangerouslySetInnerHTML={{ __html: highlightMentions(msg.text) }}
                      />
                    </div>
                    {msg.reactions?.thumb > 0 && (
                      <button 
                        onClick={() => handleReaction(msg.id)}
                        className="reaction-chip mt-1 flex items-center gap-1 text-green-300"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{msg.reactions.thumb}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass-header h-20 px-4 flex items-center gap-2 fixed bottom-0 left-0 right-0 z-50 bg-background">
        <Textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type... @mention"
          className="flex-1 h-12 px-3 py-3 rounded-lg border-purple-500/30 focus:border-purple-500/50 bg-black/50 text-white placeholder:text-gray-400 resize-none"
          maxLength={200}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="w-14 h-12 bg-orange-500/80 hover:bg-orange-400 text-white rounded-lg"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}

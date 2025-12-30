"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Send, Shield, ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatSidebarProps {
  dare: any;
  isOpen: boolean;
  onClose: () => void;
}

// Mock User
const MOCK_USER = { email: "you@basedare.com", full_name: "You" };

export default function ChatSidebar({ dare, isOpen, onClose }: ChatSidebarProps) {
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Touch Handling State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Simulate Auth
  useEffect(() => {
    setUser(MOCK_USER);
  }, []);

  // Load Mock Messages on Open
  useEffect(() => {
    if (dare && isOpen) {
      const mockMessages = [
        {
          id: 1,
          text: `${dare.streamer_name || 'Streamer'} just dropped this dare! 🔥`,
          userId: 'bot',
          handle: 'BASEDARE Bot',
          timestamp: new Date(Date.now() - 3600000),
          rep: 999,
        },
        {
          id: 2,
          text: `@${dare.streamer_name || 'creator'} You got this! 💪`,
          userId: 'user1',
          handle: 'HyperFan',
          timestamp: new Date(Date.now() - 1800000),
          rep: 150,
        },
        {
          id: 3,
          text: 'Stake locked—prove it! 😂',
          userId: 'user2',
          handle: 'ChallengeSeeker',
          timestamp: new Date(Date.now() - 900000),
          rep: 75,
          reactions: { thumb: 5 },
        },
      ];
      setMessages(mockMessages);
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [dare, isOpen]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;

    const newMessage = {
      id: Date.now(),
      text: message,
      userId: user.email,
      handle: user.full_name || 'Anonymous',
      timestamp: new Date(),
      rep: 15,
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      return updated.slice(-50);
    });
    setMessage("");
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

  const formatTime = (timestamp: any) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const highlightMentions = (text: string) => {
    return text.replace(/@(\w+)/g, '<span class="text-purple-300 font-bold underline">@$1</span>');
  };

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50; // Closing swipe
    // You typically close a right-side drawer by swiping RIGHT (positive delta usually means right in some libs, but let's stick to your logic)
    // If sidebar is on RIGHT, swiping RIGHT (start < end) closes it.
    // If sidebar is on RIGHT, swiping LEFT (start > end) opens/keeps it.
    
    // Assuming standard "Swipe Right to Close" for a right-side drawer:
    if (touchEnd > touchStart + 50) { 
       onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx global>{`
        .chat-sidebar {
          position: fixed; right: 0; top: 64px; height: calc(100vh - 64px); width: 400px;
          backdrop-filter: blur(12px); background: #020204;
          border-left: 1px solid rgba(168, 85, 247, 0.3);
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
          z-index: 45; display: flex; flex-direction: column;
          transition: transform 0.3s ease;
          border-top-left-radius: 16px;
        }
        .chat-sidebar.closed { transform: translateX(100%); }
        @media (max-width: 768px) {
          .chat-sidebar { width: 100vw; top: 0; height: 100vh; z-index: 60; border-radius: 0; }
        }
      `}</style>

      {/* Mobile Overlay */}
      <div className="fixed inset-0 bg-black/80 md:hidden z-50" onClick={onClose} />

      <div 
        className="chat-sidebar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="p-4 border-b border-purple-500/30 bg-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="font-bold text-white text-lg truncate">
              {dare?.title || 'Chat'} Chat
            </div>
            <button onClick={onClose} className="p-2 bg-orange-500/20 border border-orange-500/40 rounded-lg text-orange-400 hover:scale-105 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          {dare?.status === "accepted" && dare.stake_amount && (
            <div className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-1 rounded-full text-xs font-bold w-fit">
              <Shield className="w-3 h-3" />
              <span>BOUNTY POT: ${dare.stake_amount}</span>
            </div>
          )}
        </div>

        {!user && (
           <div className="bg-purple-900/20 p-2 text-center text-xs text-gray-400 border-b border-purple-500/20">
             Pro: Pin Multiple Chats
           </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background flex flex-col-reverse">
           <div ref={messagesEndRef} />
           <AnimatePresence>
             {messages.slice().reverse().map((msg) => {
               const isSelf = user && msg.userId === user.email;
               return (
                 <motion.div
                   key={msg.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'} items-start`}
                 >
                   <Avatar className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
                     <AvatarFallback className="bg-transparent text-white text-xs font-bold">
                       {msg.handle[0]?.toUpperCase()}
                     </AvatarFallback>
                   </Avatar>
                   <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[80%]`}>
                     <div className="flex items-center gap-2 mb-1">
                       <span className="text-white text-xs font-bold">{msg.handle}</span>
                       <span className="text-gray-500 text-[10px]">{formatTime(msg.timestamp)}</span>
                     </div>
                     <div className={`p-2 rounded-xl text-xs text-white ${
                       isSelf ? 'bg-purple-500/20 border border-purple-500/30 rounded-tr-sm' : 'bg-gray-800 border border-gray-700 rounded-tl-sm'
                     }`}>
                       <p dangerouslySetInnerHTML={{ __html: highlightMentions(msg.text) }} />
                     </div>
                     {msg.reactions?.thumb > 0 && (
                       <button onClick={() => handleReaction(msg.id)} className="mt-1 flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 hover:scale-105 transition">
                         <ThumbsUp className="w-2 h-2" /> {msg.reactions.thumb}
                       </button>
                     )}
                   </div>
                 </motion.div>
               );
             })}
           </AnimatePresence>
        </div>

        {/* Input Area */}
        {dare && (
          <div className="p-3 border-t border-purple-500/20 bg-white/5 flex gap-2 items-center">
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
              placeholder="@mention to ping"
              className="flex-1 h-10 min-h-0 py-2 bg-black/50 border-purple-500/30 focus:border-purple-500 resize-none text-xs"
              maxLength={200}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="h-10 w-10 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}



import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Send, Zap, Shield, Mic } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function DareChatPage() {
  const [searchParams] = useSearchParams();
  const dareId = searchParams.get("dareId");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: dare } = useQuery({
    queryKey: ['dare', dareId],
    queryFn: async () => {
      const allDares = await base44.entities.Dare.list();
      return allDares.find(d => d.id === dareId);
    },
    enabled: !!dareId,
  });

  // Mock messages - in real app would use Firestore realtime
  useEffect(() => {
    if (dare) {
      const mockMessages = [
        {
          id: 1,
          text: `${dare.streamer_name || 'Streamer'} just dropped this dare! 🔥`,
          userId: 'bot',
          handle: 'StakeDare Bot',
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
          reactions: { '👍': 5, '🔥': 3 },
        },
      ];
      setMessages(mockMessages);
    }
  }, [dare]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;

    if (message.length > 200) {
      toast({
        title: "Short & sweet—max 200!",
        description: "Keep messages concise",
        className: "bg-orange-500/20 border-orange-500/50 text-white",
      });
      return;
    }

    const newMessage = {
      id: Date.now(),
      text: message,
      userId: user.email,
      handle: user.full_name || 'Anonymous',
      timestamp: new Date(),
      rep: 15,
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage("");
    
    toast({
      title: "Msg dropped—hype it! 💬",
      description: "Message sent successfully",
      className: "bg-green-500/20 border-green-500/50 text-white",
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const highlightMentions = (text) => {
    return text.replace(/@(\w+)/g, '<span class="text-purple-300 font-bold underline">@$1</span>');
  };

  if (!dare) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-white">Loading dare chat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
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

        .glass-card:hover {
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.3);
          transform: scale(1.02);
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

        .messages-container {
          max-height: calc(100vh - 14rem - 4rem);
          overflow-y: auto;
          display: flex;
          flex-direction: column-reverse;
        }

        .messages-container::-webkit-scrollbar {
          width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 4px;
        }

        @media (max-width: 768px) {
          .messages-container {
            max-height: calc(100vh - 12rem - 4rem);
          }
        }
      `}</style>

      {/* Header */}
      <div className="glass-header h-14 flex justify-between items-center px-4">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="text-orange-400 hover:text-orange-300">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-white text-lg truncate max-w-[200px] md:max-w-none">
            {dare.title} Chat
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {dare.status === "accepted" && (
            <div className="glass-card px-3 py-1 flex items-center gap-1 text-green-300 text-xs">
              <Shield className="w-3 h-3" />
              <span>Staked: ${dare.stake_amount || 0}</span>
            </div>
          )}
          <div className="glass-card px-3 py-1 flex items-center gap-1 text-purple-300 text-xs">
            <span>15pts 🥉</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-green-400 hover:text-green-300"
            title="Voice Chat (Premium)"
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Dare Preview Banner */}
      {dare.image_url && (
        <div className="glass-card m-4 overflow-hidden">
          <img
            src={dare.image_url}
            alt={dare.title}
            className="w-full h-32 object-cover"
          />
          <div className="p-3 flex justify-between items-center">
            <div>
              <p className="text-white font-semibold">{dare.title}</p>
              <p className="text-gray-400 text-sm">{dare.description?.slice(0, 60)}...</p>
            </div>
            <div className="flex items-center gap-1 text-orange-400">
              <Zap className="w-4 h-4" />
              <span className="font-bold">${dare.stake_amount || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container flex-1 p-4 space-y-3">
        <div ref={messagesEndRef} />
        <AnimatePresence>
          {messages.slice().reverse().map((msg) => {
            const isSelf = user && msg.userId === user.email;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                  <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                    {msg.handle[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-semibold">{msg.handle}</span>
                    <span className="text-gray-400 text-xs">{formatTime(msg.timestamp)}</span>
                    {msg.rep && (
                      <span className="text-purple-400 text-xs">{msg.rep} rep</span>
                    )}
                  </div>
                  <div className={isSelf ? 'message-bubble-self' : 'message-bubble-other'}>
                    <p
                      className="text-white p-3 text-sm"
                      dangerouslySetInnerHTML={{ __html: highlightMentions(msg.text) }}
                    />
                  </div>
                  {msg.reactions && (
                    <div className="flex gap-1 mt-1">
                      {Object.entries(msg.reactions).map(([emoji, count]) => (
                        <span
                          key={emoji}
                          className="glass-card px-2 py-0.5 text-xs cursor-pointer hover:scale-110 transition-transform"
                        >
                          {emoji} {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="glass-header h-16 px-4 flex items-center gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Drop a message..."
          className="flex-1 h-10 px-3 rounded-lg border-purple-500/30 focus:border-purple-500/50 bg-transparent text-white placeholder:text-gray-400 resize-none"
          maxLength={200}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="w-20 h-10 bg-orange-500/80 hover:bg-orange-400 text-white rounded-lg disabled:bg-gray-500/50"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
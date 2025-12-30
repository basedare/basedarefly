
import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Send, Shield, ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatSidebar({ dare, isOpen, onClose }) {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

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

  const handleReaction = (msgId) => {
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const highlightMentions = (text) => {
    return text.replace(/@(\w+)/g, '<span class="text-purple-300 font-bold underline">@$1</span>');
  };

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    if (isLeftSwipe) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .chat-sidebar {
          position: fixed;
          right: 0;
          top: 64px;
          height: calc(100vh - 64px);
          width: 400px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: #0A0A0F;
          border-left: 1px solid rgba(168, 85, 247, 0.3);
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
          z-index: 45;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease;
          border-top-left-radius: 16px;
        }

        .chat-sidebar.closed {
          transform: translateX(100%);
        }

        .chat-header {
          position: relative;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(168, 85, 247, 0.3);
          flex-shrink: 0;
          padding: 1rem 1.25rem;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .chat-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .chat-close-btn {
          width: 2.5rem;
          height: 2.5rem;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #F59E0B;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 8px;
          transition: all 0.2s ease;
          z-index: 100;
        }

        @media (prefers-reduced-motion: no-preference) {
          .chat-close-btn:hover {
            transform: scale(1.05);
            background: rgba(245, 158, 11, 0.3);
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
          }

          .chat-close-btn:active {
            transform: scale(0.95) rotate(90deg);
          }
        }

        .chat-title {
          font-weight: 700;
          color: white;
          font-size: 0.95rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        .escrow-pill {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10B981;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
        }

        .premium-tease {
          background: rgba(168, 85, 247, 0.1);
          border-bottom: 1px solid rgba(168, 85, 247, 0.2);
          padding: 0.5rem 1rem;
          flex-shrink: 0;
        }

        .premium-text {
          color: #9ca3af;
          font-size: 0.7rem;
          text-align: center;
        }

        .messages-container {
          flex: 1;
          display: flex;
          flex-direction: column-reverse;
          max-height: calc(100vh - 14rem);
          overflow-y: auto;
          padding: 0.75rem;
          gap: 0.5rem;
          background: #0A0A0F;
        }

        .messages-container::-webkit-scrollbar {
          width: 4px;
          background: #0A0A0F;
        }

        .messages-container::-webkit-scrollbar-track {
          background: #0A0A0F;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 2px;
        }

        .message-bubble-self {
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 16px 16px 4px 16px;
          padding: 0.5rem;
          max-width: fit-content;
          margin-left: auto;
          margin-right: 1rem;
          word-wrap: break-word;
        }

        .message-bubble-other {
          background: rgba(107, 114, 128, 0.1);
          border: 1px solid rgba(107, 114, 128, 0.2);
          border-radius: 16px 16px 16px 4px;
          padding: 0.5rem;
          max-width: fit-content;
          margin-left: 1rem;
          word-wrap: break-word;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
          background: #0A0A0F;
        }

        .empty-pill {
          backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
          padding: 0.75rem 1.5rem;
          color: #9ca3af;
          font-size: 0.9rem;
        }

        .reaction-chip {
          backdrop-filter: blur(12px);
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          color: #10B981;
        }

        .reaction-chip:hover {
          background: rgba(16, 185, 129, 0.25);
          transform: scale(1.05);
        }

        .chat-input-container {
          position: relative;
          backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(168, 85, 247, 0.1);
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
          height: 3rem;
          z-index: 5;
        }

        .chat-input {
          flex: 1;
          height: 2rem;
          padding: 0 0.5rem;
          border-radius: 8px;
          border: 1px solid rgba(168, 85, 247, 0.3);
          background: transparent;
          color: white;
          font-size: 0.8rem;
          resize: none;
          transition: all 0.2s ease;
        }

        .chat-input:focus {
          border-color: rgba(168, 85, 247, 0.5);
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
          outline: none;
        }

        .chat-input::placeholder {
          color: #6b7280;
        }

        .send-btn {
          width: 4rem;
          height: 2rem;
          background: rgba(168, 85, 247, 0.8);
          border-radius: 8px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
        }

        .send-btn:hover:not(:disabled) {
          background: rgba(168, 85, 247, 1);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
        }

        .send-btn:disabled {
          background: rgba(107, 114, 128, 0.5);
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .chat-sidebar {
            width: 100vw;
            top: 0;
            height: 100vh;
            z-index: 60;
            border-radius: 0;
            background: #0A0A0F;
          }

          .chat-overlay {
            position: fixed;
            inset: 0;
            background: rgba(10, 10, 15, 0.9);
            z-index: 59;
          }

          .chat-header {
            padding: 1.5rem 1.25rem;
          }

          .chat-close-btn {
            width: 3rem;
            height: 3rem;
          }

          .messages-container {
            max-height: calc(100vh - 12rem);
            background: #0A0A0F;
          }
        }
      `}</style>

      <div className="chat-overlay md:hidden" onClick={onClose} />

      <div 
        className={`chat-sidebar ${!isOpen ? 'closed' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="chat-header">
          <div className="chat-header-row">
            <div className="chat-title">
              {dare?.title || 'Chat'} Chat
            </div>
            <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
              <X className="w-5 h-5" />
            </button>
          </div>
          {dare?.status === "accepted" && dare.stake_amount && (
            <div className="escrow-pill">
              <Shield className="w-3 h-3" />
              <span>BOUNTY POT: ${dare.stake_amount}</span>
            </div>
          )}
        </div>

        {!user?.subscription && (
          <div className="premium-tease">
            <p className="premium-text">Pro: Pin Multiple Chats</p>
          </div>
        )}

        {!dare ? (
          <div className="empty-state">
            <div className="empty-pill">Select a dare to start chatting 🔥</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-pill">First message earns rep 🏆</div>
          </div>
        ) : (
          <div className="messages-container">
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
                    className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'} items-start`}
                  >
                    <Avatar className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                      <AvatarFallback className="bg-transparent text-white font-semibold text-xs">
                        {msg.handle[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-xs font-semibold">{msg.handle}</span>
                        <span className="text-gray-400 text-xs">{formatTime(msg.timestamp)}</span>
                        {msg.rep && (
                          <span className="text-purple-400 text-xs">{msg.rep}</span>
                        )}
                      </div>
                      <div className={isSelf ? 'message-bubble-self' : 'message-bubble-other'}>
                        <p
                          className="text-white text-xs"
                          dangerouslySetInnerHTML={{ __html: highlightMentions(msg.text) }}
                        />
                      </div>
                      {msg.reactions?.thumb > 0 && (
                        <button 
                          onClick={() => handleReaction(msg.id)}
                          className="reaction-chip mt-1"
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
          </div>
        )}

        {dare && (
          <div className="chat-input-container">
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
              className="chat-input"
              maxLength={200}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="send-btn"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

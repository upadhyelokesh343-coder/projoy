import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Message } from '../types';
import { ArrowLeft, Send, MessageSquare, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface UserChatProps {
  userId: string;
  userName: string;
  isAdminMode?: boolean;
  onBack: () => void;
}

export default function UserChat({ userId, userName, isAdminMode = false, onBack }: UserChatProps) {
  const currentUser = useStore(state => state.currentUser);
  const sendMessage = useStore(state => state.sendMessage);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time listener for this specific user's conversation
  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore snapshot error in UserChat:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSending(true);
    try {
      const receiverId = isAdminMode ? userId : 'admin';
      await sendMessage(inputText.trim(), userId, receiverId, isAdminMode);
      setInputText('');
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 animate-in fade-in duration-300">
      {/* Chat Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-neutral-900 border-b border-neutral-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white transition-all hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAdminMode ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {isAdminMode ? <UserIcon className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                {isAdminMode ? userName : 'Support Admin'}
              </h3>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Active Support Chat
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-2">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-sm">Loading chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 border border-neutral-800">
              <MessageSquare className="w-8 h-8 text-neutral-600" />
            </div>
            <div className="max-w-xs">
              <p className="text-white font-bold text-sm">No messages yet</p>
              <p className="text-xs text-neutral-500 mt-1">
                {isAdminMode 
                  ? "Send a message to this user to start the conversation." 
                  : "Welcome to Player Support! Write a message below to connect with an admin directly."
                }
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            // Updated Logic: userId is the player ID.
            // Player -> Left side, Emerald. Admin -> Right side, Blue.
            const isPlayer = msg.senderId === userId;
            
            return (
              <div 
                key={msg.id || idx}
                className={`flex ${!isPlayer ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-150`}
              >
                <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3.5 shadow-xl ${
                  !isPlayer 
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10' 
                    : 'bg-emerald-500 text-neutral-950 font-medium rounded-tl-none shadow-emerald-500/10'
                }`}>
                  <p className="text-sm md:text-base break-words whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </p>
                  <div className={`flex items-center gap-2 mt-2 ${!isPlayer ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${!isPlayer ? 'text-blue-100/70' : 'text-neutral-950/50'}`}>
                      {!isPlayer ? 'Admin' : 'Player'}
                    </span>
                    <span className={`text-[10px] font-medium ${!isPlayer ? 'text-blue-100/60' : 'text-neutral-950/40'}`}>
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box - Fixed at bottom of the flex column */}
      <div className="bg-neutral-900 border-t border-neutral-800 p-4 pb-6 md:pb-6 flex-shrink-0 z-20">
        <form 
          onSubmit={handleSend}
          className="flex items-center gap-3 max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 px-5 py-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm md:text-base text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-inner"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-neutral-950 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20"
          >
            {sending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

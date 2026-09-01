import React from "react";
import { useState } from 'react';
import { useStore } from '../store';
import { User as UserIcon, LogOut, CheckCircle2, Trophy, Gamepad2, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import UserChat from '../components/UserChat';

export default function Profile() {
  const currentUser = useStore(state => state.currentUser);
  const updateProfile = useStore(state => state.updateProfile);
  const logout = useStore(state => state.logout);
  const tournaments = useStore(state => state.tournaments);
  const transactions = useStore(state => state.transactions);
  
  const [name, setName] = useState(currentUser?.name || '');
  const [isSaved, setIsSaved] = useState(false);
  const [view, setView] = useState<'profile' | 'chat'>('profile');

  if (!currentUser) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const totalPlayed = tournaments.filter(t => t.participants.some(p => p.userId === currentUser.id)).length;
  const totalWon = transactions
    .filter(tx => tx.userId === currentUser.id && tx.type === 'prize' && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (view === 'chat') {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col h-screen w-screen overflow-hidden">
        <UserChat 
          userId={currentUser.id} 
          userName={currentUser.name || "Anonymous"} 
          onBack={() => setView('profile')} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="text-center p-6 flex flex-col items-center">
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            boxShadow: [
              "0 0 20px rgba(16,185,129,0.2)", 
              "0 0 35px rgba(16,185,129,0.4)", 
              "0 0 20px rgba(16,185,129,0.2)"
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-28 h-28 rounded-full mb-4 overflow-hidden border-4 border-emerald-500/30 bg-neutral-800 relative group"
        >
          <img 
            src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${currentUser.id}`} 
            alt="Profile Avatar" 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {/* Animated Glow Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/10 animate-ping opacity-20"></div>
        </motion.div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight">{currentUser.name}</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <p className="text-neutral-400 font-medium">+91 {currentUser.phone}</p>
          </div>
        </div>
      </div>

      {/* Stats Boxes */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col items-center text-center shadow-lg"
        >
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
            <Gamepad2 className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">Played</p>
          <p className="text-2xl font-black text-white">{totalPlayed}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col items-center text-center shadow-lg"
        >
          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center mb-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">Won</p>
          <p className="text-2xl font-black text-emerald-400">₹{totalWon}</p>
        </motion.div>
      </div>

      {/* Message / Support Box */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-neutral-900 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between shadow-xl">
        <div className="space-y-1">
          <h3 className="font-bold text-white text-base">Support & Help</h3>
          <p className="text-xs text-neutral-400">Have questions? Chat live with our admins.</p>
        </div>
        <button
          onClick={() => setView('chat')}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-1.5"
        >
          <MessageSquare className="w-4 h-4" /> Live Chat
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2 flex items-center gap-2">
            <UserIcon className="w-4 h-4" /> Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:border-emerald-500 outline-none transition-colors"
            placeholder="Your Name"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {isSaved ? <><CheckCircle2 className="w-5 h-5" /> Saved Successfully</> : 'Save Changes'}
        </button>
      </form>

      <button
        onClick={logout}
        className="w-full py-4 text-red-400 hover:bg-red-400/10 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-5 h-5" /> Logout
      </button>
    </div>
  );
}

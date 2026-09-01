import React, { useState } from 'react';
import { useStore } from '../store';
import { Gamepad2, X } from 'lucide-react';

export const JoinTournamentModal = ({ tournamentId, isOpen, onClose }: { tournamentId: string, isOpen: boolean, onClose: () => void }) => {
  const [freeFireId, setFreeFireId] = useState('');
  const [freeFireName, setFreeFireName] = useState('');
  const joinTournamentExtended = useStore(state => state.joinTournamentExtended);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await joinTournamentExtended(tournamentId, freeFireId, freeFireName);
    alert(result.message);
    if (result.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl w-full max-w-md space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Gamepad2 className="w-5 h-5 text-emerald-400" /> Enter In-Game Details</h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-white"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">In-Game ID / UID</label>
              <input 
                type="text" 
                placeholder="e.g. 847294821" 
                value={freeFireId} 
                onChange={e=>setFreeFireId(e.target.value)} 
                required 
                className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Player Name / In-Game Name</label>
              <input 
                type="text" 
                placeholder="e.g. SNIPER_BOSS" 
                value={freeFireName} 
                onChange={e=>setFreeFireName(e.target.value)} 
                required 
                className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" 
              />
            </div>
            <button type="submit" className="w-full py-4 bg-emerald-500 text-neutral-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors">Join & Pay</button>
        </form>
      </div>
    </div>
  );
};

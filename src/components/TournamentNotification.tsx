import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Bell, X, Trophy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export default function TournamentNotification() {
  const tournaments = useStore(state => state.tournaments);
  const [latestTournament, setLatestTournament] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (tournaments.length > 0) {
      // Find the most recently created tournament
      const sorted = [...tournaments].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      const latest = sorted[0];
      
      // Check if it was created in the last 6 hours (to keep it fresh but not annoying)
      if (latest.createdAt) {
        const createdTime = new Date(latest.createdAt).getTime();
        const now = new Date().getTime();
        const diffInHours = (now - createdTime) / (1000 * 60 * 60);

        if (diffInHours < 6) {
          setLatestTournament(latest);
          setIsVisible(true);
        }
      }
    }
  }, [tournaments]);

  if (!latestTournament || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-emerald-500/10 border-b border-emerald-500/20 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
                <Bell className="w-4 h-4 text-neutral-950" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  New Tournament Added! 
                  <span className="hidden md:inline text-neutral-400 font-normal">• {latestTournament.game}</span>
                </p>
                <p className="text-xs text-white truncate max-w-[200px] md:max-w-md">
                  {latestTournament.title} is now open for registration. Join now!
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link 
                to={`/tournament/${latestTournament.id}`}
                className="px-3 py-1.5 bg-emerald-500 text-neutral-950 text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors flex items-center gap-1.5"
              >
                Join Now <ExternalLink className="w-3 h-3" />
              </Link>
              <button 
                onClick={() => setIsVisible(false)}
                className="p-1.5 text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

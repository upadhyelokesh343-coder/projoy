import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { Users, Coins, Trophy, Calendar, Gamepad2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { useState } from 'react';
import TournamentNotification from '../components/TournamentNotification';
import InstallPWA from '../components/InstallPWA';

export default function Home() {
  const allTournaments = useStore(state => state.tournaments);
  const currentUser = useStore(state => state.currentUser);
  
  const [selectedGame, setSelectedGame] = useState<'BGMI' | 'Free Fire'>('BGMI');
  
  const tournaments = allTournaments.filter(t => t.game === selectedGame);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <InstallPWA />
      <TournamentNotification />

      {/* Scrolling Announcement Marquee */}
      <div className="bg-neutral-900 border border-neutral-800 py-2 overflow-hidden flex items-center gap-4">
        <div className="flex-shrink-0 bg-emerald-500 text-neutral-950 text-[10px] font-black px-2 py-0.5 ml-4 rounded-md animate-pulse">
          LATEST
        </div>
        <div className="flex-1 whitespace-nowrap overflow-hidden relative">
          <motion.div 
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="inline-block text-xs font-bold text-neutral-400"
          >
            {tournaments.length > 0 
              ? `New Tournament: ${tournaments[0].title} is now LIVE! Registration open for ${tournaments[0].game}. Prize Pool: ₹${tournaments[0].prizePool} • `
              : 'Welcome to Nexus Gaming! New tournaments added daily. Stay tuned for exciting prizes! • '
            }
            {tournaments.length > 1 && `Upcoming: ${tournaments[1].title} starting soon! • `}
          </motion.div>
        </div>
      </div>

      <div className="md:hidden flex flex-col mb-2 mt-2">
        <p className="text-neutral-400 text-sm">Welcome back,</p>
        <p className="text-lg font-bold text-white">{currentUser?.name}</p>
      </div>

      {/* Game Filter Tabs */}
      <div className="flex gap-3 mb-2">
        <button 
          onClick={() => setSelectedGame('BGMI')}
          className={`flex-1 py-3.5 px-4 rounded-2xl font-black uppercase tracking-wider transition-all border flex justify-center items-center gap-2 ${
            selectedGame === 'BGMI' 
              ? 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
              : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
          }`}
        >
          <Gamepad2 className="w-5 h-5" /> BGMI
        </button>
        <button 
          onClick={() => setSelectedGame('Free Fire')}
          className={`flex-1 py-3.5 px-4 rounded-2xl font-black uppercase tracking-wider transition-all border flex justify-center items-center gap-2 ${
            selectedGame === 'Free Fire' 
              ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
              : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
          }`}
        >
          <Gamepad2 className="w-5 h-5" /> Free Fire
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          Active Tournaments
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t, idx) => {
            const participants = t.participants || [];
            const isJoined = !!participants.find(p => p.userId === currentUser?.id);
            const progress = (participants.length / t.maxSlots) * 100;
            const isFull = participants.length >= t.maxSlots;
            const isNew = t.createdAt && (new Date().getTime() - new Date(t.createdAt).getTime()) < (24 * 60 * 60 * 1000);

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={t.id} 
                className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col group relative"
              >
                {/* NEW Badge */}
                {isNew && (
                  <div className="absolute top-0 right-0 z-20">
                    <div className="bg-amber-500 text-neutral-950 text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-lg animate-pulse">
                      NEW
                    </div>
                  </div>
                )}

                {/* Banner */}
                <div className="relative aspect-video w-full overflow-hidden bg-neutral-800">
                  <img src={t.banner} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent opacity-60"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${t.status === 'live' ? 'bg-red-500/90 text-white' : t.status === 'completed' ? 'bg-neutral-700/90 text-white' : 'bg-emerald-500/90 text-neutral-950'}`}>
                      {t.status.toUpperCase()}
                    </span>
                  </div>
                  {/* Game Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md border border-white/10">
                      {t.game}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg mb-2 text-white">{t.title}</h3>
                  
                  <div className="flex items-center gap-2 text-neutral-400 text-sm mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>{(() => {
                      try {
                        const d = new Date(t.startTime);
                        return isNaN(d.getTime()) ? 'Date pending' : format(d, "dd MMM, h:mm a");
                      } catch {
                        return 'Date pending';
                      }
                    })()}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-neutral-950 rounded-xl p-3 border border-neutral-800/50">
                      <p className="text-xs text-neutral-500 mb-1">Prize Pool</p>
                      <p className="font-bold text-emerald-400">₹{t.prizePool}</p>
                    </div>
                    <div className="bg-neutral-950 rounded-xl p-3 border border-neutral-800/50">
                      <p className="text-xs text-neutral-500 mb-1">Entry Fee</p>
                      <p className="font-bold text-white">₹{t.entryFee}</p>
                    </div>
                  </div>

                  {/* Prize Distribution Preview */}
                  {t.prizeDistribution && t.prizeDistribution.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Top Prizes</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {[...t.prizeDistribution].sort((a, b) => a.rank - b.rank).slice(0, 3).map((dist, idx) => (
                          <div key={idx} className="flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                            <span className="text-xs">{dist.rank === 1 ? '🥇' : dist.rank === 2 ? '🥈' : dist.rank === 3 ? '🥉' : `#${dist.rank}`}</span>
                            <span className="text-xs font-bold text-white">₹{dist.prize}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Slot Bar */}
                  <div className="mb-5 mt-auto">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-neutral-400 flex items-center gap-1"><Users className="w-3 h-3"/> Slots Filled</span>
                      <span className="font-medium text-white">{participants.length} / {t.maxSlots}</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <Link 
                    to={`/tournament/${t.id}`}
                    className={`block w-full py-3 rounded-xl text-center font-bold transition-colors ${
                      isJoined 
                        ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/30 hover:bg-neutral-800/80' 
                        : isFull
                          ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-neutral-950'
                    }`}
                  >
                    {isJoined ? 'View Details' : isFull ? 'Slot Full' : 'Join Now'}
                  </Link>
                </div>
              </motion.div>
            );
          })}
          {tournaments.length === 0 && (
            <div className="col-span-full py-12 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-2xl">
              No active tournaments right now. Check back later!
            </div>
          )}
        </div>
      </div>

      {/* Recent Champions Section */}
      {(() => {
        const completedWithWinners = tournaments.filter(t => t.status === 'completed' && t.winners && t.winners.length > 0);
        if (completedWithWinners.length === 0) return null;

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
                Recent Champions
              </h2>
              <Link to="/winners" className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors">
                View Hall of Fame →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedWithWinners.slice(0, 2).map((t, idx) => {
                const firstWinner = t.winners?.find(w => w.position === 1);
                if (!firstWinner) return null;

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={t.id} 
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden group hover:border-neutral-700 transition-all shadow-md"
                  >
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all"></div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-3xl filter drop-shadow">🥇</span>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Tournament Champion</p>
                        <h4 className="font-extrabold text-white text-sm">{firstWinner.freeFireName}</h4>
                        <p className="text-xs text-neutral-500 truncate max-w-[200px]">{t.title}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded">
                        ₹{firstWinner.prize} Won
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

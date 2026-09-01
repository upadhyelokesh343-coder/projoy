import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Trophy, Gamepad2, Award, Sparkles, Medal, User, ArrowLeft, Search, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Winners() {
  const tournaments = useStore(state => state.tournaments);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'leaderboard'>('recent');

  // Filter completed tournaments that have winners
  const completedTournaments = useMemo(() => {
    return tournaments.filter(t => t.status === 'completed' && t.winners && t.winners.length > 0);
  }, [tournaments]);

  // Generate aggregate leaderboard of all-time earnings
  const leaderboard = useMemo(() => {
    const earningsMap: { 
      [userId: string]: { 
        userId: string; 
        userName: string; 
        freeFireName: string; 
        freeFireId: string; 
        totalEarnings: number; 
        winsCount: number;
        positions: { [pos: number]: number };
      } 
    } = {};

    completedTournaments.forEach(t => {
      t.winners?.forEach(w => {
        if (!earningsMap[w.userId]) {
          earningsMap[w.userId] = {
            userId: w.userId,
            userName: w.userName,
            freeFireName: w.freeFireName,
            freeFireId: w.freeFireId,
            totalEarnings: 0,
            winsCount: 0,
            positions: { 1: 0, 2: 0, 3: 0 }
          };
        }
        
        earningsMap[w.userId].totalEarnings += w.prize;
        earningsMap[w.userId].winsCount += 1;
        earningsMap[w.userId].positions[w.position] = (earningsMap[w.userId].positions[w.position] || 0) + 1;
      });
    });

    return Object.values(earningsMap).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [completedTournaments]);

  // Filter lists based on search
  const filteredCompleted = useMemo(() => {
    if (!searchTerm) return completedTournaments;
    const lower = searchTerm.toLowerCase();
    return completedTournaments.filter(t => 
      t.title.toLowerCase().includes(lower) || 
      t.game.toLowerCase().includes(lower) ||
      t.winners?.some(w => w.freeFireName.toLowerCase().includes(lower) || w.userName.toLowerCase().includes(lower))
    );
  }, [completedTournaments, searchTerm]);

  const filteredLeaderboard = useMemo(() => {
    if (!searchTerm) return leaderboard;
    const lower = searchTerm.toLowerCase();
    return leaderboard.filter(l => 
      l.freeFireName.toLowerCase().includes(lower) || 
      l.userName.toLowerCase().includes(lower) ||
      l.freeFireId.toLowerCase().includes(lower)
    );
  }, [leaderboard, searchTerm]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-950/40 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute left-1/3 bottom-0 -mb-10 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>THE HALL OF FAME</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Recent Winners</h1>
            <p className="text-sm text-neutral-400">Celebrating the champions and top earners of ProJoy.</p>
          </div>
          <Link to="/" className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white px-4 py-2 bg-neutral-950/80 border border-neutral-800 rounded-xl transition-all self-stretch md:self-auto justify-center">
            <ArrowLeft className="w-4 h-4" /> Back to Tournaments
          </Link>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        {/* Tab Buttons */}
        <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800/80 self-start">
          <button 
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'recent' ? 'bg-purple-500 text-neutral-950 shadow-md shadow-purple-500/20' : 'text-neutral-400 hover:text-white'}`}
          >
            <Trophy className="w-3.5 h-3.5" /> Recent Champions
          </button>
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'leaderboard' ? 'bg-purple-500 text-neutral-950 shadow-md shadow-purple-500/20' : 'text-neutral-400 hover:text-white'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Global Leaderboard
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input 
            type="text" 
            placeholder={activeTab === 'recent' ? "Search tournament or player name..." : "Search champion alias..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 focus:border-purple-500 focus:outline-none transition-all pl-10 pr-4 py-2 rounded-xl text-xs text-white"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'recent' ? (
        <div className="grid gap-4">
          {filteredCompleted.map((t) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={t.id} 
              className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl"
            >
              {/* Tournament Banner Info Header */}
              <div className="relative h-20 overflow-hidden flex items-center px-6">
                <div className="absolute inset-0 bg-cover bg-center filter brightness-[0.25]" style={{ backgroundImage: `url(${t.banner})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent"></div>
                <div className="relative flex justify-between items-center w-full">
                  <div>
                    <h3 className="font-extrabold text-white text-base tracking-tight">{t.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase tracking-wider bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold">{t.game}</span>
                      <span className="text-[10px] text-neutral-400">• Total Prize Pool: ₹{t.prizePool}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Winners Medal Grid */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-neutral-950/40">
                {[1, 2, 3].map((pos) => {
                  const winner = t.winners?.find(w => w.position === pos);
                  if (!winner) return null;

                  const badgeBg = pos === 1 ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : pos === 2 ? 'bg-slate-300/10 border-slate-300/30 text-slate-300' : 'bg-amber-700/10 border-amber-700/30 text-amber-700';
                  const medalEmoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';
                  const ordinal = pos === 1 ? '1st Place' : pos === 2 ? '2nd Place' : '3rd Place';

                  return (
                    <div key={winner.userId} className={`flex items-center justify-between p-3.5 rounded-xl border bg-neutral-900/60 ${badgeBg}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl filter drop-shadow">{medalEmoji}</span>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{ordinal}</p>
                          <p className="font-extrabold text-white text-sm truncate max-w-[130px]">{winner.freeFireName}</p>
                          <p className="text-[9px] text-neutral-500 font-mono">UID: {winner.freeFireId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black uppercase bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                          ₹{winner.prize}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {filteredCompleted.length === 0 && (
            <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
              <Trophy className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
              <p className="font-bold text-white">No winners recorded yet</p>
              <p className="text-xs text-neutral-500 mt-1">Check back later once ongoing tournaments are completed!</p>
            </div>
          )}
        </div>
      ) : (
        /* Global Leaderboard Tab */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-neutral-800 bg-neutral-950/40 flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-400">Global Ranking</span>
            <span className="text-xs font-bold text-neutral-400">Total Winnings</span>
          </div>

          <div className="divide-y divide-neutral-800/60">
            {filteredLeaderboard.map((item, index) => {
              const isTopThree = index < 3;
              const placeStyles = index === 0 
                ? 'text-amber-500 bg-amber-500/5 font-black' 
                : index === 1 
                ? 'text-slate-300 bg-slate-300/5 font-black' 
                : index === 2 
                ? 'text-amber-700 bg-amber-700/5 font-black' 
                : 'text-neutral-400 font-bold';

              return (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={item.userId}
                  className="p-4 flex items-center justify-between hover:bg-neutral-950/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Position badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-neutral-800/80 text-sm ${placeStyles}`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{item.freeFireName}</span>
                        {isTopThree && (
                          <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 px-1.5 py-0.2 rounded uppercase">Champion</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <span>{item.userName}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">UID: {item.freeFireId}</span>
                        <span>•</span>
                        <span>{item.winsCount} Wins</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-extrabold text-emerald-400 text-base">₹{item.totalEarnings}</p>
                    <p className="text-[10px] text-neutral-500">All-time Earnings</p>
                  </div>
                </motion.div>
              );
            })}

            {filteredLeaderboard.length === 0 && (
              <div className="text-center py-16 p-6">
                <Medal className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                <p className="font-bold text-white">No rankings found</p>
                <p className="text-xs text-neutral-500 mt-1">Start playing and win tournaments to secure your spot here!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

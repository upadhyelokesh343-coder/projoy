import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { format } from 'date-fns';
import { ArrowLeft, Users, Trophy, Coins, Calendar, Info, Copy, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { JoinTournamentModal } from '../components/JoinTournamentModal';
import { TournamentRulesModal } from '../components/TournamentRulesModal';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournaments = useStore(state => state.tournaments);
  const tournament = tournaments.find(t => t.id === id);
  const currentUser = useStore(state => state.currentUser);
  
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isCopiedId, setIsCopiedId] = useState(false);
  const [isCopiedPass, setIsCopiedPass] = useState(false);

  if (!tournament || !currentUser) {
    return <div className="p-6 text-center">Tournament not found</div>;
  }

  const participants = tournament.participants || [];
  const isJoined = participants.find(p => p.userId === currentUser.id);
  const isFull = participants.length >= tournament.maxSlots;

  const handleJoin = () => {
    if (currentUser.balance < tournament.entryFee) {
      alert("Insufficient balance. Please add money to your wallet.");
      return;
    }
    setShowRulesModal(true);
  };

  const copyToClipboard = (text: string, type: 'id' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setIsCopiedId(true);
      setTimeout(() => setIsCopiedId(false), 2000);
    } else {
      setIsCopiedPass(true);
      setTimeout(() => setIsCopiedPass(false), 2000);
    }
  };

  return (
    <div className="pb-8 animate-in fade-in duration-300">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-400 hover:text-white mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-6 border border-neutral-800">
        <img src={tournament.banner} alt={tournament.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4">
          <span className="inline-block px-2 py-1 rounded bg-black/50 backdrop-blur-md text-white text-xs font-bold mb-2 border border-white/10">
            {tournament.game}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{tournament.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <Trophy className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-xs text-neutral-400">Prize Pool</p>
          <p className="font-bold text-lg">₹{tournament.prizePool}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <Coins className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-xs text-neutral-400">Entry Fee</p>
          <p className="font-bold text-lg">₹{tournament.entryFee}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <Calendar className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-xs text-neutral-400">Start Time</p>
          <p className="font-bold text-sm">{format(new Date(tournament.startTime), "dd MMM, h:mm a")}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-xs text-neutral-400">Slots Joined</p>
          <p className="font-bold text-lg">{participants.length} / {tournament.maxSlots}</p>
        </div>
      </div>

      {tournament.prizeDistribution && tournament.prizeDistribution.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Prize Distribution
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...tournament.prizeDistribution].sort((a, b) => a.rank - b.rank).map((dist, idx) => (
              <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl mb-1">{dist.rank === 1 ? '🥇' : dist.rank === 2 ? '🥈' : dist.rank === 3 ? '🥉' : `#${dist.rank}`}</span>
                <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Rank {dist.rank}</span>
                <span className="font-bold text-emerald-400">₹{dist.prize}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Info className="w-5 h-5 text-emerald-400" /> About Tournament</h3>
            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
              Join this competitive {tournament.game} tournament and prove your skills. Make sure you join the room 15 minutes prior to the start time. Room ID and password will be revealed below for registered participants shortly before the match.
            </p>
            
            {/* Room Details (Visible if joined) */}
            {isJoined && (
              <div className="bg-neutral-950 border border-emerald-500/30 rounded-xl p-4 mt-4">
                <h4 className="font-bold text-emerald-400 mb-3 flex items-center gap-2">Room Details (Confidential)</h4>
                {tournament.roomId ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Room ID</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 flex-1">{tournament.roomId}</span>
                        <button onClick={() => copyToClipboard(tournament.roomId!, 'id')} className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white transition-colors">
                          {isCopiedId ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Password</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 flex-1">{tournament.roomPassword || '-'}</span>
                        <button onClick={() => copyToClipboard(tournament.roomPassword || '', 'pass')} className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white transition-colors">
                          {isCopiedPass ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-neutral-400 flex items-center justify-center py-4 bg-neutral-900/50 rounded-lg border border-neutral-800 border-dashed">
                    Room details will be updated before the match starts.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="md:col-span-1">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sticky top-24">
            <h3 className="font-bold mb-4">Action</h3>
            
            <div className="mb-4">
               <p className="text-sm text-neutral-400 flex justify-between mb-1">
                 <span>Wallet Balance:</span>
                 <span className="font-bold text-white flex items-center gap-1">₹{currentUser.balance}</span>
               </p>
               {currentUser.balance < tournament.entryFee && !isJoined && (
                 <p className="text-xs text-red-400 mt-1">Insufficient balance. <Link to="/wallet" className="underline font-bold">Add money</Link></p>
               )}
            </div>

            {tournament.status !== 'upcoming' ? (
              <button disabled className="w-full py-3.5 bg-neutral-800 text-neutral-500 font-bold rounded-xl cursor-not-allowed">
                Tournament {tournament.status}
              </button>
            ) : isJoined ? (
              <button disabled className="w-full py-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl">
                Joined Successfully
              </button>
            ) : isFull ? (
              <button disabled className="w-full py-3.5 bg-neutral-800 text-neutral-500 font-bold rounded-xl cursor-not-allowed">
                Slots Full
              </button>
            ) : (
              <button 
                onClick={handleJoin}
                disabled={isJoined || isFull}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-neutral-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
              >
                {isJoined ? 'Already Joined' : isFull ? 'Tournament Full' : `Join for ₹${tournament.entryFee}`}
              </button>
            )}
          </div>
        </div>
      </div>
      
      <TournamentRulesModal 
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        onProceed={() => {
          setShowRulesModal(false);
          setShowJoinModal(true);
        }}
      />

      <JoinTournamentModal 
        tournamentId={tournament.id}
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </div>
  );
}

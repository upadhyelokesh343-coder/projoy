import React, { useEffect } from "react";
import { useState } from 'react';
import { useStore } from '../store';
import { ShieldCheck, Plus, Check, X, Trophy, Wallet, Users as UsersIcon, Gamepad2, Calendar, Smartphone, Mail, Banknote, Trash, LayoutDashboard, ArrowLeft, Share2, Clock, CheckCircle2, Coins, Copy, MessageSquare } from 'lucide-react';
import { isValid, parseISO, format } from 'date-fns';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import UserChat from '../components/UserChat';
import { User } from '../types';

const safeFormatDate = (dateString?: string) => {
  if (!dateString) return 'No date';
  const parsed = new Date(dateString);
  if (!isValid(parsed)) return 'Invalid date';
  return format(parsed, "dd MMM, h:mm a");
};

export default function AdminDashboard() {
  const currentUser = useStore(state => state.currentUser);
  const tournaments = useStore(state => state.tournaments);
  const users = useStore(state => state.users);
  const transactions = useStore(state => state.transactions);
  const updateTransactionStatus = useStore(state => state.updateTransactionStatus);
  const createTournament = useStore(state => state.createTournament);
  const deleteTournament = useStore(state => state.deleteTournament);
  const updateTournament = useStore(state => state.updateTournament);
  const declareWinner = useStore(state => state.declareWinner);
  const manualCreditUser = useStore(state => state.manualCreditUser);
  const manualDebitUser = useStore(state => state.manualDebitUser);
  const naviShares = useStore(state => state.naviShares);
  const updateNaviShareStatus = useStore(state => state.updateNaviShareStatus);
  const deleteUser = useStore(state => state.deleteUser);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tournaments' | 'transactions' | 'rooms_winners' | 'navi_shares' | 'settings' | 'transfers' | 'add_funds' | 'messages'>('overview');
  const [selectedChatUser, setSelectedChatUser] = useState<{ id: string; name: string } | null>(null);
  
  // Tournament form state
  const [title, setTitle] = useState('');
  const [game, setGame] = useState('BGMI');
  const [bannerUrl, setBannerUrl] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [maxSlots, setMaxSlots] = useState('100');
  const [startTime, setStartTime] = useState('');
  const [prizeDistribution, setPrizeDistribution] = useState<{rank: number, prize: number}[]>([{ rank: 1, prize: 500 }]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  const calculatedPrizePool = prizeDistribution.reduce((acc, curr) => acc + (Number(curr.prize) || 0), 0);

  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  const [declaredWinners, setDeclaredWinners] = useState<Record<number, string>>({});

  // Manual Credit Form State
  const [manualCreditUserIdentifier, setManualCreditUserIdentifier] = useState('');
  const [manualCreditAmount, setManualCreditAmount] = useState('');
  const [showDirectDeposit, setShowDirectDeposit] = useState(false);
  const [walletMessage, setWalletMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [isProcessingWallet, setIsProcessingWallet] = useState(false);
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const showWalletMsg = (type: 'success'|'error', text: string) => {
    setWalletMessage({ type, text });
    setTimeout(() => setWalletMessage(null), 6000);
  };

  const findTargetUser = async (identifier: string): Promise<{ id: string; name: string; phone: string; email: string }> => {
    const cleanInput = identifier.trim();
    const lowerInput = cleanInput.toLowerCase();
    const digitsOnly = cleanInput.replace(/\D/g, '');

    console.log(`[User Lookup] Searching for target user with identifier: "${cleanInput}"`);

    // 1. Search in local store users list first
    const storeUser = users.find(u => {
      if (u.id === cleanInput) return true;
      if (u.email && u.email.toLowerCase() === lowerInput) return true;
      if (u.phone && (u.phone === cleanInput || u.phone === lowerInput || (digitsOnly && u.phone.replace(/\D/g, '') === digitsOnly))) return true;
      if ((u as any).phoneNumber && ((u as any).phoneNumber === cleanInput || (digitsOnly && (u as any).phoneNumber.replace(/\D/g, '') === digitsOnly))) return true;
      return false;
    });

    if (storeUser) {
      console.log(`[User Lookup] Target user resolved in store state:`, storeUser.id, storeUser.name);
      return {
        id: storeUser.id,
        name: storeUser.name || 'User',
        phone: storeUser.phone || '',
        email: storeUser.email || ''
      };
    }

    // 2. Query Firestore users collection
    const usersRef = collection(db, 'users');
    const queriesToTry = [
      query(usersRef, where('email', '==', lowerInput)),
      query(usersRef, where('phone', '==', cleanInput)),
      query(usersRef, where('phone', '==', lowerInput)),
      query(usersRef, where('phoneNumber', '==', cleanInput)),
    ];

    if (digitsOnly) {
      queriesToTry.push(query(usersRef, where('phone', '==', digitsOnly)));
      queriesToTry.push(query(usersRef, where('phone', '==', `+91${digitsOnly}`)));
      queriesToTry.push(query(usersRef, where('phoneNumber', '==', digitsOnly)));
      queriesToTry.push(query(usersRef, where('phoneNumber', '==', `+91${digitsOnly}`)));
    }

    for (const q of queriesToTry) {
      try {
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = docSnap.data();
          console.log(`[User Lookup] Target user resolved in Firestore via query:`, docSnap.id, data);
          return {
            id: docSnap.id,
            name: data.name || data.email || 'User',
            phone: data.phone || data.phoneNumber || '',
            email: data.email || ''
          };
        }
      } catch (err) {
        console.warn(`[User Lookup] Firestore query failed:`, err);
      }
    }

    // 3. Try direct document ID lookup in users collection
    try {
      const userDocRef = doc(db, 'users', cleanInput);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        console.log(`[User Lookup] Target user resolved via direct document ID:`, userDocSnap.id);
        return {
          id: userDocSnap.id,
          name: data.name || data.email || 'User',
          phone: data.phone || data.phoneNumber || '',
          email: data.email || ''
        };
      }
    } catch (err) {
      console.warn(`[User Lookup] Direct doc lookup failed:`, err);
    }

    throw new Error(`User not found with mobile or email: "${cleanInput}". Please check the details and try again.`);
  };

  const handleManualWalletAction = async (actionType: 'deposit' | 'deduct') => {
    if (!manualCreditUserIdentifier || !manualCreditUserIdentifier.trim()) {
      const msg = 'Please enter a player mobile number or email ID!';
      showWalletMsg('error', msg);
      return;
    }

    const amountNum = Number(manualCreditAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      const msg = 'Please enter a valid positive amount!';
      showWalletMsg('error', msg);
      return;
    }

    setIsProcessingWallet(true);
    try {
      const targetUser = await findTargetUser(manualCreditUserIdentifier);
      const isDeposit = actionType === 'deposit';
      const userPhoneStr = targetUser.phone ? ` (+91 ${targetUser.phone.slice(-10)})` : '';
      const confirmMsg = isDeposit
        ? `Are you sure you want to directly credit ₹${amountNum} to ${targetUser.name}'s wallet${userPhoneStr}?`
        : `Are you sure you want to deduct ₹${amountNum} from ${targetUser.name}'s wallet${userPhoneStr}?`;

      setConfirmModal({
        message: confirmMsg,
        onConfirm: async () => {
          if (isDeposit) {
            await manualCreditUser(targetUser.id, amountNum);
            const successMsg = `Successfully credited ₹${amountNum} to ${targetUser.name}'s wallet!`;
            showWalletMsg('success', successMsg);
          } else {
            await manualDebitUser(targetUser.id, amountNum);
            const successMsg = `Successfully deducted ₹${amountNum} from ${targetUser.name}'s wallet!`;
            showWalletMsg('success', successMsg);
          }
          setManualCreditAmount('');
          setManualCreditUserIdentifier('');
        }
      });
    } catch (err: any) {
      console.error(`[Admin Wallet Error] ${actionType} failed:`, err);
      const errMsg = err?.message || `Failed to ${actionType} wallet. Please check connection and try again.`;
      showWalletMsg('error', errMsg);
    } finally {
      setIsProcessingWallet(false);
    }
  };

  React.useEffect(() => {
    setDeclaredWinners({});

    const currentT = tournaments.find(t => t.id === selectedTournamentId);
    if (currentT) {
      setRoomId(currentT.roomId || '');
      setRoomPassword(currentT.roomPassword || '');
    } else {
      setRoomId('');
      setRoomPassword('');
    }
  }, [selectedTournamentId, tournaments]);
  
  if (currentUser?.role !== 'admin') {
    return <div className="p-10 text-center text-red-500 font-bold">Access Denied. Admins only.</div>;
  }

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !entryFee || !maxSlots || !startTime) {
      alert('Please fill out all fields first!');
      return;
    }
    
    let isoStartTime = '';
    try {
      const parsedDate = new Date(startTime);
      if (isNaN(parsedDate.getTime())) {
        alert('Please enter a valid start date & time.');
        return;
      }
      isoStartTime = parsedDate.toISOString();
    } catch (err) {
      alert('Invalid date format. Please correct the start date & time.');
      return;
    }

    try {
      await createTournament({
        title,
        game,
        banner: bannerUrl.trim() !== '' ? bannerUrl.trim() : (game === 'BGMI' ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=2165&auto=format&fit=crop'),
        prizePool: calculatedPrizePool,
        entryFee: Number(entryFee),
        maxSlots: Number(maxSlots),
        startTime: isoStartTime,
        prizeDistribution
      });
      alert('Tournament created and published successfully!');
      setTitle('');
      setBannerUrl('');
      setEntryFee('');
      setMaxSlots('100');
      setStartTime('');
      setPrizeDistribution([{ rank: 1, prize: 500 }]);
    } catch (error) {
      console.error(error);
      alert('Failed to publish tournament. Please try again.');
    }
  };

  const pendingTransactions = transactions.filter(t => t.status === 'pending' && t.type !== 'withdraw');
  const pendingWithdrawals = transactions.filter(t => t.status === 'pending' && t.type === 'withdraw');
  const depositTransactions = transactions.filter(t => t.type === 'deposit');

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      
      {activeTab === 'overview' ? (
        <>
          {/* Overview Stats Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:opacity-10 transition-opacity"><Trophy className="w-24 h-24 text-purple-400" /></div>
              <Trophy className="w-8 h-8 text-purple-400 mb-2 relative z-10" />
              <h3 className="text-3xl font-bold relative z-10">{tournaments.length}</h3>
              <p className="text-sm text-neutral-400 relative z-10">Tournaments</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:opacity-10 transition-opacity"><UsersIcon className="w-24 h-24 text-emerald-400" /></div>
              <UsersIcon className="w-8 h-8 text-emerald-400 mb-2 relative z-10" />
              <h3 className="text-3xl font-bold relative z-10">{users.length}</h3>
              <p className="text-sm text-neutral-400 relative z-10">Registered Users</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet className="w-24 h-24 text-blue-400" /></div>
              <Wallet className="w-8 h-8 text-blue-400 mb-2 relative z-10" />
              <h3 className="text-3xl font-bold relative z-10">{pendingTransactions.length}</h3>
              <p className="text-sm text-neutral-400 relative z-10">Pending Deposits</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:opacity-10 transition-opacity"><Banknote className="w-24 h-24 text-red-400" /></div>
              <Banknote className="w-8 h-8 text-red-400 mb-2 relative z-10" />
              <h3 className="text-3xl font-bold relative z-10">{pendingWithdrawals.length}</h3>
              <p className="text-sm text-neutral-400 relative z-10">Pending Withdrawals</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:opacity-10 transition-opacity"><Banknote className="w-24 h-24 text-yellow-400" /></div>
              <Banknote className="w-8 h-8 text-yellow-400 mb-2 relative z-10" />
              <h3 className="text-3xl font-bold relative z-10">
                ₹{depositTransactions.filter(t => t.status === 'completed' || t.status === 'approved').reduce((acc, t) => acc + t.amount, 0)}
              </h3>
              <p className="text-sm text-neutral-400 relative z-10">Total Deposits</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mb-4">Admin Controls</h3>
          {/* Tab Navigation Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <button onClick={() => setActiveTab('users')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
              <UsersIcon className="w-8 h-8 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">Manage Users</span>
            </button>
            <button onClick={() => setActiveTab('tournaments')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group">
              <Trophy className="w-8 h-8 text-neutral-500 group-hover:text-purple-400 transition-colors" />
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">Tournaments</span>
            </button>
            <button onClick={() => setActiveTab('rooms_winners')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group">
              <Gamepad2 className="w-8 h-8 text-neutral-500 group-hover:text-orange-400 transition-colors" />
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">Rooms & Winners</span>
            </button>
            <button onClick={() => setActiveTab('transactions')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group relative">
              {pendingTransactions.length > 0 && (
                <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-neutral-900"></span>
              )}
              <Banknote className="w-8 h-8 text-neutral-500 group-hover:text-blue-400 transition-colors" />
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">Deposit Requests</span>
            </button>
            <button onClick={() => setActiveTab('transfers')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group relative">
              {pendingWithdrawals.length > 0 && (
                <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-neutral-900"></span>
              )}
              <Wallet className="w-8 h-8 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">Withdrawal Requests</span>
            </button>
            <button onClick={() => setActiveTab('navi_shares')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
              <Share2 className="w-8 h-8 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">Navi Referrals</span>
            </button>
            <button onClick={() => setActiveTab('add_funds')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group">
              <Coins className="w-8 h-8 text-neutral-500 group-hover:text-yellow-400 transition-colors" />
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">Add Funds to User</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group">
              <LayoutDashboard className="w-8 h-8 text-neutral-500 group-hover:text-yellow-400 transition-colors" />
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">App Settings</span>
            </button>
            <button onClick={() => setActiveTab('messages')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group relative">
              <MessageSquare className="w-8 h-8 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">User Chats</span>
            </button>
          </div>
        </>
      ) : activeTab === 'tournaments' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab('overview')} className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-black text-white">Create & Manage Tournaments</h2>
          </div>
          
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Plus className="w-5 h-5 text-purple-400" /> Create New Tournament</h3>
            <form onSubmit={handleCreateTournament} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Tournament Title</label>
                <input type="text" placeholder="e.g. Weekly BGMI Clash" value={title} onChange={e=>setTitle(e.target.value)} required className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Game</label>
                <div className="relative">
                  <select value={game} onChange={e=>setGame(e.target.value)} className="appearance-none px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full text-white focus:outline-none focus:border-purple-500 transition-colors">
                    <option value="BGMI">BGMI</option>
                    <option value="Free Fire">Free Fire</option>
                    <option value="Valorant">Valorant</option>
                    <option value="Call of Duty">Call of Duty</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-400 mb-2">Custom Banner Image URL <span className="text-[10px] text-neutral-500 ml-1">(Leave empty for default game banner)</span></label>
                <input type="url" placeholder="https://example.com/banner.jpg" value={bannerUrl} onChange={e=>setBannerUrl(e.target.value)} className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full focus:outline-none focus:border-purple-500 transition-colors text-sm" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Total Prize Pool (₹)</label>
                <div className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full text-neutral-500 font-bold bg-opacity-50">
                  ₹{calculatedPrizePool} <span className="text-[10px] font-normal ml-2">(Auto-calculated)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Entry Fee (₹)</label>
                <input type="number" placeholder="50" value={entryFee} onChange={e=>setEntryFee(e.target.value)} required className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Max Slots</label>
                <input type="number" placeholder="100" value={maxSlots} onChange={e=>setMaxSlots(e.target.value)} required className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Start Date & Time</label>
                <div className="relative">
                  <input type="datetime-local" value={startTime} onChange={e=>setStartTime(e.target.value)} required className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full text-white focus:outline-none focus:border-purple-500 transition-colors" style={{colorScheme: 'dark'}} />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-bold text-white">Prize Distribution</label>
                  <button 
                    type="button" 
                    onClick={() => setPrizeDistribution([...prizeDistribution, { rank: prizeDistribution.length + 1, prize: 0 }])}
                    className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Rank
                  </button>
                </div>
                <div className="space-y-3">
                  {prizeDistribution.map((dist, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Rank</label>
                        <input type="number" value={dist.rank} onChange={(e) => {
                          const newDist = [...prizeDistribution];
                          newDist[idx].rank = Number(e.target.value);
                          setPrizeDistribution(newDist);
                        }} className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg w-full text-sm focus:outline-none" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Prize Amount (₹)</label>
                        <input type="number" value={dist.prize || ''} onChange={(e) => {
                          const newDist = [...prizeDistribution];
                          newDist[idx].prize = Number(e.target.value);
                          setPrizeDistribution(newDist);
                        }} className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg w-full text-sm focus:outline-none" />
                      </div>
                      {prizeDistribution.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => setPrizeDistribution(prizeDistribution.filter((_, i) => i !== idx))}
                          className="text-red-400 p-2 hover:bg-red-500/10 rounded-lg self-end mb-0.5"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
                 
              <button type="submit" className="md:col-span-2 py-4 mt-2 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/20">
                Publish Tournament
              </button>
            </form>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side: Existing Tournaments */}
            <div className="space-y-4">
               <h3 className="font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-purple-400" /> Manage Tournaments</h3>
               <div className="grid gap-3">
                 {tournaments.map(t => {
                   const isSelected = t.id === selectedTournamentId;
                   return (
                     <div 
                       key={t.id} 
                       onClick={() => setSelectedTournamentId(isSelected ? null : t.id)}
                       className={`bg-neutral-900 border p-4 rounded-xl flex justify-between items-center group hover:border-purple-500/30 transition-all cursor-pointer ${isSelected ? 'border-purple-500 ring-1 ring-purple-500 bg-neutral-900/50' : 'border-neutral-800'}`}
                     >
                       <div className="flex gap-4 items-center">
                         <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-800">
                           <img src={t.banner} alt={t.game} className="w-full h-full object-cover" />
                         </div>
                         <div>
                           <p className="font-bold text-white">{t.title}</p>
                           <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs bg-black px-2 py-0.5 rounded text-neutral-300">{t.game}</span>
                             <span className="text-xs text-neutral-400">• {(t.participants || []).length}/{t.maxSlots} joined</span>
                             <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${t.status === 'live' ? 'bg-red-500/20 text-red-400' : t.status === 'completed' ? 'bg-neutral-700 text-neutral-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                               {t.status}
                             </span>
                           </div>
                         </div>
                       </div>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setConfirmModal({
                             message: 'Are you sure you want to delete this tournament?', 
                             onConfirm: async () => {
                               try {
                                 await deleteTournament(t.id);
                                 if (selectedTournamentId === t.id) setSelectedTournamentId(null);
                               } catch (err) {
                                 console.error(err);
                                 alert("Failed to delete tournament. Check console for details.");
                               }
                             }
                           });
                         }} 
                         className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                       >
                         <Trash className="w-5 h-5" />
                       </button>
                     </div>
                   );
                 })}
                 {tournaments.length === 0 && <p className="text-neutral-500 text-sm">No tournaments created yet.</p>}
               </div>
            </div>

            {/* Right side: Participant Tracker */}
{/* Right side: Participant Tracker */}
            <div className="space-y-4">
               <h3 className="font-bold flex items-center gap-2"><UsersIcon className="w-5 h-5 text-emerald-400" /> Live Participant Tracker</h3>
               {selectedTournamentId ? (
                  (() => {
                    const selectedT = tournaments.find(t => t.id === selectedTournamentId);
                    if (!selectedT) return <p className="text-neutral-500 text-sm">Select a tournament to view participants.</p>;
                    const tParticipants = selectedT.participants || [];

                    return (
                      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                          <div>
                            <h4 className="font-bold text-white text-lg">{selectedT.title}</h4>
                            <p className="text-xs text-neutral-400">{tParticipants.length} Players Registered</p>
                          </div>
                        </div>

                        <div className="divide-y divide-neutral-800 max-h-[400px] overflow-y-auto pr-1">
                          {tParticipants.map((p, pIdx) => (
                            <div key={p.userId || pIdx} className="py-3 flex justify-between items-start gap-4">
                              <div className="space-y-0.5">
                                <p className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  {p.freeFireName || 'N/A'}
                                </p>
                                <p className="text-xs text-neutral-500 font-mono">UID: {p.freeFireId || 'N/A'}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-bold text-white">{p.userName || 'N/A'}</p>
                                <p className="text-[11px] text-neutral-400">{p.phone ? `+91 ${p.phone}` : 'N/A'}</p>
                              </div>
                            </div>
                          ))}
                          {tParticipants.length === 0 && (
                            <div className="text-center py-12 text-neutral-500 text-sm bg-neutral-950/40 rounded-xl border border-neutral-800/40 border-dashed">
                              No participants have joined this tournament yet.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
               ) : (
                  <div className="p-8 bg-neutral-900 border border-neutral-800 border-dashed rounded-2xl text-center text-neutral-500 text-sm flex flex-col items-center justify-center py-16">
                    <Gamepad2 className="w-10 h-10 text-neutral-600 mb-3" />
                    Click on any tournament in the list to view its registered participants in real-time.
                  </div>
               )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveTab('overview')} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold flex items-center gap-2 text-xl text-white">
                  <UsersIcon className="w-6 h-6 text-emerald-400" />
                  Manage Users ({users.length})
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  View and manage registered players and their balances.
                </p>
              </div>
            </div>
            <div className="w-full md:w-auto relative">
              <input
                type="text"
                placeholder="Search by name, phone or email..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="w-full md:w-80 px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-white"
              />
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950 text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider">
                    <th className="p-4 pl-6">Name</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4 text-right">Balance</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-sm">
                  {users
                    .filter(u => {
                      if (!userSearchQuery) return true;
                      const q = userSearchQuery.toLowerCase();
                      return (
                        (u.name || '').toLowerCase().includes(q) ||
                        (u.phone || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q)
                      );
                    })
                    .map(u => (
                      <tr key={u.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-white">{u.name || 'Anonymous'}</div>
                          <div className="text-[10px] text-neutral-500 font-mono">UID: {u.id}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-neutral-300 font-medium">{u.email || 'No email'}</div>
                          <div className="text-xs text-neutral-400">{u.phone ? `+91 ${u.phone}` : 'No phone'}</div>
                          {u.password && (
                            <div className="text-[11px] text-amber-400 font-bold mt-1 bg-amber-500/10 px-2 py-0.5 rounded w-max border border-amber-500/20">
                              Pass: {u.password}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-extrabold text-emerald-400">
                          ₹{u.balance ?? 0}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setManualCreditUserIdentifier(u.phone || u.email || u.id);
                                setActiveTab('add_funds');
                              }}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-lg transition-colors border border-emerald-500/20"
                            >
                              Manage Balance
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    message: `Are you sure you want to delete user "${u.name || 'Anonymous'}"? This action cannot be undone.`,
                                    onConfirm: async () => {
                                      try {
                                        await deleteUser(u.id);
                                        alert('User deleted successfully.');
                                      } catch (err) {
                                        console.error(err);
                                        alert('Failed to delete user.');
                                      }
                                    }
                                  });
                                }}
                                className="p-1.5 bg-neutral-950 border border-neutral-800 hover:border-red-500/40 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {users.filter(u => {
                    if (!userSearchQuery) return true;
                    const q = userSearchQuery.toLowerCase();
                    return (
                      (u.name || '').toLowerCase().includes(q) ||
                      (u.phone || '').toLowerCase().includes(q) ||
                      (u.email || '').toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-neutral-500 text-sm">
                        No users found matching "{userSearchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transactions / Wallet Tab */}
      {/* Transactions / Wallet Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveTab('overview')} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold flex items-center gap-2 text-xl text-white">
                  <Wallet className="w-6 h-6 text-blue-400" /> 
                  Wallet & Funds Manager
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Approve or reject deposit requests.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-neutral-400"><Wallet className="w-4 h-4 text-emerald-400" /> Pending Requests</h3>
            </div>

              <div className="grid gap-4">
                {pendingTransactions.length === 0 ? (
                  <div className="p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-center flex flex-col items-center justify-center">
                    <Check className="w-12 h-12 text-emerald-500/50 mb-3" />
                    <p className="text-neutral-400 font-medium">All caught up!</p>
                    <p className="text-sm text-neutral-500 mt-1">No pending deposit or withdrawal requests.</p>
                  </div>
                ) : (
                  pendingTransactions.map(tx => {
                    const user = users.find(u => u.id === tx.userId);
                    const isDeposit = tx.type === 'deposit';
                    
                    return (
                      <div key={tx.id} className={`bg-neutral-900 border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${isDeposit ? 'border-emerald-500/20' : 'border-blue-500/20'}`}>
                        
                        <div className="flex gap-4 items-start">
                          <div className={`p-3 rounded-xl flex-shrink-0 ${isDeposit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            <Wallet className="w-6 h-6" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${isDeposit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {isDeposit ? 'Add Money' : 'Withdraw'}
                              </span>
                              <span className="text-xs text-neutral-500">{safeFormatDate(tx.date)}</span>
                            </div>
                            
                            <div className="mt-3">
                               <div className="flex items-baseline gap-2 mb-1">
                                 <p className="text-3xl font-bold text-white">₹{tx.paymentAmount || tx.amount}</p>
                                 {tx.paymentAmount && tx.paymentAmount !== tx.amount && (
                                   <span className="text-xs text-neutral-500 font-medium">(Orig: ₹{tx.amount})</span>
                                 )}
                               </div>
                               <div className="space-y-1 mt-2">
                                 <p className="text-sm text-neutral-300 flex items-center gap-1.5">
                                   <UsersIcon className="w-4 h-4 text-neutral-500" /> {user?.name || 'Unknown User'}
                                 </p>
                                 <p className="text-sm text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 w-max px-2 py-1 rounded">
                                   <Smartphone className="w-4 h-4" /> {user?.phone ? `+91 ${user.phone}` : 'No phone'}
                                 </p>
                                 <p className="text-xs text-neutral-500 font-mono mt-1">Ref/UPI: {tx.reference}</p>
                               </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex md:flex-col gap-2 w-full md:w-auto">
                          <button onClick={() => updateTransactionStatus(tx.id, 'approved')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20">
                            <Check className="w-5 h-5" /> Approve
                          </button>
                          <button onClick={() => updateTransactionStatus(tx.id, 'rejected')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-neutral-950 border border-neutral-800 text-red-400 hover:bg-red-500/10 px-6 py-3 rounded-xl font-bold transition-all">
                            <X className="w-5 h-5" /> Reject
                          </button>
                        </div>
                        
                      </div>
                    )
                  })
                )}
                
                {/* Show recent completed deposits just for view */}
                {depositTransactions.filter(t => t.status === 'completed' || t.status === 'approved').length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">Recent Processed Deposits</h4>
                    <div className="space-y-2">
                      {depositTransactions.filter(t => t.status === 'completed' || t.status === 'approved').slice(0, 5).map(tx => {
                        const user = users.find(u => u.id === tx.userId);
                        return (
                          <div key={tx.id} className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex justify-between items-center">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                 <Check className="w-4 h-4 text-emerald-500" />
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-white">{user?.name} <span className="text-neutral-500 font-normal ml-1">(+91 {user?.phone})</span></p>
                                 <p className="text-xs text-neutral-500">{safeFormatDate(tx.date)}</p>
                               </div>
                            </div>
                             <div className="text-right">
                               <p className="font-bold text-emerald-400">+₹{tx.paymentAmount || tx.amount}</p>
                               {tx.paymentAmount && tx.paymentAmount !== tx.amount && (
                                 <p className="text-[10px] text-neutral-500">Orig: ₹{tx.amount}</p>
                               )}
                             </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
              </div>

            </div>

        </div>
      )}

      {/* Rooms & Winners Tab */}
      {activeTab === 'rooms_winners' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => setActiveTab('overview')} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-xl text-white">Rooms & Winners Declaration</h3>
          </div>
          <div className="bg-gradient-to-br from-purple-900/20 to-neutral-900 border border-neutral-800 p-6 rounded-3xl">
            <h3 className="font-extrabold text-lg text-white mb-2 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-purple-400 animate-pulse" />
              Lobby room credentials & Winners distribution
            </h3>
            <p className="text-xs text-neutral-400">
              Manage lobby room credentials, custom Lobby Password details, and distribute prize pool money to tournament champions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Choose Tournament */}
            <div className="space-y-4">
              <h4 className="font-bold text-white text-sm uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-purple-400" />
                Select Active Tournament
              </h4>
              <div className="grid gap-3">
                {tournaments.map(t => {
                  const isSelected = t.id === selectedTournamentId;
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTournamentId(isSelected ? null : t.id)}
                      className={`bg-neutral-900 border p-4 rounded-xl flex justify-between items-center group hover:border-purple-500/30 transition-all cursor-pointer ${isSelected ? 'border-purple-500 ring-1 ring-purple-500 bg-neutral-900/50' : 'border-neutral-800'}`}
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-800">
                          <img src={t.banner} alt={t.game} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{t.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-black px-2 py-0.5 rounded text-neutral-300">{t.game}</span>
                            <span className="text-xs text-neutral-400">• {(t.participants || []).length}/{t.maxSlots} joined</span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${t.status === 'live' ? 'bg-red-500/20 text-red-400' : t.status === 'completed' ? 'bg-neutral-700 text-neutral-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {t.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {tournaments.length === 0 && <p className="text-neutral-500 text-sm">No tournaments available.</p>}
              </div>
            </div>

            {/* Right Column: Room Details & Declare Winners Form */}
            <div className="space-y-4">
              <h4 className="font-bold text-white text-sm uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-emerald-400" />
                Lobby & Placement Setup
              </h4>

              {selectedTournamentId ? (
                (() => {
                  const selectedT = tournaments.find(t => t.id === selectedTournamentId);
                  if (!selectedT) return <p className="text-neutral-500 text-sm">Select a tournament first.</p>;
                  const tParticipants = selectedT.participants || [];

                  return (
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-6 font-sans">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 px-2 py-1 rounded">
                          {selectedT.game}
                        </span>
                        <h4 className="font-extrabold text-white text-xl mt-2">{selectedT.title}</h4>
                        <p className="text-xs text-neutral-400">{tParticipants.length} Players Registered</p>
                      </div>

                      {/* Room Details block */}
                      <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-purple-400">Room Credentials</h5>
                          <span className="text-[10px] text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 font-medium">Auto-synced to joined players</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-neutral-400 font-semibold block mb-1 uppercase tracking-wider">Room ID</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 984128"
                              value={roomId}
                              onChange={e => setRoomId(e.target.value)}
                              className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl w-full text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-neutral-400 font-semibold block mb-1 uppercase tracking-wider">Password</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 1234"
                              value={roomPassword}
                              onChange={e => setRoomPassword(e.target.value)}
                              className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl w-full text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                            />
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={async () => {
                            try {
                              await updateTournament(selectedT.id, { roomId, roomPassword });
                              alert('Room ID & Password updated successfully!');
                            } catch(err) {
                              console.error(err);
                              alert('Failed to update room details.');
                            }
                          }}
                          className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-neutral-950 hover:text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"
                        >
                          Save Room ID & Password
                        </button>
                      </div>

                      {/* Winners Placement form */}
                      <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Tournament Winners</h5>
                          <span className="text-[10px] text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 font-medium">
                            {selectedT.status === 'completed' ? 'Declared' : 'Pending Declaration'}
                          </span>
                        </div>

                        {selectedT.status === 'completed' ? (
                          <div className="space-y-2">
                            {selectedT.winners && selectedT.winners.length > 0 ? (
                              selectedT.winners.map(w => (
                                <div key={w.userId} className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-900 last:border-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">
                                      {w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'}
                                    </span>
                                    <div>
                                      <p className="font-bold text-white">{w.freeFireName}</p>
                                      <p className="text-[10px] text-neutral-500 font-mono">UID: {w.freeFireId}</p>
                                    </div>
                                  </div>
                                  <span className="font-bold text-emerald-400">₹{w.prize} Won</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-neutral-500 text-center py-2">No winners declared.</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {[...(selectedT.prizeDistribution || [
                                { rank: 1, prize: selectedT.prizePool },
                                { rank: 2, prize: 0 },
                                { rank: 3, prize: 0 }
                            ])].sort((a, b) => a.rank - b.rank).map((dist, idx) => (
                              <div key={idx} className="grid grid-cols-2 gap-2 items-end">
                                <div>
                                  <label className="text-[10px] text-neutral-400 font-semibold block mb-1">
                                    {dist.rank === 1 ? '🥇 1st' : dist.rank === 2 ? '🥈 2nd' : dist.rank === 3 ? '🥉 3rd' : `#${dist.rank}`} Place Player
                                  </label>
                                  <select 
                                    value={declaredWinners[dist.rank] || ''}
                                    onChange={e => setDeclaredWinners({ ...declaredWinners, [dist.rank]: e.target.value })}
                                    className="px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg w-full text-white text-xs focus:outline-none"
                                  >
                                    <option value="">Select Player</option>
                                    {tParticipants.length > 0 && (
                                      <optgroup label="Tournament Participants">
                                        {tParticipants.map(p => (
                                          <option key={`rank-${dist.rank}-part-${p.userId}`} value={p.userId}>{p.freeFireName || p.userName} ({p.userName})</option>
                                        ))}
                                      </optgroup>
                                    )}
                                    <optgroup label="All Registered Players">
                                      {users.map(u => (
                                        <option key={`rank-${dist.rank}-all-${u.id}`} value={u.id}>{u.name} {u.phone ? `(+91 ${u.phone})` : `(${u.email})`}</option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-neutral-400 font-semibold block mb-1">Prize (₹)</label>
                                  <input 
                                    type="number" 
                                    readOnly
                                    value={dist.prize}
                                    className="px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg w-full text-neutral-500 text-xs focus:outline-none cursor-not-allowed"
                                  />
                                </div>
                              </div>
                            ))}

                            <button 
                              type="button"
                              onClick={async () => {
                                const distribution = selectedT.prizeDistribution || [
                                  { rank: 1, prize: selectedT.prizePool },
                                  { rank: 2, prize: 0 },
                                  { rank: 3, prize: 0 }
                                ];
                                
                                const winnersListToSubmit = distribution
                                  .filter(dist => declaredWinners[dist.rank])
                                  .map(dist => ({
                                    userId: declaredWinners[dist.rank],
                                    position: dist.rank,
                                    prize: dist.prize
                                  }));

                                if (winnersListToSubmit.length === 0) {
                                  alert('Please select at least one winner!');
                                  return;
                                }
                                setConfirmModal({
                                  message: 'Are you sure you want to declare these winners and complete the tournament?',
                                  onConfirm: async () => {
                                    try {
                                      await declareWinner(selectedT.id, winnersListToSubmit);
                                      alert('Tournament completed and winners declared successfully!');
                                    } catch (error) {
                                      console.error(error);
                                      alert('Failed to declare winners. See console log for errors.');
                                    }
                                  }
                                });
                              }}
                              className="w-full mt-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.98]"
                            >
                              Declare Winners & Close Match
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-8 bg-neutral-900 border border-neutral-800 border-dashed rounded-2xl text-center text-neutral-500 text-sm flex flex-col items-center justify-center py-16">
                  <Trophy className="w-10 h-10 text-neutral-600 mb-3" />
                  Select a tournament from the left panel to begin managing room details and declaring winners.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navi Shares Tab */}
      {activeTab === 'navi_shares' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveTab('overview')} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold flex items-center gap-2 text-lg">
                  <Share2 className="w-5 h-5 text-[#FF1E46]" /> 
                  Navi UPI Referral Submissions
                </h3>
                <p className="text-xs text-neutral-500 mt-1">View, track, and complete Navi app installations and first-transaction payments.</p>
              </div>
            </div>
            <div className="bg-[#FF1E46]/10 border border-[#FF1E46]/25 rounded-xl px-4 py-2 text-[#FF1E46] text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 animate-bounce" />
              Complete triggers ₹20 Wallet Reward
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400 uppercase tracking-wider text-[10px] font-black">
                    <th className="px-6 py-4">Sharer Name / UID</th>
                    <th className="px-6 py-4">Sharer Mobile</th>
                    <th className="px-6 py-4">Friend's Mobile</th>
                    <th className="px-6 py-4">Shared At</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {naviShares.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-sm text-neutral-500 font-medium">
                        No Navi UPI shares recorded yet.
                      </td>
                    </tr>
                  ) : (
                    naviShares.map((share) => (
                      <tr key={share.id} className="hover:bg-neutral-950/20 transition-colors text-xs font-semibold">
                        <td className="px-6 py-4 text-white">
                          <div>
                            <p className="font-extrabold text-sm text-white">{share.sharerName}</p>
                            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">UID: {share.sharerUid}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-300 font-mono">+91 {share.sharerMobile}</td>
                        <td className="px-6 py-4 text-neutral-300 font-mono">+91 {share.recipientMobile}</td>
                        <td className="px-6 py-4 text-neutral-400">{safeFormatDate(share.createdAt)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide rounded-md ${
                            share.status === 'completed' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : share.status === 'verified' 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : share.status === 'rejected'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {share.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {share.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    message: `Mark this referral share from ${share.sharerName} as verified?`,
                                    onConfirm: async () => {
                                      await updateNaviShareStatus(share.id, 'verified');
                                    }
                                  });
                                }}
                                className="px-2 py-1 bg-neutral-950 border border-neutral-800 hover:border-blue-500 hover:bg-blue-500/10 text-blue-400 rounded transition-all text-[10px] uppercase font-bold"
                              >
                                Verify
                              </button>
                            )}

                            {share.status !== 'completed' && share.status !== 'rejected' && (
                              <>
                                <button
                                  onClick={() => {
                                    setConfirmModal({
                                      message: `Approve and credit ₹20 reward to ${share.sharerName} for recipient ${share.recipientMobile}?`,
                                      onConfirm: async () => {
                                        await updateNaviShareStatus(share.id, 'completed');
                                      }
                                    });
                                  }}
                                  className="px-2 py-1 bg-neutral-950 border border-neutral-800 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-400 rounded transition-all text-[10px] uppercase font-bold"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmModal({
                                      message: `Reject referral share for recipient ${share.recipientMobile}?`,
                                      onConfirm: async () => {
                                        await updateNaviShareStatus(share.id, 'rejected');
                                      }
                                    });
                                  }}
                                  className="px-2 py-1 bg-neutral-950 border border-neutral-800 hover:border-red-500 hover:bg-red-500/10 text-red-400 rounded transition-all text-[10px] uppercase font-bold"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {(share.status === 'completed' || share.status === 'rejected') && (
                              <span className="text-[10px] text-neutral-500 italic font-medium pr-2">No actions remaining</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Funds Manually Tab */}
      {activeTab === 'add_funds' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setActiveTab('overview')} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Plus className="w-6 h-6 text-indigo-400" />
              <h3 className="text-xl font-bold text-white">Add Funds Manually</h3>
            </div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-6 shadow-xl">
            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                Credit or Deduct Money Manually
              </h4>
              <p className="text-xs text-neutral-400 mt-1">Use a user's mobile number or email ID to modify their wallet balance directly.</p>
            </div>

            {walletMessage && (
              <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${walletMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {walletMessage.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                {walletMessage.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">Player Mobile Number or Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UsersIcon className="h-5 w-5 text-neutral-500" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="e.g. 9876543210 or player@email.com"
                    value={manualCreditUserIdentifier}
                    onChange={e => setManualCreditUserIdentifier(e.target.value)}
                    disabled={isProcessingWallet}
                    className="pl-10 px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full text-white text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 shadow-inner"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-neutral-400 font-semibold block uppercase tracking-wider">Amount (₹)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Banknote className="h-5 w-5 text-emerald-500" />
                  </div>
                  <input 
                    type="number" 
                    placeholder="e.g. 500"
                    value={manualCreditAmount}
                    onChange={e => setManualCreditAmount(e.target.value)}
                    disabled={isProcessingWallet}
                    className="pl-10 px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl w-full text-white text-lg font-extrabold focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
              <button 
                type="button"
                disabled={isProcessingWallet}
                onClick={() => handleManualWalletAction('deposit')}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-neutral-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex justify-center items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Add Funds to User Wallet
              </button>
              <button 
                type="button"
                disabled={isProcessingWallet}
                onClick={() => handleManualWalletAction('deduct')}
                className="w-full py-4 bg-neutral-950 hover:bg-red-500/10 disabled:bg-red-500/5 disabled:opacity-50 text-red-500 font-bold text-sm rounded-xl transition-all border border-red-500/20 shadow-lg shadow-red-500/5 active:scale-[0.98] flex justify-center items-center gap-2"
              >
                <Trash className="w-4 h-4" /> Deduct Funds from Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Transfers Tab */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveTab('overview')} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold flex items-center gap-2 text-lg text-white">
                  <Banknote className="w-5 h-5 text-emerald-400" /> User Wallet Transfer & Payout Requests
                </h3>
              </div>
            </div>
            <span className="text-xs text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 self-start sm:self-center">
              Total Requests: {transactions.filter(t => t.type === 'withdraw').length}
            </span>
          </div>

          <div className="grid gap-4">
            {transactions.filter(t => t.type === 'withdraw').length === 0 ? (
              <div className="p-12 bg-neutral-900 border border-neutral-800 rounded-3xl text-center flex flex-col items-center justify-center">
                <Banknote className="w-12 h-12 text-neutral-600 mb-3" />
                <p className="text-neutral-400 font-medium">No wallet transfer or withdrawal requests yet.</p>
                <p className="text-sm text-neutral-500 mt-1">When users transfer money out of their wallet via UPI ID or Bank account, they will appear here.</p>
              </div>
            ) : (
              transactions.filter(t => t.type === 'withdraw').map(tx => {
                const user = users.find(u => u.id === tx.userId);
                const isPending = tx.status === 'pending';
                const isApproved = tx.status === 'approved' || tx.status === 'completed';

                return (
                  <div key={tx.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-5 hover:border-emerald-500/40 transition-all shadow-xl">
                    {/* Top Status & Date */}
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${isPending ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {tx.status}
                      </span>
                      <span className="text-xs text-neutral-400 font-medium">{safeFormatDate(tx.date)}</span>
                    </div>

                    {/* Main Details Grid / Lines */}
                    <div className="space-y-4">
                      {/* Amount */}
                      <div className="flex items-baseline justify-between bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Transfer Amount</span>
                        <span className="text-3xl font-extrabold text-emerald-400">₹{tx.amount}</span>
                      </div>

                      {/* User Name */}
                      <div className="flex items-center gap-3 bg-neutral-950 px-4 py-3 rounded-xl border border-neutral-800/80">
                        <UsersIcon className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">User Name</p>
                          <p className="text-sm font-bold text-white">{user?.name || 'Unknown User'}</p>
                        </div>
                      </div>

                      {/* Mobile Number */}
                      <div className="flex items-center gap-3 bg-neutral-950 px-4 py-3 rounded-xl border border-neutral-800/80">
                        <Smartphone className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Mobile Number</p>
                          <p className="text-sm font-bold text-emerald-400 font-mono">{user?.phone ? `+91 ${user.phone}` : 'N/A'}</p>
                        </div>
                      </div>

                      {/* UPI ID or Bank Details Boxes */}
                      {tx.reference?.includes('Transfer to UPI') ? (
                        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <Banknote className="w-4 h-4 text-emerald-400" /> UPI ID
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const upiIdVal = tx.reference.replace(/Transfer to UPI:\s*/i, '').trim();
                                navigator.clipboard.writeText(upiIdVal);
                                setCopiedRefId(tx.id);
                                setTimeout(() => setCopiedRefId(null), 2000);
                              }}
                              className="flex items-center gap-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/30"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedRefId === tx.id ? 'Copied!' : 'Copy UPI ID'}
                            </button>
                          </div>
                          <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 font-mono text-lg font-bold text-emerald-400 tracking-wide select-all">
                            {tx.reference.replace(/Transfer to UPI:\s*/i, '').trim()}
                          </div>
                        </div>
                      ) : tx.reference?.includes('Bank Transfer') ? (
                        <div className="space-y-3">
                          {/* Bank Name */}
                          <div className="bg-neutral-950 px-4 py-3 rounded-xl border border-neutral-800/80">
                            <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Bank Name</p>
                            <p className="text-sm font-bold text-white mt-0.5">
                              {tx.reference.split('|')[0]?.replace(/Bank Transfer:\s*/i, '').trim() || 'N/A'}
                            </p>
                          </div>

                          {/* Account Number */}
                          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Account Number</p>
                              <button
                                type="button"
                                onClick={() => {
                                  const match = tx.reference.match(/A\/C:\s*([^|]+)/i);
                                  const accNo = match ? match[1].trim() : '';
                                  navigator.clipboard.writeText(accNo);
                                  setCopiedRefId(`${tx.id}-acc`);
                                  setTimeout(() => setCopiedRefId(null), 2000);
                                }}
                                className="flex items-center gap-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold px-2.5 py-1 rounded-lg transition-colors border border-blue-500/30"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                {copiedRefId === `${tx.id}-acc` ? 'Copied!' : 'Copy A/C'}
                              </button>
                            </div>
                            <p className="font-mono text-base font-bold text-white tracking-wide select-all">
                              {tx.reference.match(/A\/C:\s*([^|]+)/i)?.[1]?.trim() || 'N/A'}
                            </p>
                          </div>

                          {/* IFSC Code */}
                          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">IFSC Code</p>
                              <button
                                type="button"
                                onClick={() => {
                                  const match = tx.reference.match(/IFSC:\s*([^|]+)/i);
                                  const ifsc = match ? match[1].trim() : '';
                                  navigator.clipboard.writeText(ifsc);
                                  setCopiedRefId(`${tx.id}-ifsc`);
                                  setTimeout(() => setCopiedRefId(null), 2000);
                                }}
                                className="flex items-center gap-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold px-2.5 py-1 rounded-lg transition-colors border border-blue-500/30"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                {copiedRefId === `${tx.id}-ifsc` ? 'Copied!' : 'Copy IFSC'}
                              </button>
                            </div>
                            <p className="font-mono text-base font-bold text-white tracking-wide select-all">
                              {tx.reference.match(/IFSC:\s*([^|]+)/i)?.[1]?.trim() || 'N/A'}
                            </p>
                          </div>

                          {/* Account Holder Name */}
                          <div className="bg-neutral-950 px-4 py-3 rounded-xl border border-neutral-800/80">
                            <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Account Holder Name</p>
                            <p className="text-sm font-bold text-white mt-0.5">
                              {tx.reference.match(/Name:\s*(.+)$/i)?.[1]?.trim() || 'N/A'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-1">
                          <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Details</p>
                          <p className="font-mono text-sm text-white select-all">{tx.reference || 'N/A'}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions / Status Footer */}
                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                      {isPending ? (
                        <div className="flex gap-3 w-full">
                          <button 
                            onClick={() => updateTransactionStatus(tx.id, 'approved')} 
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 py-3 rounded-xl font-extrabold transition-all shadow-lg shadow-emerald-500/20 text-sm"
                          >
                            <Check className="w-5 h-5" /> Approve Payout
                          </button>
                          <button 
                            onClick={() => updateTransactionStatus(tx.id, 'rejected')} 
                            className="flex-1 flex items-center justify-center gap-2 bg-neutral-950 border border-neutral-800 text-red-400 hover:bg-red-500/10 py-3 rounded-xl font-bold transition-all text-sm"
                          >
                            <X className="w-5 h-5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <div className="w-full text-center py-2 bg-neutral-950 rounded-xl border border-neutral-800">
                          <p className={`text-xs font-extrabold uppercase tracking-wider ${isApproved ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isApproved ? '✓ Payout Approved & Processed' : '✕ Payout Rejected'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* UPI & QR Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setActiveTab('overview')} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white">App Payment Settings</h3>
          </div>
          <AdminUpiSettingsSection />
        </div>
      )}

      {/* User Support Chats Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <button 
              onClick={() => {
                setActiveTab('overview');
                setSelectedChatUser(null);
              }} 
              className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-xl text-white">User Support Chats</h3>
          </div>
          <AdminMessagesSection 
            users={users} 
            selectedChatUser={selectedChatUser} 
            setSelectedChatUser={setSelectedChatUser} 
          />
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl w-full max-w-sm space-y-6">
            <h3 className="text-lg font-bold text-white text-center">{confirmModal.message}</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmModal(null)} 
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }} 
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminUpiSettingsSection() {
  const adminUpiId = useStore(state => state.adminUpiId);
  const adminQrCodeUrl = useStore(state => state.adminQrCodeUrl);
  const isDepositLocked = useStore(state => state.isDepositLocked);
  const depositLockMessage = useStore(state => state.depositLockMessage);
  const updateAdminSettings = useStore(state => state.updateAdminSettings);

  const [upiInput, setUpiInput] = useState(adminUpiId || '');
  const [qrInput, setQrInput] = useState(adminQrCodeUrl || '');
  const [isLocked, setIsLocked] = useState(isDepositLocked || false);
  const [lockMsg, setLockMsg] = useState(depositLockMessage || 'Deposit is currently locked by admin. Please try again later.');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateAdminSettings(upiInput, qrInput, isLocked, lockMsg);
      setMsg({ type: 'success', text: 'Admin settings updated successfully!' });
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Deposit UPI & QR Code Settings</h3>
          <p className="text-xs text-neutral-400">Update the deposit payment handle and QR code displayed to users.</p>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {msg.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Admin UPI ID / VPA</label>
          <input
            type="text"
            value={upiInput}
            onChange={(e) => setUpiInput(e.target.value)}
            placeholder="e.g. 7285009425-2@ybl"
            className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500 font-mono"
            required
          />
          <p className="text-xs text-neutral-500 mt-1">Users will pay deposits directly to this UPI handle.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Custom QR Code Image URL (Optional)</label>
          <input
            type="url"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="https://example.com/my-qr-code.png"
            className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500 text-sm"
          />
          <p className="text-xs text-neutral-500 mt-1">Leave blank to auto-generate a QR code for the UPI ID above, or paste a direct image URL.</p>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                Deposit Locking System
              </h4>
              <p className="text-[10px] text-neutral-500 mt-0.5">Toggle to prevent users from adding money.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isLocked ? 'bg-red-500' : 'bg-neutral-800'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isLocked ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {isLocked && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1.5 ml-1">Lock Reason / Timing Message</label>
              <textarea
                value={lockMsg}
                onChange={(e) => setLockMsg(e.target.value)}
                placeholder="e.g. Deposit is closed from 10 PM to 8 AM. Please try again later."
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500/50 min-h-[80px] resize-none"
              />
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col items-center">
          <p className="text-xs text-neutral-400 mb-2 font-semibold">Live Preview of User Payment QR:</p>
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex flex-col items-center">
            <img
              src={qrInput.trim() || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${encodeURIComponent(upiInput || '7285009425-2@ybl')}&pn=Admin`}
              alt="QR Preview"
              className="w-40 h-40 bg-white p-2 rounded-xl shadow-lg object-contain"
            />
            <span className="text-xs font-mono text-emerald-400 mt-3">{upiInput || '7285009425-2@ybl'}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-extrabold rounded-xl transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50"
        >
          {saving ? 'Saving Settings...' : 'Save UPI & QR Settings'}
        </button>
      </form>
    </div>
  );
}

function AdminMessagesSection({ 
  users, 
  selectedChatUser, 
  setSelectedChatUser 
}: { 
  users: User[]; 
  selectedChatUser: { id: string; name: string } | null; 
  setSelectedChatUser: (u: { id: string; name: string } | null) => void;
}) {
  const [conversations, setConversations] = useState<{ userId: string; lastText: string; lastTimestamp: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uniqueConversationsMap = new Map<string, { lastText: string; lastTimestamp: string }>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        const uId = data.userId;
        if (uId && !uniqueConversationsMap.has(uId)) {
          uniqueConversationsMap.set(uId, {
            lastText: data.text || '',
            lastTimestamp: data.timestamp || ''
          });
        }
      });

      const conversationList = Array.from(uniqueConversationsMap.entries()).map(([userId, info]) => ({
        userId,
        lastText: info.lastText,
        lastTimestamp: info.lastTimestamp
      }));

      setConversations(conversationList);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch messages snapshot for admin panel:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (selectedChatUser) {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <UserChat 
            userId={selectedChatUser.id} 
            userName={selectedChatUser.name} 
            isAdminMode={true} 
            onBack={() => setSelectedChatUser(null)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="border-b border-neutral-800 pb-4">
        <p className="text-xs text-neutral-400">
          Select a user below to reply to their queries in real-time.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-500">
          Loading support conversations...
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 max-w-sm mx-auto">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-neutral-700" />
          <p className="text-white font-bold text-sm">No conversations yet</p>
          <p className="text-xs mt-1 text-neutral-500">
            When users click "Live Chat" and send a message, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations.map((convo) => {
            const matchedUser = users.find(u => u.id === convo.userId);
            const dispName = matchedUser?.name || "Anonymous Player";
            const dispPhone = matchedUser?.phone ? `+91 ${matchedUser.phone}` : "No phone info";
            const formattedTime = convo.lastTimestamp 
              ? new Date(convo.lastTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div 
                key={convo.userId}
                onClick={() => setSelectedChatUser({ id: convo.userId, name: dispName })}
                className="bg-neutral-950/40 border border-neutral-800/80 hover:border-emerald-500/30 hover:bg-neutral-950 p-5 rounded-2xl flex justify-between items-center transition-all cursor-pointer group animate-in fade-in duration-100"
              >
                <div className="flex gap-4 items-center min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <img 
                      src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${convo.userId}`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {dispName}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{dispPhone}</p>
                    <p className="text-xs text-neutral-500 mt-2 truncate max-w-xs italic">
                      "{convo.lastText}"
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <span className="text-[10px] text-neutral-500 block font-semibold">
                    {formattedTime}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    Reply Live →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

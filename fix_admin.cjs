const fs = require('fs');

const missingCode = `            <button onClick={() => setActiveTab('users')} className="flex flex-col items-center justify-center gap-3 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
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
              <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">Withdrawals</span>
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
                       className={\`bg-neutral-900 border p-4 rounded-xl flex justify-between items-center group hover:border-purple-500/30 transition-all cursor-pointer \${isSelected ? 'border-purple-500 ring-1 ring-purple-500 bg-neutral-900/50' : 'border-neutral-800'}\`}
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
                             <span className={\`text-[10px] uppercase font-bold px-2 py-0.5 rounded \${t.status === 'live' ? 'bg-red-500/20 text-red-400' : t.status === 'completed' ? 'bg-neutral-700 text-neutral-400' : 'bg-emerald-500/20 text-emerald-400'}\`}>
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

            {/* Right side: Participant Tracker */}`;

let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// The broken code looks like:
//           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
//             <button 
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setConfirmModal({
//                               message: 'Are you sure you want to delete this tournament?', 
// ...
//                           <Trash className="w-5 h-5" />
//                         </button>
//                      </div>
//                    );
//                  })}
//                  {tournaments.length === 0 && <p className="text-neutral-500 text-sm">No tournaments created yet.</p>}
//                </div>
//             </div>
//
//             {/* Right side: Participant Tracker */}

const brokenStart = `<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">`;
const brokenEnd = `{/* Right side: Participant Tracker */}`;
const startIndex = code.indexOf(brokenStart);
const endIndex = code.indexOf(brokenEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const before = code.substring(0, startIndex + brokenStart.length);
  const after = code.substring(endIndex);
  code = before + "\n" + missingCode + "\n" + after;
  fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
  console.log("Fixed AdminDashboard.tsx successfully.");
} else {
  console.error("Could not find boundaries.");
}

import React, { useState, useEffect } from 'react';
import { Share2, Copy, Trophy, Users, CheckCircle2, Lock, Gift, AlertCircle, Sparkles } from 'lucide-react';
import { useStore } from '../store';

export const ReferEarn = () => {
  const currentUser = useStore(state => state.currentUser);
  const users = useStore(state => state.users);
  const claimReferralMilestone = useStore(state => state.claimReferralMilestone);
  const updateProfile = useStore(state => state.updateProfile);
  
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (currentUser && !currentUser.referralCode) {
      const fallbackCode = 'PJ' + currentUser.id.slice(-5).toUpperCase();
      updateProfile({ referralCode: fallbackCode }).catch(err => {
        console.warn("Could not save fallback referral code to Firestore:", err);
      });
    }
  }, [currentUser, updateProfile]);

  if (!currentUser) return null;

  const referralCode = currentUser.referralCode || ('PJ' + currentUser.id.slice(-5).toUpperCase());
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  // Calculate successful referrals and pending ones
  const referredUsers = users.filter(u => {
    const isReferredByCode = referralCode && u.referredBy && u.referredBy.toUpperCase() === referralCode.toUpperCase();
    const isReferredById = u.referredBy === currentUser.id;
    return isReferredByCode || isReferredById;
  });

  const successfulReferrals = referredUsers.filter(u => u.hasPerformedFirstAction);
  const successfulCount = successfulReferrals.length;
  
  const maxMilestone = 5;
  const progress = Math.min((successfulCount / maxMilestone) * 100, 100);
  
  // Calculate dynamic earnings (₹10 per verified referral up to the milestone limit)
  const currentUnlocked = Math.min(successfulCount, maxMilestone) * 10;
  const earnings = Math.max(currentUser.referralEarnings || 0, currentUnlocked);
  
  const isClaimed = !!currentUser.claimedReferralMilestone;
  const canClaim = successfulCount >= maxMilestone && !isClaimed;

  const [copySuccess, setCopySuccess] = useState(false);

  const copyLink = () => {
    if (!referralLink) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(referralLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        throw new Error('Fallback to textarea');
      }
    } catch (e) {
      const el = document.createElement('textarea');
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const shareReferral = async () => {
    if (!referralLink) return;
    const shareText = `Nexus Gaming: Refer & Earn Rewards! 🎮\n\nJoin my gaming platform and earn real cash rewards! Use my unique referral code *${referralCode}* to sign up.\n\nRegister here: ${referralLink}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nexus Gaming Referral',
          text: shareText,
          url: referralLink,
        });
      } catch (err) {
        // Fallback to WhatsApp link if user cancelled or error
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const handleClaimMilestone = async () => {
    if (!canClaim) return;
    setClaimLoading(true);
    setClaimMessage(null);
    try {
      await claimReferralMilestone();
      setClaimMessage({ type: 'success', text: 'Congratulations! ₹50 Milestone Reward has been credited to your wallet.' });
    } catch (err: any) {
      setClaimMessage({ type: 'error', text: err.message || 'Failed to claim milestone reward.' });
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Refer & Earn Milestones
        </h2>
        <div className="text-right">
          <p className="text-neutral-400 text-[10px] uppercase font-bold tracking-wider">Milestone Earnings</p>
          <p className="text-2xl font-black text-emerald-400">₹{earnings}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-neutral-400 leading-relaxed">
        Invite your gaming friends! Once a total of <strong className="text-white">5 referred users</strong> sign up and complete their first tournament entry or wallet deposit, you unlock a flat <strong className="text-emerald-400 font-bold">₹50 Cash Reward</strong> directly in your wallet.
      </p>

      {/* Progress Tracker */}
      <div className="space-y-3 bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-neutral-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-yellow-500" />
            Verified Referrals: {successfulCount}/{maxMilestone}
          </span>
          <span className="text-yellow-500 font-black">{Math.round(progress)}% Complete</span>
        </div>
        
        <div className="h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-700 relative" 
            style={{ width: `${progress}%` }}
          >
            {progress >= 100 && (
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            )}
          </div>
        </div>

        {/* Milestone State Message / Button */}
        <div className="pt-2">
          {isClaimed ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 py-2.5 px-3 rounded-xl justify-center">
              <CheckCircle2 className="w-4 h-4" />
              ₹50 Milestone 1 Reward Claimed & Paid! 🎉
            </div>
          ) : canClaim ? (
            <button
              onClick={handleClaimMilestone}
              disabled={claimLoading}
              className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              {claimLoading ? 'Processing Claim...' : 'Claim ₹50 Milestone Reward Now!'}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold bg-neutral-900 border border-neutral-800/80 py-2.5 px-3 rounded-xl justify-center">
              <Lock className="w-3.5 h-3.5 text-neutral-600" />
              Locked (Need {maxMilestone - successfulCount} more verified referrals to claim ₹50)
            </div>
          )}
        </div>

        {claimMessage && (
          <p className={`text-[10px] text-center font-bold flex items-center justify-center gap-1.5 pt-1 ${
            claimMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {claimMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {claimMessage.text}
          </p>
        )}
      </div>

      {/* Refer Share Interface */}
      <div className="flex gap-4">
        <button 
          onClick={copyLink}
          className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider border border-neutral-800 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Copy className="w-4 h-4 text-emerald-400 animate-pulse" /> {copySuccess ? 'Copied Link!' : 'Copy Link'}
        </button>
        <button 
          onClick={shareReferral}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4" /> Share Referral
        </button>
      </div>

      {/* Referral Code Display */}
      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex justify-between items-center">
        <div>
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Your Unique Code</p>
          <p className="text-xl font-mono font-black text-white tracking-widest mt-0.5">{referralCode}</p>
        </div>
        <div className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-lg">
          <span className="text-[10px] text-neutral-400 font-bold">MIL_1: ₹50</span>
        </div>
      </div>

      {/* Referred Friends Status Table */}
      {referredUsers.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Referral History & Status</h3>
          <div className="bg-neutral-950 rounded-xl border border-neutral-850 overflow-hidden divide-y divide-neutral-900">
            {referredUsers.map((friend) => (
              <div key={friend.id} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{friend.name}</p>
                  <p className="text-[10px] text-neutral-500 font-mono">Mobile: +91 {friend.phone.slice(-10)}</p>
                </div>
                <div>
                  {friend.hasPerformedFirstAction ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider rounded">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-neutral-900 text-neutral-500 border border-neutral-850 text-[9px] font-bold uppercase tracking-wider rounded">
                      Pending Action
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

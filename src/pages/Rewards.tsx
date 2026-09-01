import React, { useState } from "react";
import { ReferEarn } from '../components/ReferEarn';
import { 
  Gift, ArrowRight, CheckCircle2, Info, ExternalLink, Share2, Copy 
} from 'lucide-react';
import { useStore } from '../store';

export default function Rewards() {
  const currentUser = useStore(state => state.currentUser);
  const submitNaviShare = useStore(state => state.submitNaviShare);
  
  const [claimStatus, setClaimStatus] = useState<'idle' | 'clicked' | 'pending'>('idle');
  
  // Navi Share State
  const [sharerMobile, setSharerMobile] = useState(currentUser?.phone || '');
  const [recipientMobile, setRecipientMobile] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [shareError, setShareError] = useState('');

  const handleClaim = () => {
    window.open('https://r.navi.com/bKTDAD', '_blank');
    setClaimStatus('clicked');
  };

  const submitVerification = () => {
    setClaimStatus('pending');
  };

  // Handle Share Submission
  const handleShareOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareError('');
    setShareSuccess(null);

    const cleanSharer = sharerMobile.trim();
    const cleanRecipient = recipientMobile.trim();

    if (!/^\d{10}$/.test(cleanSharer)) {
      setShareError('Your mobile number must be exactly 10 digits.');
      return;
    }
    if (!/^\d{10}$/.test(cleanRecipient)) {
      setShareError('Recipient mobile number must be exactly 10 digits.');
      return;
    }
    if (cleanSharer === cleanRecipient) {
      setShareError('Sharer and Recipient mobile numbers cannot be the same.');
      return;
    }

    setIsSharing(true);
    try {
      await submitNaviShare(cleanSharer, cleanRecipient);
      const targetNaviLink = 'https://r.navi.com/bKTDAD';
      setShareSuccess(targetNaviLink);
      setRecipientMobile('');
    } catch (err: any) {
      setShareError(err.message || 'Failed to submit share request.');
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = () => {
    const naviLink = 'https://r.navi.com/bKTDAD';
    navigator.clipboard.writeText(naviLink);
    alert('Navi referral link copied to clipboard!');
  };

  const shareOnWhatsApp = () => {
    const messageText = `Get ₹5 cashback instantly on your 1st payment! ⚡\n\nI've been using Navi UPI because the payments are actually fast.\n\nIt doesn't get stuck or lag when you are trying to pay for things.\n\nUse my link to set it up and you'll get ₹5 cashback on your first payment.\n\nDownload Now: https://r.navi.com/bKTDAD`;
    window.open(`https://wa.me/?text=${encodeURIComponent(messageText)}`, '_blank');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Gift className="w-8 h-8 text-pink-500" />
            Rewards & Bonuses
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            Earn free wallet credits by inviting friends and completing milestones.
          </p>
        </div>
      </div>

      {/* Navi UPI Promotional Card */}
      <div className="bg-neutral-900 border border-red-500/30 rounded-2xl overflow-hidden relative shadow-lg shadow-red-900/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none -mr-16 -mt-16"></div>
        <div className="p-6 relative z-10">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FF1E46] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl tracking-tight">navi</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">Navi UPI</h2>
                <p className="text-sm text-red-400 font-medium">Earn ₹20 Cash Reward + ₹5 Cashback</p>
              </div>
            </div>
            <div className="hidden sm:inline-block px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full">
              <span className="text-[10px] font-bold text-red-400 tracking-wide uppercase">🔥 Special Offer</span>
            </div>
          </div>
          
          <p className="text-sm text-neutral-300 mb-5 leading-relaxed">
            Upgrade to fast, lag-free UPI payments. Get <strong className="text-white">₹5 instant cashback</strong> on your 1st payment + <strong className="text-white">Special ₹20 reward</strong> on completing a ₹1 transaction.
          </p>

          <div className="bg-neutral-950/50 border border-neutral-800/80 rounded-xl p-4 mb-5">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-neutral-500" />
              Rules & Eligibility
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-xs text-neutral-300">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <p>Valid <strong>only for new users</strong> who have never downloaded Navi before.</p>
              </li>
              <li className="flex items-start gap-2 text-xs text-neutral-300">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <p>Reward will be credited <strong>only after completing your 1st UPI transaction</strong> (min. ₹1).</p>
              </li>
            </ul>
          </div>

          {/* Navi Share Offer Section */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-6">
            <h4 className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-[#FF1E46]" />
              Share Tracking Link with Friend
            </h4>
            
            {!shareSuccess ? (
              <form onSubmit={handleShareOffer} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Your Mobile</label>
                    <input 
                      type="tel"
                      value={sharerMobile}
                      onChange={(e) => setSharerMobile(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      placeholder="Your 10-digit number"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Friend's Mobile</label>
                    <input 
                      type="tel"
                      value={recipientMobile}
                      onChange={(e) => setRecipientMobile(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      placeholder="Friend's 10-digit number"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>
                </div>

                {shareError && (
                  <p className="text-[10px] text-red-500 font-semibold">{shareError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSharing || !sharerMobile || !recipientMobile}
                  className="w-full py-2 bg-[#FF1E46]/10 hover:bg-[#FF1E46]/20 border border-[#FF1E46]/30 hover:border-[#FF1E46]/50 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSharing ? 'Generating...' : 'Generate Share Link'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between gap-2 overflow-hidden">
                  <span className="text-[10px] text-neutral-400 font-mono truncate select-all">{shareSuccess}</span>
                  <button 
                    onClick={copyShareLink}
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white transition-colors flex-shrink-0"
                    title="Copy Link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share on WhatsApp
                  </button>
                  <button
                    onClick={() => setShareSuccess(null)}
                    className="px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    Share New
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {claimStatus === 'idle' && (
              <button 
                onClick={handleClaim}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FF1E46] hover:bg-[#E5193E] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-red-500/20 active:scale-[0.98]"
              >
                Download Navi Now
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {claimStatus === 'clicked' && (
              <div className="space-y-3">
                <button 
                  onClick={submitVerification}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl transition-all shadow-md hover:shadow-emerald-500/20 active:scale-[0.98]"
                >
                  I Have Completed My 1st Transaction
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <p className="text-[10px] text-center text-neutral-500">
                  Click above only after you have downloaded the app and completed your first ₹1 UPI payment.
                </p>
              </div>
            )}

            {claimStatus === 'pending' && (
              <div className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-neutral-800 text-neutral-400 font-bold rounded-xl border border-neutral-700 cursor-not-allowed">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Verification Pending
              </div>
            )}

            {claimStatus !== 'idle' && (
              <div className="mt-3 text-center">
                <p className="text-xs text-amber-400/90 font-medium bg-amber-500/10 border border-amber-500/20 py-2 px-3 rounded-lg inline-block">
                  Note: The ₹20 reward will be manually verified and credited to your wallet within 24 hours of completing the terms.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <ReferEarn />
      </div>
    </div>
  );
}

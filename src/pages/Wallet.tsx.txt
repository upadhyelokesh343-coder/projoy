import React, { useState, useEffect } from "react";
import { useStore } from '../store';
import { Transaction } from '../types';
import { isValid, format } from 'date-fns';
import { 
  Wallet as WalletIcon, 
  Plus, 
  ArrowUpRight, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Smartphone, 
  Building2, 
  Gift, 
  Zap, 
  Loader2, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  CreditCard,
  FileCheck2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const safeFormatDate = (dateString?: string) => {
  if (!dateString) return 'Date unavailable';
  try {
    const parsed = new Date(dateString);
    if (!isValid(parsed)) return 'Invalid date';
    return format(parsed, "dd MMM, h:mm a");
  } catch (e) {
    return 'Invalid date';
  }
};

export default function Wallet() {
  const currentUser = useStore(state => state.currentUser);
  const createBondPayOrder = useStore(state => state.createBondPayOrder);
  const syncBondPayStatus = useStore(state => state.syncBondPayStatus);
  const updateTransactionUtr = useStore(state => state.updateTransactionUtr);
  const requestWithdraw = useStore(state => state.requestWithdraw);
  const isDepositLocked = useStore(state => state.isDepositLocked);
  const depositLockMessage = useStore(state => state.depositLockMessage);
  const allTransactions = useStore(state => state.transactions);

  const transactions = allTransactions.filter(t => t?.userId === currentUser?.id);
  const hasDeposited = transactions.some(t => t.type === 'deposit' && (t.status === 'approved' || t.status === 'completed'));

  const predefinedAmounts = [100, 200, 300, 400, 500, 600, 800, 1000];
  const [amount, setAmount] = useState('100');
  const [isProcessingBondPay, setIsProcessingBondPay] = useState(false);
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [activeGatewayOrder, setActiveGatewayOrder] = useState<{
    orderNo?: string;
    merchantOrder?: string;
    paymentUrl?: string;
    amount?: number;
  } | null>(null);

  // Manual UTR submission modal state
  const [isUtrModalOpen, setIsUtrModalOpen] = useState(false);
  const [selectedOrderRef, setSelectedOrderRef] = useState('');
  const [utrInput, setUtrInput] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);

  // Transfer / Withdrawal Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferType, setTransferType] = useState<'upi' | 'bank' | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferUpiId, setTransferUpiId] = useState('');
  const [transferAccountNo, setTransferAccountNo] = useState('');
  const [transferConfirmAccountNo, setTransferConfirmAccountNo] = useState('');
  const [transferIfsc, setTransferIfsc] = useState('');
  const [transferAccountName, setTransferAccountName] = useState('');
  const [transferBankName, setTransferBankName] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Toast / Status Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState({ amount: 0, method: '' });

  useEffect(() => {
    if (isSuccessModalOpen) {
      const timer = setTimeout(() => {
        setIsSuccessModalOpen(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isSuccessModalOpen]);

  // Active Background Auto-Sync: Poll status for active or pending transactions every 4 seconds
  useEffect(() => {
    const pendingList = transactions.filter(
      t => (t.status === 'pending' || (!t.status && t.type === 'deposit')) && t.type === 'deposit'
    );

    if (pendingList.length === 0 && !activeGatewayOrder) return;

    const intervalId = setInterval(async () => {
      // 1. If active gateway order exists, sync it first
      if (activeGatewayOrder?.merchantOrder) {
        try {
          const res = await syncBondPayStatus(activeGatewayOrder.merchantOrder);
          if (res && res.status === 'completed') {
            showSuccess(`Payment Verified! ₹${activeGatewayOrder.amount} added to your wallet!`);
            setActiveGatewayOrder(null);
            return;
          }
        } catch (e) {}
      }

      // 2. Also sync the most recent pending deposit
      const latestPending = pendingList[0];
      if (latestPending) {
        const targetId = latestPending.merchantOrderNo || latestPending.reference || latestPending.id;
        try {
          const res = await syncBondPayStatus(targetId);
          if (res && res.status === 'completed') {
            showSuccess(`Payment Verified! ₹${latestPending.amount} added to your wallet!`);
          }
        } catch (e) {}
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [transactions, activeGatewayOrder, syncBondPayStatus]);

  // Check if active gateway order gets completed in realtime via Firestore / Webhook
  useEffect(() => {
    if (activeGatewayOrder?.merchantOrder) {
      const matchedTx = transactions.find(
        t => (t.reference === activeGatewayOrder.merchantOrder || t.id === activeGatewayOrder.merchantOrder || t.merchantOrderNo === activeGatewayOrder.merchantOrder) &&
        (t.status === 'completed' || t.status === 'approved')
      );
      if (matchedTx) {
        showSuccess(`Payment of ₹${matchedTx.amount} confirmed and added to your wallet!`);
        setActiveGatewayOrder(null);
      }
    }
  }, [transactions, activeGatewayOrder]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTransferModalOpen) setIsTransferModalOpen(false);
        if (isUtrModalOpen) setIsUtrModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTransferModalOpen, isUtrModalOpen]);

  if (!currentUser) return null;

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  /**
   * BONDPAY INSTANT PAYMENT HANDLER
   * Protected with full try...catch, JSON parsing guard, and safe redirection
   */
  const handleBondPayInstant = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = Number(amount);
    if (!val || val < 10) {
      showError('Minimum deposit amount is ₹10');
      return;
    }

    setIsProcessingBondPay(true);
    try {
      const result = await createBondPayOrder(val);
      if (result && result.success && result.payment_url) {
        setActiveGatewayOrder({
          orderNo: result.order_no,
          merchantOrder: result.merchant_order_no,
          paymentUrl: result.payment_url,
          amount: val
        });
        showSuccess('Redirecting to secure BondPay payment gateway...');
        
        // Safe redirect with fallback to prevent blank white screens
        setTimeout(() => {
          try {
            if (typeof window !== 'undefined' && result.payment_url) {
              window.location.assign(result.payment_url);
            }
          } catch (navErr) {
            console.warn("Direct assignment failed, trying window.location.href:", navErr);
            try {
              window.location.href = result.payment_url!;
            } catch (hrefErr) {
              console.error("Window navigation blocked:", hrefErr);
            }
          }
        }, 500);
      } else {
        showError(result?.message || 'Failed to initialize payment gateway. Please try again.');
      }
    } catch (err: any) {
      console.error("BondPay submission error:", err);
      showError(err?.message || 'Network error connecting to payment gateway.');
    } finally {
      setIsProcessingBondPay(false);
    }
  };

  /**
   * UTR MANUAL SUBMISSION HANDLER
   */
  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = utrInput.trim();
    if (!clean || clean.length < 6) {
      showError('Please enter a valid 12-digit UPI UTR / Transaction reference.');
      return;
    }

    setIsSubmittingUtr(true);
    try {
      const targetRef = selectedOrderRef || activeGatewayOrder?.merchantOrder || `DEP_${Date.now()}`;
      
      // Call server UTR submission API with defensive JSON handling
      const res = await fetch('/api/bondpay/submit-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: targetRef,
          utr: clean,
          userId: currentUser.id,
          amount: activeGatewayOrder?.amount || Number(amount) || 100
        })
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch (jsonErr) {
        console.error('Failed to parse UTR response JSON:', jsonErr);
        data = { success: res.ok };
      }

      if (data && data.success) {
        await updateTransactionUtr(targetRef, clean);

        // Immediate background sync check
        try {
          const syncRes = await syncBondPayStatus(targetRef);
          if (syncRes && syncRes.credited) {
            showSuccess(`Payment Verified! ₹${syncRes.data?.amount || ''} credited to your wallet!`);
            setActiveGatewayOrder(null);
          } else {
            showSuccess(data?.message || 'UTR details submitted successfully! Verification in progress.');
          }
        } catch (syncErr) {
          showSuccess(data?.message || 'UTR details submitted successfully! Verification in progress.');
        }

        setIsUtrModalOpen(false);
        setUtrInput('');
      } else {
        showError(data?.message || 'Failed to submit UTR.');
      }
    } catch (err: any) {
      console.error('UTR Submit Error:', err);
      showError(err?.message || 'Failed to submit UTR.');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  /**
   * CHECK & SYNC GATEWAY STATUS
   */
  const handleCheckStatus = async (orderRefOrId: string) => {
    if (!orderRefOrId) return;
    setSyncingOrderId(orderRefOrId);
    try {
      const res = await syncBondPayStatus(orderRefOrId);
      if (res && res.success) {
        if (res.status === 'completed' || res.status === 'approved') {
          showSuccess(`Payment Verified! ₹${res.data?.amount || ''} credited to your wallet.`);
        } else if (res.status === 'failed') {
          showError(`Payment marked as failed / cancelled.`);
        } else {
          showSuccess(`Status is PENDING: Bank confirmation in progress. Balance will auto-credit once confirmed.`);
        }
      } else {
        showError(res?.message || 'Status check complete: Pending approval. Please submit 12-digit UTR if paid.');
      }
    } catch (e: any) {
      showError(e?.message || 'Network error while checking status');
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hasPlayedMatch = allTransactions.some(t => t.userId === currentUser.id && t.type === 'join_fee');
      if (!hasPlayedMatch) {
        showError('Withdraw karne ke liye aapko kam se kam 1 match join karna zaroori hai.');
        return;
      }

      const amt = Math.floor(Number(transferAmount));
      if (!amt || amt <= 0) {
        showError('Please enter a valid transfer amount.');
        return;
      }
      if (amt < 50) {
        showError('Minimum withdrawal amount is ₹50');
        return;
      }
      if (amt > currentUser.balance) {
        showError('Insufficient balance in wallet.');
        return;
      }

      if (!transferType) {
        showError('Please select a transfer destination.');
        return;
      }

      if (transferType === 'upi' && !transferUpiId.trim()) {
        showError('Please enter a valid UPI ID.');
        return;
      }

      if (transferType === 'bank') {
        if (!transferBankName.trim() || !transferAccountName.trim() || !transferAccountNo.trim() || !transferIfsc.trim()) {
          showError('Please fill in all bank details.');
          return;
        }
        if (transferAccountNo !== transferConfirmAccountNo) {
          showError('Account numbers do not match.');
          return;
        }
      }

      let details = '';
      if (transferType === 'upi') {
        details = `UPI: ${transferUpiId.trim()}`;
      } else {
        details = `Bank: ${transferBankName.trim()} | A/C: ${transferAccountNo} | IFSC: ${transferIfsc.trim()} | Name: ${transferAccountName.trim()}`;
      }

      setIsSubmittingWithdraw(true);
      const withdrawRef = 'WDR_' + Date.now();
      await requestWithdraw(amt, details, withdrawRef);
      setSuccessDetails({ amount: amt, method: transferType });
      setIsTransferModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      showError(err?.message || 'Failed to submit withdrawal request.');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const renderStatusBadge = (tx: Transaction) => {
    const isSuccess = tx.status === 'completed' || tx.status === 'approved';
    const isFailed = tx.status === 'failed' || tx.status === 'rejected';

    if (isSuccess) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> SUCCESS
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md">
          <XCircle className="w-3 h-3 text-red-400" /> FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-md">
        <Clock className="w-3 h-3 text-yellow-400" /> PENDING
      </span>
    );
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Total Balance Hero Card */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-neutral-900 border border-emerald-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
            <WalletIcon className="w-48 h-48 text-emerald-500" />
          </div>
          <p className="text-neutral-400 text-sm font-medium mb-1">Total Balance</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">₹{currentUser.balance}</h2>
          <div className="flex gap-3 flex-col sm:flex-row">
            <button 
              type="button"
              onClick={() => {
                const el = document.getElementById('deposit-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold bg-emerald-500 text-neutral-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-600 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Add Money to Wallet
            </button>
            <button 
              type="button"
              onClick={() => {
                setTransferType(null);
                setTransferAmount('');
                setTransferUpiId('');
                setTransferAccountNo('');
                setTransferConfirmAccountNo('');
                setTransferIfsc('');
                setTransferAccountName('');
                setTransferBankName('');
                setIsTransferModalOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-5 h-5" /> Transfer Money
            </button>
          </div>
        </div>

        {/* Toast Messages */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-500/90 text-white px-4 py-3 rounded-xl shadow-lg border border-red-400 text-sm font-medium flex items-center gap-2"
            >
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-emerald-500/90 text-white px-4 py-3 rounded-xl shadow-lg border border-emerald-400 text-sm font-medium flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Gateway Payment In-Progress Banner */}
        {activeGatewayOrder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-emerald-950 to-neutral-900 border-2 border-emerald-500/50 rounded-2xl p-5 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="font-bold text-white text-base">Payment in Progress (₹{activeGatewayOrder.amount})</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveGatewayOrder(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-300">
              BondPay payment gateway page open kiya gaya hai. Agar payment complete ho chuki hai, toh balance auto-update hoga ya aap UTR submit kar sakte hain:
            </p>
            <div className="flex flex-wrap gap-2.5">
              {activeGatewayOrder.paymentUrl && (
                <a
                  href={activeGatewayOrder.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  <span>Re-Open Payment Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderRef(activeGatewayOrder.merchantOrder || '');
                  setUtrInput('');
                  setIsUtrModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl transition-all border border-neutral-700 cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Submit UTR Number</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Deposit Section (Exclusive BondPay Gateway) */}
        <div id="deposit-section" className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-7 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <h3 className="font-bold text-xl text-white flex items-center gap-2">
                <Plus className="w-6 h-6 text-emerald-400" />
                Add Money to Wallet
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">Instant UPI, QR Code, Cards & NetBanking via BondPay</p>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Instant Auto-Credit</span>
            </div>
          </div>

          {isDepositLocked ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-white font-bold">Deposit is Currently Locked</h4>
              <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                {depositLockMessage}
              </p>
              <div className="pt-2">
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider italic">Locked by Admin</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBondPayInstant} className="space-y-6">
              {!hasDeposited && (
                <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-xl text-yellow-400">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">First Deposit Bonus!</h4>
                    <p className="text-xs text-neutral-400">
                      Get an extra <strong className="text-yellow-400">20% bonus</strong> automatically credited to your wallet upon your first successful deposit!
                    </p>
                  </div>
                </div>
              )}

              {/* Amount Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Select Deposit Amount (₹)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {predefinedAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className={`py-2.5 px-3 rounded-xl font-black text-sm transition-all border cursor-pointer ${
                        amount === amt.toString()
                          ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                          : 'bg-neutral-950 text-white border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter custom amount (Min ₹10)"
                    min="10"
                    className="w-full pl-8 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors font-bold text-lg"
                  />
                </div>
              </div>

              {/* Supported Payment Gateways Features */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-xs font-bold text-white">PhonePe</p>
                    <p className="text-[10px] text-neutral-500">Instant UPI</p>
                  </div>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Google Pay</p>
                    <p className="text-[10px] text-neutral-500">Direct Pay</p>
                  </div>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-sky-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Paytm UPI</p>
                    <p className="text-[10px] text-neutral-500">Fast QR</p>
                  </div>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Any UPI / Cards</p>
                    <p className="text-[10px] text-neutral-500">Auto Credit</p>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-neutral-400">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  Payment complete hote hi wallet balance <strong className="text-emerald-400">100% automated</strong> update ho jayega bina kisi error ke.
                </span>
              </div>

              {/* Instant Pay Button */}
              <button
                type="submit"
                disabled={isProcessingBondPay || !amount || Number(amount) < 10}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-neutral-950 font-black rounded-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                {isProcessingBondPay ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting to Secure Payment Gateway...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    <span>Pay ₹{amount || '100'} with BondPay</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Transaction History Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Transaction History
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">Live status of your deposits, withdrawals & game winnings</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderRef('');
                  setUtrInput('');
                  setIsUtrModalOpen(true);
                }}
                className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold cursor-pointer transition-all"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                Submit UTR
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          {transactions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-2xl">
              {[
                { key: 'all', label: 'All', count: transactions.length },
                { 
                  key: 'success', 
                  label: 'Success', 
                  count: transactions.filter(t => t.status === 'completed' || t.status === 'approved').length 
                },
                { 
                  key: 'pending', 
                  label: 'Pending', 
                  count: transactions.filter(t => t.status === 'pending' || (!t.status && t.type === 'deposit')).length 
                },
                { 
                  key: 'failed', 
                  label: 'Failed', 
                  count: transactions.filter(t => t.status === 'failed' || t.status === 'rejected').length 
                },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setHistoryFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    historyFilter === tab.key
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    historyFilter === tab.key ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center p-8 bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-500">
                No transactions yet.
              </div>
            ) : (() => {
              const filteredList = transactions.filter(tx => {
                if (historyFilter === 'all') return true;
                if (historyFilter === 'success') return tx.status === 'completed' || tx.status === 'approved';
                if (historyFilter === 'pending') return tx.status === 'pending' || (!tx.status && tx.type === 'deposit');
                if (historyFilter === 'failed') return tx.status === 'failed' || tx.status === 'rejected';
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center p-8 bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-500 text-xs">
                    No {historyFilter} transactions found.
                  </div>
                );
              }

              return filteredList.map((tx) => {
                const isDeposit = tx.type === 'deposit' || tx.type === 'prize';
                const isPending = tx.status === 'pending' || (!tx.status && tx.type === 'deposit');
                const isSyncing = syncingOrderId === (tx.reference || tx.id);

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={tx.id} 
                    className={`bg-neutral-950 border rounded-2xl p-4 transition-all ${
                      isPending ? 'border-yellow-500/30' : tx.status === 'failed' || tx.status === 'rejected' ? 'border-red-500/20' : 'border-neutral-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isDeposit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {isDeposit ? <Plus className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-white capitalize text-sm sm:text-base">
                              {(tx.type || 'transaction').replace('_', ' ')}
                            </p>
                            {renderStatusBadge(tx)}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <span>{safeFormatDate(tx.date)}</span>
                          </div>

                          {tx.merchantOrderNo && (
                            <p className="text-[11px] text-neutral-400 font-mono">
                              Merchant Order: <span className="text-white font-bold">{tx.merchantOrderNo}</span>
                            </p>
                          )}
                          {tx.bondPayOrderNo && (
                            <p className="text-[11px] text-cyan-400 font-mono">
                              BondPays Order: <span className="font-bold">{tx.bondPayOrderNo}</span>
                            </p>
                          )}
                          {!tx.merchantOrderNo && tx.reference && (
                            <p className="text-[11px] text-neutral-500 font-mono">Order Ref: {tx.reference}</p>
                          )}
                          {tx.utr && (
                            <p className="text-[11px] text-emerald-400 font-mono">
                              UTR: <span className="font-bold">{tx.utr}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`font-black text-base sm:text-lg ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isDeposit ? '+' : '-'}₹{tx.amount}
                        </span>

                        {isPending && (
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <button
                              type="button"
                              disabled={isSyncing}
                              onClick={() => handleCheckStatus(tx.reference || tx.id)}
                              className="text-[10px] px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Check live gateway status"
                            >
                              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                              <span>{isSyncing ? 'Checking...' : 'Check Status'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrderRef(tx.reference || tx.id);
                                setUtrInput(tx.utr || '');
                                setIsUtrModalOpen(true);
                              }}
                              className="text-[10px] px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold transition-colors cursor-pointer"
                            >
                              Enter UTR
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="mt-3 pt-2.5 border-t border-neutral-900 flex items-center justify-between text-[11px] text-yellow-400/90 bg-yellow-500/5 px-2.5 py-1.5 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-yellow-400 animate-pulse" />
                          <span>Bank verification in progress. Click <strong>Check Status</strong> or submit UTR to confirm immediately.</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Manual UTR Submit Modal */}
      <AnimatePresence>
        {isUtrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  Submit UTR / Ref Number
                </h3>
                <button
                  type="button"
                  onClick={() => setIsUtrModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-xl bg-neutral-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-400">
                Agar aapne payment app (PhonePe, GPay, Paytm) se pay kiya hai, toh 12-digit UTR/Transaction Ref number yahan darj karein:
              </p>

              <form onSubmit={handleUtrSubmit} className="space-y-4">
                {selectedOrderRef && (
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold">Order Reference</p>
                    <p className="text-xs font-mono text-white font-bold">{selectedOrderRef}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    12-digit UPI UTR / Transaction ID
                  </label>
                  <input
                    type="text"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value.replace(/\s+/g, ''))}
                    placeholder="e.g. 423987123456"
                    className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 font-mono text-sm uppercase"
                    required
                    maxLength={30}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingUtr || !utrInput.trim()}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingUtr ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting UTR...</span>
                    </>
                  ) : (
                    <span>Submit & Verify UTR</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer / Withdrawal Modal */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="w-6 h-6 text-blue-400" />
                  Transfer Money (Withdrawal)
                </h3>
                <button 
                  onClick={() => setIsTransferModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-xl bg-neutral-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                {!transferType ? (
                  <div className="space-y-4 py-2">
                    <p className="text-sm text-neutral-400">Select transfer destination:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTransferType('upi')}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-neutral-700 bg-neutral-950 hover:border-blue-500 transition-all text-white group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold">UPI ID</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferType('bank')}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-neutral-700 bg-neutral-950 hover:border-blue-500 transition-all text-white group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold">Bank Account</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button type="button" onClick={() => setTransferType(null)} className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer">
                      ← Change Destination Type
                    </button>
                    
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex justify-between items-center">
                      <span className="text-xs text-neutral-400">Available Wallet Balance:</span>
                      <span className="text-sm font-extrabold text-emerald-400">₹{currentUser.balance}</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">Transfer Amount (₹) - Min ₹50</label>
                      <input
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        min="50"
                        max={currentUser.balance}
                        placeholder="Enter amount to transfer"
                        className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-colors font-bold text-lg"
                        required
                      />
                    </div>

                    {transferType === 'upi' ? (
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1">Recipient UPI ID / VPA</label>
                        <input
                          type="text"
                          value={transferUpiId}
                          onChange={(e) => setTransferUpiId(e.target.value)}
                          placeholder="e.g., username@oksbi"
                          className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={transferBankName}
                            onChange={(e) => setTransferBankName(e.target.value)}
                            placeholder="e.g., State Bank of India"
                            className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Account Holder Name</label>
                          <input
                            type="text"
                            value={transferAccountName}
                            onChange={(e) => setTransferAccountName(e.target.value)}
                            placeholder="Enter account holder name"
                            className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Account Number</label>
                          <input
                            type="text"
                            value={transferAccountNo}
                            onChange={(e) => setTransferAccountNo(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter account number"
                            className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Confirm Account Number</label>
                          <input
                            type="text"
                            value={transferConfirmAccountNo}
                            onChange={(e) => setTransferConfirmAccountNo(e.target.value.replace(/\D/g, ''))}
                            placeholder="Re-enter account number"
                            className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">IFSC Code</label>
                          <input
                            type="text"
                            value={transferIfsc}
                            onChange={(e) => setTransferIfsc(e.target.value.toUpperCase())}
                            placeholder="e.g., SBIN0001234"
                            className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 text-sm uppercase font-mono"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingWithdraw}
                      className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingWithdraw ? 'Submitting Request...' : 'Submit Withdrawal Request'}
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal Popup */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-neutral-900 border border-emerald-500/30 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl relative space-y-4"
            >
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Withdrawal Request Submitted!</h3>
              <p className="text-sm text-neutral-300">
                Amount of <strong className="text-emerald-400">₹{successDetails.amount}</strong> has been deducted from your wallet and submitted for admin approval.
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                <p className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Paise admin verification ke baad transfer ho jayenge.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-extrabold rounded-xl transition-all cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

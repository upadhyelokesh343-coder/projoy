import React from "react";
import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { isValid, parseISO, format } from 'date-fns';

const safeFormatDate = (dateString?: string) => {
  if (!dateString) return 'Date unavailable';
  const parsed = new Date(dateString);
  if (!isValid(parsed)) return 'Invalid date';
  return format(parsed, "dd MMM, h:mm a");
};
import { Wallet as WalletIcon, Plus, ArrowUpRight, History, CheckCircle2, XCircle, Clock, Smartphone, Building2, Gift, AlertCircle, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Wallet() {
  const currentUser = useStore(state => state.currentUser);
  const requestDeposit = useStore(state => state.requestDeposit);
  const requestWithdraw = useStore(state => state.requestWithdraw);
  const adminUpiId = useStore(state => state.adminUpiId);
  const adminQrCodeUrl = useStore(state => state.adminQrCodeUrl);
  const isDepositLocked = useStore(state => state.isDepositLocked);
  const depositLockMessage = useStore(state => state.depositLockMessage);
  const allTransactions = useStore(state => state.transactions);
  const transactions = allTransactions.filter(t => t.userId === currentUser?.id);
  const hasDeposited = transactions.some(t => t.type === 'deposit' && t.status === 'approved');

  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [addMethod, setAddMethod] = useState<'selection' | 'qr' | 'upi' | null>(null);
  const [addStep, setAddStep] = useState<'amount' | 'method' | 'pay'>('amount');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [actualPaymentAmount, setActualPaymentAmount] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const [showChangeAmountModal, setShowChangeAmountModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  
  const predefinedAmounts = [50, 100, 200, 300, 400, 500, 600];

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferType, setTransferType] = useState<'upi' | 'bank' | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferUpiId, setTransferUpiId] = useState('');
  const [transferAccountNo, setTransferAccountNo] = useState('');
  const [transferConfirmAccountNo, setTransferConfirmAccountNo] = useState('');
  const [transferIfsc, setTransferIfsc] = useState('');
  const [transferAccountName, setTransferAccountName] = useState('');
  const [transferBankName, setTransferBankName] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState({ amount: 0, method: '' });

  if (!currentUser) return null;

  const getRandomizedAmount = (base: number) => {
    // Generate a random variation between 1 and 5
    const diff = Math.floor(Math.random() * 5) + 1;
    // Randomly decide to add or subtract
    const sign = Math.random() < 0.5 ? -1 : 1;
    const finalAmount = base + (diff * sign);
    // Ensure final amount is positive and not too low
    return finalAmount > 0 ? finalAmount : base + diff;
  };

  useEffect(() => {
    let interval: any;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setErrorMsg('Payment session expired. Please start over.');
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    requestDeposit(val, reference, actualPaymentAmount || val);
    showSuccess('Deposit request submitted. Admin will approve it shortly.');
    setAddStep('amount');
    setSelectedAmount(null);
    setActualPaymentAmount(null);
    setAddMethod(null);
    setTimerActive(false);
    setTimeLeft(300);
    
    setAmount('');
    setReference('');
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-emerald-900/40 to-neutral-900 border border-emerald-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
          <WalletIcon className="w-48 h-48 text-emerald-500" />
        </div>
        <p className="text-neutral-400 text-sm font-medium mb-1">Total Balance</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">₹{currentUser.balance}</h2>
        <div className="flex gap-3 flex-col sm:flex-row">
          <button 
            type="button"
            onClick={() => {
              setAddStep('amount');
              setAddMethod(null);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold bg-emerald-500 text-neutral-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-600 transition-all"
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
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all"
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
              className="absolute top-4 left-4 right-4 z-10 bg-red-500/90 text-white px-4 py-3 rounded-xl shadow-lg border border-red-400 text-sm font-medium flex items-center gap-2"
            >
              <XCircle className="w-5 h-5 flex-shrink-0" />
              {errorMsg}
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 right-4 z-10 bg-emerald-500/90 text-white px-4 py-3 rounded-xl shadow-lg border border-emerald-400 text-sm font-medium flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <h3 className="font-bold text-lg mb-4 mt-2">Deposit Request</h3>
        
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key="add"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {!hasDeposited && !selectedAmount && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-xl text-yellow-400">
                      <Gift className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">First Deposit Bonus!</h4>
                      <p className="text-xs text-neutral-400">
                        Get an extra <strong className="text-yellow-400">20% bonus</strong> instantly credited to your wallet when you make your first deposit!
                      </p>
                    </div>
                  </div>
                )}

                {addStep === 'amount' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Select or Enter Amount (₹)</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-3">
                        {predefinedAmounts.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setSelectedAmount(amt);
                              const randomized = getRandomizedAmount(amt);
                              setActualPaymentAmount(randomized);
                              setAmount(amt.toString());
                              setAddStep('method');
                            }}
                            className="py-3 px-4 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-800/80 rounded-xl font-bold text-white transition-all text-sm"
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
                          placeholder="Enter custom amount"
                          min="10"
                          className="w-full pl-8 pr-4 py-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors font-bold text-lg"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const val = Number(amount);
                        if (!val || val <= 0) {
                          showError('Please enter a valid amount');
                          return;
                        }
                        setSelectedAmount(val);
                        const randomized = getRandomizedAmount(val);
                        setActualPaymentAmount(randomized);
                        setAddStep('method');
                      }}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Proceed to Deposit
                    </button>
                  </div>
                )}

                {addStep === 'method' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                      <div>
                        <p className="text-xs text-neutral-400">Request Amount: ₹{amount}</p>
                        <p className="text-xl font-bold text-white">Payment Amount: <span className="text-emerald-400">₹{actualPaymentAmount}</span></p>
                        <p className="text-[10px] text-neutral-500 mt-1">* This slight variation helps us verify your payment faster.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setAddStep('amount')}
                        className="text-xs text-emerald-400 font-bold underline hover:text-emerald-300"
                      >
                        Change Amount
                      </button>
                    </div>

                    <p className="text-sm font-medium text-neutral-300">Choose Payment Method:</p>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAddMethod('qr');
                          setAddStep('pay');
                          setTimerActive(true);
                        }}
                        className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-neutral-800 bg-neutral-900 hover:border-emerald-500 transition-all text-white group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold">Scan QR Code</span>
                        <span className="text-[10px] text-neutral-500">Pay via GPay / PhonePe / Paytm</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAddMethod('upi');
                          setAddStep('pay');
                          setTimerActive(true);
                        }}
                        className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-neutral-800 bg-neutral-900 hover:border-emerald-500 transition-all text-white group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold">UPI App / ID</span>
                        <span className="text-[10px] text-neutral-500">Direct UPI Transfer</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAddStep('amount')}
                      className="w-full py-2.5 text-sm text-neutral-400 hover:text-white"
                    >
                      ← Back to Amount Selection
                    </button>
                  </div>
                )}

                {addStep === 'pay' && (
                  <div className="space-y-5 bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                      <div>
                        <p className="text-xs text-neutral-400">Amount to Transfer</p>
                        <p className="text-2xl font-extrabold text-emerald-400">₹{actualPaymentAmount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-400">Session Timer</p>
                        <p className={`text-sm font-mono font-bold ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                          {formatTime(timeLeft)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-2.5 text-yellow-300 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>NOTE: Please pay the exact amount of <strong>₹{actualPaymentAmount}</strong> shown above to ensure instant wallet credit.</span>
                    </div>

                    {addMethod === 'qr' && (
                      <div className="flex flex-col items-center p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                        <p className="text-xs text-neutral-400 mb-3 font-semibold">Scan QR code using any UPI app:</p>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${adminUpiId}&pn=Admin&am=${actualPaymentAmount}&cu=INR`)}`} className="w-40 h-40 bg-white p-2 rounded-xl shadow-lg object-contain" />
                      </div>
                    )}
                    
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-300">Pay to UPI ID: <strong className="text-white font-mono">{adminUpiId}</strong></p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(adminUpiId);
                            setCopiedUpi(true);
                            setTimeout(() => setCopiedUpi(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs text-emerald-400 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedUpi ? 'Copied' : 'Copy UPI'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <a href={`upi://pay?pa=${adminUpiId}&pn=Admin&am=${actualPaymentAmount}&cu=INR`} className="flex-1 text-center py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 rounded-xl font-bold transition-colors">Pay via UPI App</a>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Transaction Reference (UTR / UPI Ref No)</label>
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Enter 12-digit UTR number"
                        className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                        required
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setAddStep('method')}
                        className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-sm"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-extrabold rounded-xl transition-all shadow-lg"
                      >
                        Submit Deposit Proof
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </form>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          Transaction History
        </h3>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-500">
              No transactions yet.
            </div>
          ) : (
            transactions.map((tx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={tx.id} 
                className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    tx.type === 'deposit' || tx.type === 'prize' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'prize' ? <Plus className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-white capitalize">{(tx.type || 'transaction').replace('_', ' ')}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <span>{safeFormatDate(tx.date)}</span>
                      <span className="flex items-center gap-1">
                        • <StatusIcon status={tx.status} /> {tx.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`font-bold ${tx.type === 'deposit' || tx.type === 'prize' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'deposit' || tx.type === 'prize' ? '+' : '-'}₹{tx.amount}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Transfer Money Modal */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="w-6 h-6 text-blue-400" />
                  Transfer Money
                </h3>
                <button 
                  onClick={() => setIsTransferModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg bg-neutral-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
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
                  showError('Please select a transfer method.');
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
                  details = `Transfer to UPI: ${transferUpiId.trim()}`;
                } else {
                  details = `Bank Transfer: ${transferBankName.trim()} | A/C: ${transferAccountNo} | IFSC: ${transferIfsc.trim()} | Name: ${transferAccountName.trim()}`;
                }

                try {
                  await requestWithdraw(amt, details);
                  setSuccessDetails({ amount: amt, method: transferType });
                  setIsTransferModalOpen(false);
                  setIsSuccessModalOpen(true);
                } catch (err: any) {
                  showError(err?.message || 'Transfer failed.');
                }
              }} className="space-y-4">
                {errorMsg && (
                  <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {!transferType ? (
                  <div className="space-y-4 py-2">
                    <p className="text-sm text-neutral-400">Select transfer destination:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTransferType('upi')}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-neutral-700 bg-neutral-950 hover:border-blue-500 transition-all text-white group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold">UPI ID</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferType('bank')}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-neutral-700 bg-neutral-950 hover:border-blue-500 transition-all text-white group"
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
                    <button type="button" onClick={() => setTransferType(null)} className="text-sm text-blue-400 flex items-center gap-1 font-bold">← Change Destination Type</button>
                    
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex justify-between items-center">
                      <span className="text-xs text-neutral-400">Available Wallet Balance:</span>
                      <span className="text-sm font-extrabold text-emerald-400">₹{currentUser.balance}</span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">Transfer Amount (₹)</label>
                      <input
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        min="10"
                        max={currentUser.balance}
                        placeholder="Enter amount to transfer"
                        className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-colors font-bold text-lg"
                        required
                      />
                    </div>

                    {transferType === 'upi' ? (
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Recipient UPI ID / VPA</label>
                        <input
                          type="text"
                          value={transferUpiId}
                          onChange={(e) => setTransferUpiId(e.target.value)}
                          placeholder="e.g., username@oksbi"
                          className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
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
                            className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 text-sm uppercase"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                    >
                      Transfer Now (Deduct from Wallet)
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
              <h3 className="text-2xl font-extrabold text-white">Withdrawal Request Submitted Successfully!</h3>
              <p className="text-sm text-neutral-300">
                Amount of <strong className="text-emerald-400">₹{successDetails.amount}</strong> has been successfully processed and deducted from your wallet.
              </p>
              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-extrabold rounded-xl transition-all shadow-lg"
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

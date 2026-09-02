import React from "react";
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { Gamepad2, Phone, User as UserIcon, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Registration State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const login = useStore(state => state.login);
  const loginWithEmailAndPassword = useStore(state => state.loginWithEmailAndPassword);
  const resetPassword = useStore(state => state.resetPassword);
  const googleLogin = useStore(state => state.googleLogin);
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      setErrorMsg('Please enter your email address first.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await resetPassword(loginEmail);
      setErrorMsg('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) return;
    
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await loginWithEmailAndPassword(loginEmail, loginPassword);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to login. Please check credentials.');
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setErrorMsg('Mobile number must be exactly 10 digits.');
      return;
    }
    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await login({ phone, name, email, password, referredBy: referralCode });
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to register. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await googleLogin();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to login with Google.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] overflow-hidden p-0.5">
            <img src="/logo.jpg" alt="ProJoy Logo" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">ProJoy</h1>
          <p className="text-xs text-neutral-400">Join the ultimate gaming arena</p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 bg-neutral-900/80 border border-neutral-800 p-1 rounded-xl mb-4">
          <button 
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'signin' ? 'bg-emerald-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            Log In
          </button>
          <button 
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'signup' ? 'bg-emerald-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
            <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
          </div>
        )}

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          {activeTab === 'signin' ? (
            /* ================= SIGN IN VIEW ================= */
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. rajsjarma8@gmail.com"
                    className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">Password</label>
                  <button type="button" onClick={handleForgotPassword} className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">Forgot Password?</button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || !loginEmail || !loginPassword}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-neutral-950 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors mt-2"
              >
                {isSubmitting ? 'Verifying...' : 'Log In Player'}
              </button>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-neutral-400">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => { setActiveTab('signup'); setErrorMsg(''); }} className="text-emerald-400 font-bold hover:underline">
                    Sign Up
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* ================= SIGN UP VIEW ================= */
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    placeholder="10-digit phone"
                    className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create security password"
                    className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm security password"
                    className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">Referral Code (Optional)</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || phone.length < 10 || !name || !email || !password}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-neutral-950 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors mt-1"
              >
                {isSubmitting ? 'Registering...' : 'Register & Log In'}
              </button>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-neutral-400">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setActiveTab('signin'); setErrorMsg(''); }} className="text-emerald-400 font-bold hover:underline">
                    Log In
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Wallet, User, ShieldCheck, Gift } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import InstallPWA from './InstallPWA';

export default function Layout() {
  const currentUser = useStore(state => state.currentUser);
  const navigate = useNavigate();

  if (!currentUser) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col pb-20 md:pb-0">
      {/* Sticky top block containing InstallPWA and the Header */}
      <div className="sticky top-0 z-50 w-full flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <InstallPWA />
        <header className="w-full flex justify-between items-center px-4 md:px-8 py-3 bg-gradient-to-b from-neutral-800 to-neutral-950 border-b border-neutral-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-lg flex-shrink-0">
            <img src="/logo.jpg" alt="ProJoy Logo" className="w-full h-full object-cover rounded-[10px]" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight drop-shadow-md">
            <span className="text-white">Pro</span><span className="text-emerald-400">Joy</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Wallet Balance in Header */}
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-700/50 shadow-inner rounded-full px-3 py-1.5 md:px-4 md:py-2 cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={() => navigate('/wallet')}>
            <Wallet className="w-4 h-4 md:w-4 md:h-4 text-emerald-400" />
            <span className="font-bold text-white text-sm md:text-base">₹{currentUser.balance}</span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex gap-6 items-center font-semibold ml-4">
            <NavLink to="/" className={({isActive}) => cn("hover:text-emerald-400 transition-colors", isActive && "text-emerald-400")}>Home</NavLink>
            <NavLink to="/rewards" className={({isActive}) => cn("hover:text-emerald-400 transition-colors", isActive && "text-emerald-400")}>Rewards</NavLink>
            <NavLink to="/wallet" className={({isActive}) => cn("hover:text-emerald-400 transition-colors", isActive && "text-emerald-400")}>Wallet</NavLink>
            <NavLink to="/profile" className={({isActive}) => cn("hover:text-emerald-400 transition-colors", isActive && "text-emerald-400")}>Profile</NavLink>
            {currentUser.role === 'admin' && (
              <NavLink to="/admin" className={({isActive}) => cn("flex items-center gap-1 text-purple-400 hover:text-purple-300", isActive && "text-purple-300")}>
                <ShieldCheck className="w-4 h-4" /> Admin
              </NavLink>
            )}
          </nav>
        </div>
      </header>
    </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:pb-6 overflow-y-auto overflow-x-hidden">
        {/* Page Content */}
        <div className="h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur-md border-t border-neutral-800 z-50 px-6 py-3 flex justify-between items-center safe-area-pb">
        <NavLink to="/" className={({isActive}) => cn("flex flex-col items-center gap-1 text-xs", isActive ? "text-emerald-400" : "text-neutral-500 hover:text-neutral-300")}>
          <Home className="w-6 h-6" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/rewards" className={({isActive}) => cn("flex flex-col items-center gap-1 text-xs", isActive ? "text-pink-400" : "text-neutral-500 hover:text-neutral-300")}>
          <Gift className="w-6 h-6" />
          <span>Rewards</span>
        </NavLink>
        <NavLink to="/wallet" className={({isActive}) => cn("flex flex-col items-center gap-1 text-xs", isActive ? "text-emerald-400" : "text-neutral-500 hover:text-neutral-300")}>
          <Wallet className="w-6 h-6" />
          <span>Wallet</span>
        </NavLink>
        {currentUser.role === 'admin' && (
           <NavLink to="/admin" className={({isActive}) => cn("flex flex-col items-center gap-1 text-xs", isActive ? "text-purple-400" : "text-neutral-500 hover:text-neutral-300")}>
             <ShieldCheck className="w-6 h-6" />
             <span>Admin</span>
           </NavLink>
        )}
        <NavLink to="/profile" className={({isActive}) => cn("flex flex-col items-center gap-1 text-xs", isActive ? "text-emerald-400" : "text-neutral-500 hover:text-neutral-300")}>
          <User className="w-6 h-6" />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}

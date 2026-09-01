import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Show manual instructions if native prompt is not available (e.g. iOS or already installed)
      setShowInstructions(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        className="bg-neutral-900 border-b border-neutral-800 overflow-hidden relative z-50"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Nexus Gaming App</p>
              <p className="text-[10px] text-neutral-400 truncate">Install for a faster, better experience</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-emerald-500 text-neutral-950 text-xs font-black rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              DOWNLOAD <Download className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Manual Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-emerald-500/10 p-3 rounded-2xl">
                  <Smartphone className="w-6 h-6 text-emerald-500" />
                </div>
                <button onClick={() => setShowInstructions(false)} className="p-2 hover:bg-neutral-800 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">How to Install</h3>
              <p className="text-neutral-400 text-sm mb-6">Follow these simple steps to add Nexus Gaming to your home screen:</p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-emerald-500">1</div>
                  <div>
                    <p className="text-white font-bold text-sm">For iOS (iPhone/iPad)</p>
                    <p className="text-neutral-500 text-xs mt-1">Tap the <span className="text-white">Share</span> icon at the bottom, then scroll down and tap <span className="text-emerald-400">"Add to Home Screen"</span>.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-emerald-500">2</div>
                  <div>
                    <p className="text-white font-bold text-sm">For Android</p>
                    <p className="text-neutral-500 text-xs mt-1">Tap the <span className="text-white">Menu</span> (3 dots) in the top right, then tap <span className="text-emerald-400">"Install App"</span> or "Add to Home Screen".</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-8 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors"
              >
                Got it!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

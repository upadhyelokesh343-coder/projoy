import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Volume2, VolumeX } from 'lucide-react';

export const TournamentRulesModal = ({ 
  isOpen, 
  onClose, 
  onProceed 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onProceed: () => void 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Stop speech when modal closes or unmounts
    if (!isOpen) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
    }
    return () => window.speechSynthesis?.cancel();
  }, [isOpen]);

  if (!isOpen) return null;

  const rulesText = `Important Tournament Rules. 
Rule 1. No Hacking or Scripts allowed. If any player is found using hacks or cheats, they will be banned permanently and their entry fee and prize money will NOT be refunded.
Rule 2. Timely Room Entry. Players must join the custom room on time using the provided credentials. If a player joins the tournament but fails to enter the custom room before the match starts, their entry fee will NOT be refunded.
Rule 3. Fair Play. Please maintain fair competition and adhere to all match timings strictly.`;

  const toggleSpeech = () => {
    if (!window.speechSynthesis) {
      alert("Your browser does not support Text-to-Speech.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(rulesText);
    utterance.lang = 'en-IN'; // Indian English
    utterance.pitch = 0.9; // Lower pitch to sound more like a male/boy
    utterance.rate = 0.9;  // Slightly slower for clarity

    // Attempt to find a suitable male/boy voice
    const voices = window.speechSynthesis.getVoices();
    const indianMale = voices.find(v => (v.lang === 'en-IN' || v.lang === 'hi-IN') && v.name.toLowerCase().includes('male'));
    
    if (indianMale) {
      utterance.voice = indianMale;
    } else {
      const anyMale = voices.find(v => v.name.toLowerCase().includes('male'));
      if (anyMale) utterance.voice = anyMale;
    }

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-orange-500" /> Rules & Guidelines
            </h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors bg-neutral-800 p-1.5 rounded-full">
              <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-2 pb-3 border-b border-neutral-800">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Please read carefully</span>
            <button 
              onClick={toggleSpeech}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isPlaying ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-neutral-800 text-emerald-400 border border-neutral-700 hover:bg-neutral-700'}`}
            >
              {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isPlaying ? 'Stop Audio' : 'Listen Rules'}
            </button>
          </div>

          <div className="space-y-4 text-sm text-neutral-300">
            <div>
              <h4 className="text-white font-bold mb-1">🚫 1. No Hacking / Scripts</h4>
              <p className="leading-relaxed">
                If any player is found using hacks, scripts, or cheats, they will be <span className="text-red-400 font-bold">banned permanently</span> and their entry fee/prize money will <strong>NOT</strong> be refunded.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-1">⏱️ 2. Timely Room Entry</h4>
              <p className="leading-relaxed">
                Players must join the custom room on time using the provided credentials. If a player joins the tournament but fails to enter the custom room before the match starts, their entry fee will <span className="text-red-400 font-bold">NOT</span> be refunded.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-1">🤝 3. Fair Play</h4>
              <p className="leading-relaxed">
                Emphasize fair competition and strictly adhere to all match timings and rules. Any misbehavior will lead to disqualification.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={onClose} 
              className="py-3.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                window.speechSynthesis?.cancel();
                setIsPlaying(false);
                onProceed();
              }} 
              className="py-3.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              Confirm & Join
            </button>
        </div>
      </div>
    </div>
  );
};

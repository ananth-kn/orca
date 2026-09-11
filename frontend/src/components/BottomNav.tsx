import React, { useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useVoiceCommand } from '../store/useVoiceCommand';
import { Home, User, MessageCircle } from 'lucide-react';
import { t } from '../utils/translations';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, language } = useAppStore();
  const { isListening, toggle } = useVoiceCommand();

  const lastTapTime = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (activeTab === 'weather') return null;

  const isHomeActive = activeTab === 'home';
  const isProfileActive = activeTab === 'profile';
  const isAiActive = activeTab === 'ai';

  const handleBubbleTap = () => {
    const now = Date.now();

    /*
     * If currently listening:
     * A tap ONLY stops listening.
     * It can never navigate to AI.
     */
    if (isListening) {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }

      lastTapTime.current = 0;
      toggle();
      return;
    }

    const elapsed = now - lastTapTime.current;

    /*
     * Two taps within 350ms = open AI.
     */
    if (lastTapTime.current !== 0 && elapsed < 350) {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }

      lastTapTime.current = 0;
      setActiveTab('ai');
      return;
    }

    /*
     * First tap.
     * Wait 350ms before starting voice listening so we can
     * determine whether a second tap follows.
     */
    lastTapTime.current = now;

    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
    }

    tapTimer.current = setTimeout(() => {
      lastTapTime.current = 0;
      tapTimer.current = null;

      toggle();
    }, 350);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0e28] z-40 px-4 flex items-center justify-between border-t border-white/[0.06] select-none">
      {/* Home */}
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center justify-center py-1 px-5 transition-all ${
          isHomeActive ? 'text-white' : 'text-white/35'
        }`}
      >
        <Home
          size={22}
          className={isHomeActive ? 'fill-white' : ''}
        />

        <span className="text-[10px] mt-1 font-medium tracking-tight">
          {t('nav_home', language)}
        </span>
      </button>

      {/* ORCA AI / Voice */}
      <button
        onClick={handleBubbleTap}
        className={`flex flex-col items-center justify-center -mt-5 transition-all ${
          isAiActive ? 'text-white' : 'text-white/35'
        }`}
      >
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isListening
              ? 'bg-red-500 scale-110 shadow-[0_0_28px_rgba(239,68,68,0.6)] animate-pulse'
              : isAiActive
                ? 'bg-blue-600 shadow-[0_0_24px_rgba(37,99,235,0.55)]'
                : 'bg-[#1a2247] border border-white/[0.12] shadow-[0_4px_12px_rgba(0,0,0,0.35)]'
          }`}
        >
          <MessageCircle
            size={24}
            className="text-white"
          />
        </div>

        <span className="text-[10px] mt-1.5 font-semibold tracking-tight">
          {isListening ? 'Listening…' : 'ORCA AI'}
        </span>
      </button>

      {/* Profile */}
      <button
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center justify-center py-1 px-5 transition-all ${
          isProfileActive ? 'text-white' : 'text-white/35'
        }`}
      >
        <User
          size={22}
          className={
            isProfileActive
              ? 'fill-white text-white'
              : ''
          }
        />

        <span className="text-[10px] mt-1 font-medium tracking-tight">
          {t('nav_profile', language)}
        </span>
      </button>
    </nav>
  );
};
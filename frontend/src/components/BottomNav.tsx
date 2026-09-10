import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Home, User, MessageCircle } from 'lucide-react';
import { t } from '../utils/translations';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, language } = useAppStore();

  // Hide bottom nav on screens that use back navigation
  if (activeTab === 'weather') return null;

  const isHomeActive = activeTab === 'home';
  const isProfileActive = activeTab === 'profile';
  const isAiActive = ['ai'].includes(activeTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0e28] z-40 px-4 flex items-center justify-between border-t border-white/[0.06] select-none">
      {/* Home */}
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center justify-center py-1 px-5 transition-all ${
          isHomeActive ? 'text-white' : 'text-white/35'
        }`}
      >
        <Home size={22} className={isHomeActive ? 'fill-white' : ''} />
        <span className="text-[10px] mt-1 font-medium tracking-tight">{t('nav_home', language)}</span>
      </button>

      {/* AI Chat — central elevated button */}
      <button
        onClick={() => setActiveTab('ai')}
        className={`flex flex-col items-center justify-center -mt-5 transition-all ${
          isAiActive ? 'text-white' : 'text-white/35'
        }`}
      >
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isAiActive
              ? 'bg-blue-600 shadow-[0_0_24px_rgba(37,99,235,0.55)]'
              : 'bg-[#1a2247] border border-white/[0.12] shadow-[0_4px_12px_rgba(0,0,0,0.35)]'
          }`}
        >
          <MessageCircle size={24} className="text-white" />
        </div>
        <span className="text-[10px] mt-1.5 font-semibold tracking-tight">ORCA AI</span>
      </button>

      {/* Profile */}
      <button
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center justify-center py-1 px-5 transition-all ${
          isProfileActive ? 'text-white' : 'text-white/35'
        }`}
      >
        <User size={22} className={isProfileActive ? 'fill-white text-white' : ''} />
        <span className="text-[10px] mt-1 font-medium tracking-tight">{t('nav_profile', language)}</span>
      </button>
    </nav>
  );
};

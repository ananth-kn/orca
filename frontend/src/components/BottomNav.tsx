import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Home, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  // Hide bottom nav on screens that use back navigation
  if (activeTab === 'weather') return null;

  const isHomeActive = ['home', 'map', 'ai', 'chat'].includes(activeTab);
  const isProfileActive = activeTab === 'profile';

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0e28] z-40 px-12 flex items-center justify-between border-t border-white/[0.06] select-none">
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center justify-center py-1 px-6 transition-all ${
          isHomeActive
            ? 'text-white'
            : 'text-white/35'
        }`}
      >
        <Home size={22} className={isHomeActive ? 'fill-white' : ''} />
        <span className="text-[10px] mt-1 font-medium tracking-tight">Home</span>
      </button>

      <button
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center justify-center py-1 px-6 transition-all ${
          isProfileActive
            ? 'text-white'
            : 'text-white/35'
        }`}
      >
        <User size={22} className={isProfileActive ? 'fill-white text-white' : ''} />
        <span className="text-[10px] mt-1 font-medium tracking-tight">Profile</span>
      </button>
    </nav>
  );
};

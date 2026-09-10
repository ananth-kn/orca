import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { RefreshCw, User, AlertTriangle } from 'lucide-react';
import { t } from '../utils/translations';

export const TopBar: React.FC = () => {
  const { isRefreshing, lastRefreshedLabel, isOffline, refreshMarine, setActiveTab, setSOSOpen, language } = useAppStore();

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-40 px-3.5 sm:px-6 flex items-center justify-between shadow-2xs select-none">
      
      {/* TOP LEFT: ORCA REFRESH CONTROL + SYNC STATUS */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={() => void refreshMarine()}
          title={t('topbar_refresh', language)}
          className="flex items-center space-x-1.5 active:opacity-75 transition group"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs group-hover:bg-blue-600 transition">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c-2.49 0-4.5-2.01-4.5-4.5S10.51 7.5 13 7.5c1.45 0 2.74.69 3.56 1.76l-1.42 1.42c-.52-.64-1.32-1.04-2.14-1.04-1.59 0-2.86 1.28-2.86 2.86 0 1.59 1.28 2.86 2.86 2.86.82 0 1.62-.4 2.14-1.04l1.42 1.42C15.74 15.81 14.45 16.5 13 16.5z"/>
            </svg>
          </div>

          <div className="text-left">
            <div className="flex items-center space-x-1">
              <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                ORCA
              </span>
              <RefreshCw
                size={11}
                className={`text-slate-500 transition-transform ${isRefreshing ? 'animate-spin text-blue-600' : 'group-hover:rotate-90'}`}
              />
            </div>
            
            <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
              {isRefreshing ? t('syncing', language) : isOffline ? t('common_offline', language) : lastRefreshedLabel}
            </div>
          </div>
        </button>

        <span className="text-slate-300">|</span>

        {/* REGION LABEL — no hardcoded region until live data exists */}
        <span className="text-xs font-bold text-slate-700">
          {t('topbar_coastline', language)}
        </span>
      </div>

      {/* TOP RIGHT: SOS BUTTON & PROFILE CIRCLE */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setSOSOpen(true)}
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white px-2.5 py-1 rounded-md text-xs font-black tracking-wider uppercase shadow-2xs flex items-center space-x-1"
        >
          <AlertTriangle size={13} />
          <span>{t('sos_button', language)}</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          title={t('topbar_profile_settings', language)}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 transition active:scale-95"
        >
          <User size={14} />
        </button>
      </div>

    </header>
  );
};

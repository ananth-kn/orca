import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function LoginGate() {
  const { setLanguage, setActiveTab } = useAppStore();

  useEffect(() => {
    const lang = localStorage.getItem('orca_lang') || 'English';
    setLanguage(lang);
    setActiveTab('home');
  }, [setActiveTab, setLanguage]);

  return null;
}

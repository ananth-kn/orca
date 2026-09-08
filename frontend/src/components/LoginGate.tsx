import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function LoginGate() {
  const { setActiveTab, setLanguage } = useAppStore();

  useEffect(() => {
    const userId = localStorage.getItem('orca_user_id');
    if (!userId) {
      window.location.href = '/login.html';
    } else {
      const lang = localStorage.getItem('orca_lang') || 'English';
      setLanguage(lang);
      setActiveTab('home');
    }
  }, [setActiveTab, setLanguage]);

  return null;
}

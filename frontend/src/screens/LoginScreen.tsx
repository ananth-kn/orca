import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export const LoginScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [lang, setLang] = useState('hi');
  const { setLanguage, setActiveTab } = useAppStore();

  const submit = async () => {
    if (!name.trim()) return;
    try {
      const res = await fetch('http://localhost:8000/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, language: lang }),
      });
      const data = await res.json();
      localStorage.setItem('orca_user_id', String(data.id));
      localStorage.setItem('orca_lang', data.language || lang);
      setLanguage(data.language || lang);
      setActiveTab('home');
    } catch (e) {
      alert('Login failed — is backend running?');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f1535] text-white items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
        <h1 className="text-3xl font-extrabold text-center tracking-tight">ORCA</h1>
        <p className="text-center text-sm text-white/60">Fisherman Assistant — No password needed</p>
        <input
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-400"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          <option value="en" className="bg-[#0f1535]">English</option>
          <option value="hi" className="bg-[#0f1535]">Hindi</option>
          <option value="ta" className="bg-[#0f1535]">Tamil</option>
          <option value="te" className="bg-[#0f1535]">Telugu</option>
          <option value="ml" className="bg-[#0f1535]">Malayalam</option>
        </select>
        <button
          onClick={submit}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Start
        </button>
      </div>
    </div>
  );
};

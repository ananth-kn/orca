import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Send, Mic } from 'lucide-react';

export const HomeAskOrca: React.FC = () => {
  const { sendChat, setActiveTab } = useAppStore();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    setQuery('');
    await sendChat(text);
    setActiveTab('chat');
  };

  const handleVoiceTap = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      void sendChat('Any bad weather or rough waves coming today?');
      setActiveTab('chat');
    }, 2000);
  };

  return (
    <section className="py-1 select-none">
      <form
        onSubmit={handleSubmit}
        className="flex items-center space-x-2 bg-white border border-slate-300 rounded-full px-3 py-1.5 shadow-xs"
      >
        <button
          type="button"
          onClick={handleVoiceTap}
          title="Voice input"
          className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 shrink-0 ${
            isListening
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Mic size={14} />
        </button>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ASK ORCA..."
          className="flex-1 bg-transparent text-slate-900 text-xs font-semibold outline-none placeholder:text-slate-400"
        />

        <button
          type="submit"
          disabled={!query.trim()}
          className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 shrink-0"
        >
          <Send size={12} />
        </button>
      </form>
    </section>
  );
};

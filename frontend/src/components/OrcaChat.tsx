import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Send, X } from 'lucide-react';

export const OrcaChat: React.FC = () => {
  const { isChatOpen, setChatOpen, chatMessages, sendChat, isChatSending } = useAppStore();
  const [draft, setDraft] = useState('');

  if (!isChatOpen) return null;

  const submit = async () => {
    const text = draft;
    setDraft('');
    await sendChat(text);
  };

  return (
    <div className="absolute inset-0 z-40 bg-marine-900/40 backdrop-blur-sm flex items-end">
      <div className="bg-white w-full h-[80dvh] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-marine-900">Ask ORCA</h2>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Marine advisory</p>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="bg-slate-100 p-2 rounded-full text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
          {chatMessages.map((msg, idx) => (
            <div
              key={`${msg.role}-${idx}`}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'ml-auto bg-marine-900 text-white'
                  : 'bg-slate-50 text-marine-900 border border-slate-100'
              }`}
            >
              {msg.text}
            </div>
          ))}
          {isChatSending && (
            <div className="bg-slate-50 text-slate-400 text-sm rounded-2xl px-4 py-3 border border-slate-100 w-fit">
              ORCA is checking conditions…
            </div>
          )}
        </div>

        <form
          className="p-4 pb-safe flex items-center space-x-2 border-t border-slate-100"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about waves, PFZ, or this area…"
            className="flex-1 bg-slate-50 rounded-full px-4 py-3 text-sm font-medium outline-none border border-slate-200"
          />
          <button
            type="submit"
            disabled={isChatSending || !draft.trim()}
            className="bg-marine-900 text-white p-3 rounded-full disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

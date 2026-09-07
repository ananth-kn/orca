import React, { useState } from 'react';
import { ArrowLeft, Radio, Send, Signal } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface Message {
  id: string;
  sender: string;
  distance?: string;
  text: string;
  isMe: boolean;
  timestamp: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'Raju',
    distance: '2.1 km',
    text: 'Good catch near Sector 4A today. Tuna schools spotted.',
    isMe: false,
    timestamp: '09:42',
  },
  {
    id: '2',
    sender: 'Mohan',
    distance: '4.5 km',
    text: 'Coming back to harbour. Waves picking up from south.',
    isMe: false,
    timestamp: '10:15',
  },
  {
    id: '3',
    sender: 'You',
    text: 'Thanks Mohan. Heading to 4A now.',
    isMe: true,
    timestamp: '10:18',
  },
];

export const ChatScreen: React.FC = () => {
  const { setActiveTab } = useAppStore();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'You',
      text: input,
      isMe: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f1535] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08] bg-[#0f1535]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('home')}
            className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white hover:bg-white/[0.1] active:bg-white/[0.15] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold tracking-wide">Fleet Chat</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
          <Radio size={14} className="text-green-500" />
          <span className="text-xs font-medium text-white/90">Connected</span>
        </div>
      </div>

      {/* LoRa Status Banner */}
      <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.05] flex items-center justify-center gap-2">
        <Signal size={16} className="text-blue-400" />
        <span className="text-sm font-medium text-white/80">LoRa Network: 3 fishermen nearby</span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
            {!msg.isMe && (
              <div className="flex items-center gap-2 mb-1.5 ml-1">
                <span className="text-xs font-semibold text-white/90">{msg.sender}</span>
                {msg.distance && (
                  <span className="text-[10px] font-medium text-white/50 bg-white/[0.05] px-1.5 py-0.5 rounded-full">
                    {msg.distance}
                  </span>
                )}
              </div>
            )}
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.isMe 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white/[0.08] border border-white/[0.05] text-white/90 rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
            <span className="text-[10px] text-white/40 mt-1 mr-1">{msg.timestamp}</span>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="px-4 py-4 bg-[#0f1535] border-t border-white/[0.08] mt-auto">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message fleet..."
            className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/[0.2] transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-3.5 rounded-2xl bg-blue-600 text-white disabled:opacity-50 disabled:bg-white/[0.05] transition-colors flex-shrink-0"
          >
            <Send size={20} className={input.trim() ? "ml-1" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

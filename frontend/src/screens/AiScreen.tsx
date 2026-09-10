import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, Send, Trash2, Volume2, Loader2, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import api from '../api/client';
import { languageToIso } from '../api/adapters';
import { AiDataCard } from '../components/AiDataCard';
import { t } from '../utils/translations';

/**
 * Truncate answer to a short summary (first ~2 sentences or 150 chars).
 * Returns [short, full] — if no truncation needed, short === full.
 */
function splitAnswer(text: string): { short: string; full: string; needsExpand: boolean } {
  if (!text) return { short: '', full: '', needsExpand: false };
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length <= 2 || text.length <= 180) {
    return { short: text, full: text, needsExpand: false };
  }
  const short = sentences.slice(0, 2).join(' ').trim();
  return { short, full: text, needsExpand: true };
}

export const AiScreen: React.FC = () => {
  const {
    chatMessages,
    isChatSending,
    sendChat,
    clearChat,
    language,
    setActiveTab,
    weather
  } = useAppStore();

  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const langIso = languageToIso(language);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async (message: string = inputMessage) => {
    if (!message.trim()) return;
    setInputMessage('');

    let contextStr = '';
    if (weather) {
      contextStr = `Wind ${weather.windSpeed}km/h, Wave ${weather.waveHeight}m, Rain ${weather.rainProb}%`;
    }

    await sendChat(message, contextStr);
  };

  const handleMicPress = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    void startRecording();
  };

  const startRecording = async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

        try {
          const fd = new FormData();
          fd.append('audio', file, 'recording.webm');
          const audioRes = await fetch(
            `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api/voice/chat/audio?lang=${langIso}`,
            { method: 'POST', body: fd }
          );
          if (!audioRes.ok) throw new Error(`Voice full failed: ${audioRes.status}`);

          const userText = audioRes.headers.get('X-User-Text') || '';
          const answerText = audioRes.headers.get('X-Answer-Text') || '';

          const store = useAppStore.getState();
          store.addVoiceTurn(userText, answerText);

          const audioBlobRes = await audioRes.blob();
          const url = URL.createObjectURL(audioBlobRes);
          const audio = new Audio(url);
          audio.play();
          audio.onended = () => URL.revokeObjectURL(url);
        } catch (err) {
          console.error('[Voice full] Error:', err);
        }
      };

      recorder.start();
    } catch (err) {
      console.error('[Voice] Microphone access denied:', err);
      setIsRecording(false);
    }
  };

  const speak = async (text: string) => {
    try {
      const blob = await api.voice.tts(text, langIso);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Voice] TTS error:', err);
    }
  };

  const suggestions = [
    t('ai_sugg_safe', language),
    t('ai_sugg_pfz', language),
    t('ai_sugg_return', language),
    t('ai_sugg_bound', language)
  ];

  return (
    <div className="flex flex-col h-full bg-[#0f1535] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.08] shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('home')}
            className="p-2 bg-white/[0.05] rounded-xl hover:bg-white/[0.1] transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">{t('ai_title', language)}</h1>
        </div>
        <button
          onClick={clearChat}
          className="p-2 text-white/60 hover:text-red-400 bg-white/[0.05] rounded-xl transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Chat History — fills remaining space */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <div className="w-20 h-20 bg-white/[0.05] rounded-full flex items-center justify-center mb-4">
              <Volume2 className="w-10 h-10 text-white/40" />
            </div>
            <p className="text-xl font-medium">{t('ai_how_help', language)}</p>
            <p className="text-sm max-w-xs">{t('ai_desc', language)}</p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => {
            const isAssistant = msg.role === 'assistant';
            const msgId = msg.id || `idx-${idx}`;
            const isExpanded = expandedIds.has(msgId);
            const displayText = msg.content || msg.text || '';

            let shortText = displayText;
            let fullText = displayText;
            let needsExpand = false;

            if (isAssistant) {
              const split = splitAnswer(displayText);
              shortText = split.short;
              fullText = split.full;
              needsExpand = split.needsExpand;
            }

            const visibleText = isAssistant && !isExpanded ? shortText : fullText;

            return (
              <div
                key={msgId}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-white/[0.08] border border-white/[0.1] text-white rounded-tl-sm'
                  }`}
                >
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                    {visibleText}
                  </div>

                  {/* More Details toggle for assistant */}
                  {isAssistant && needsExpand && (
                    <button
                      onClick={() => toggleExpand(msgId)}
                      className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      {isExpanded ? 'Show less' : 'More details'}
                    </button>
                  )}

                  {/* Structured data cards from backend */}
                  {isAssistant && msg.data && (
                    <AiDataCard data={msg.data} />
                  )}

                  {isAssistant && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => speak(displayText)}
                        className="p-1.5 bg-white/[0.05] rounded-lg hover:bg-white/[0.1] transition-colors text-blue-400"
                        title="Read aloud"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isChatSending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white/[0.08] border border-white/[0.1] rounded-2xl rounded-tl-sm p-4 flex items-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-white/60 text-sm font-medium">{t('ai_thinking', language)}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area — pinned to bottom */}
      <div className="shrink-0 p-4 border-t border-white/[0.08] bg-[#0f1535]">
        {/* Suggestions */}
        <div className="flex overflow-x-auto mb-3 space-x-2 scrollbar-hide">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="whitespace-nowrap px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm font-medium hover:bg-white/[0.1] transition-colors shrink-0"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Mic button */}
          <button
            onClick={handleMicPress}
            className={`shrink-0 p-3.5 rounded-2xl transition-all ${
              isRecording
                ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'bg-white/[0.06] border border-white/[0.1] text-blue-400'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Text input */}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isRecording ? t('ai_listening', language) : t('ai_placeholder', language)}
            className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
          />

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || isChatSending}
            className="shrink-0 p-3.5 bg-blue-600 rounded-2xl flex items-center justify-center disabled:opacity-50 disabled:bg-white/[0.05] transition-colors"
          >
            {isChatSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
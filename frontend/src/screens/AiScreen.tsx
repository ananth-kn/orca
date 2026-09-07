import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, Send, Trash2, Volume2, Search, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import api from '../api/client';
import { languageToIso } from '../api/adapters';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const langIso = languageToIso(language);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = async (message: string = inputMessage) => {
    if (!message.trim()) return;
    setInputMessage('');

    // Provide location/weather context to the agent if available
    let contextStr = '';
    if (weather) {
      contextStr = ` [Context: Wind ${weather.windSpeed}km/h, Wave ${weather.waveHeight}m]`;
    }

    await sendChat(message + contextStr);
  };

  // ─── Voice: record → STT → stream audio response ───────────────────────────
  const handleMicPress = () => {
    if (isRecording) return;
    void startRecording();
  };

  const startRecording = async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

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

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        console.log('[Voice] Recorded', audioBlob.size, 'bytes, mime:', recorder.mimeType);

        try {
          const response = await api.voice.stream(audioBlob as unknown as File, langIso);

          if (!response.ok) throw new Error(`Voice stream failed: ${response.status}`);

          const userText = response.headers.get('X-User-Text') || '';
          const answerText = response.headers.get('X-Answer-Text') || '';
          console.log('[Voice] User:', userText, '| ORCA:', answerText);

          // Play streamed audio chunks
          const audioCtx = audioCtxRef.current!;
          let nextStartTime = audioCtx.currentTime;
          let buffer = new Uint8Array(0);

          const reader = response.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const merged = new Uint8Array(buffer.length + value.length);
            merged.set(buffer, 0);
            merged.set(value, buffer.length);
            buffer = merged;

            while (buffer.length >= 4) {
              const len = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0, false);
              if (buffer.length < 4 + len) break;

              const frame = buffer.slice(4, 4 + len);
              buffer = buffer.slice(4 + len);

              try {
                const audioData = await audioCtx.decodeAudioData(frame.buffer.slice(0));
                const source = audioCtx.createBufferSource();
                source.buffer = audioData;
                source.connect(audioCtx.destination);
                const startAt = Math.max(nextStartTime, audioCtx.currentTime);
                source.start(startAt);
                nextStartTime = startAt + audioData.duration;
              } catch {
                // skip undecodable frame
              }
            }
          }
        } catch (err) {
          console.error('[Voice] Stream error:', err);
        }
      };

      recorder.start();
      console.log('[Voice] Recording started');
    } catch (err) {
      console.error('[Voice] Microphone access denied:', err);
      setIsRecording(false);
    }
  };

  // ─── TTS: backend TTS for "read aloud" button ──────────────────────────────
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
    'Is it safe now?',
    'Nearest PFZ',
    'When to return?',
    'Check boundaries'
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1535] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('home')}
            className="p-2 bg-white/[0.05] rounded-xl hover:bg-white/[0.1] transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Ask ORCA</h1>
        </div>
        <button
          onClick={clearChat}
          className="p-2 text-white/60 hover:text-red-400 bg-white/[0.05] rounded-xl transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Input Area (Top) */}
      <div className="p-4 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              autoFocus
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask ORCA anything..."
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-2xl py-4 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors font-medium text-lg"
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || isChatSending}
            className="p-4 bg-blue-600 rounded-2xl flex items-center justify-center disabled:opacity-50 disabled:bg-white/[0.1] transition-colors"
          >
            {isChatSending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Big Mic Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleMicPress}
            className={`flex items-center space-x-2 py-3 px-8 rounded-full font-bold text-lg transition-all ${
              isRecording
                ? 'bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                : 'bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1]'
            }`}
          >
            <Mic className={`w-6 h-6 ${isRecording ? 'text-white' : 'text-blue-400'}`} />
            <span>{isRecording ? 'Listening...' : 'Tap to speak'}</span>
          </button>
        </div>

        {/* Suggestions */}
        <div className="flex overflow-x-auto mt-4 space-x-2 pb-2 scrollbar-hide">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="whitespace-nowrap px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm font-medium hover:bg-white/[0.1] transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <div className="w-20 h-20 bg-white/[0.05] rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-white/40" />
            </div>
            <p className="text-xl font-medium">How can I help you today?</p>
            <p className="text-sm max-w-xs">Ask about weather, safety, fishing zones, or regulations.</p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div
              key={msg.id || idx}
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
                  {msg.content || msg.text}
                </div>

                {msg.role === 'assistant' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => speak(msg.content || msg.text || '')}
                      className="p-1.5 bg-white/[0.05] rounded-lg hover:bg-white/[0.1] transition-colors text-blue-400"
                      title="Read aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isChatSending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white/[0.08] border border-white/[0.1] rounded-2xl rounded-tl-sm p-4 flex items-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-white/60 text-sm font-medium">ORCA is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

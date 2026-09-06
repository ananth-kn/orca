import React, { useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Mic, User, Search, RefreshCw } from 'lucide-react';

export const TopCommandBar: React.FC = () => {
  const {
    isOffline,
    setOffline,
    tripState,
    selectedPfz,
    setChatOpen,
    refreshMarine,
    isSyncing,
    lastSyncedAt,
  } = useAppStore();

  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getPlaceholder = () => {
    if (tripState === 'travelling' || tripState === 'returning') {
      return 'Ask ORCA about my route...';
    }

    if (selectedPfz) {
      return 'Ask ORCA about this area...';
    }

    return 'Search or ask ORCA...';
  };

  const syncedLabel = () => {
    if (isOffline) return 'CACHED · OFFLINE';
    if (isSyncing) return 'SYNCING…';
    if (!lastSyncedAt) return 'LIVE';

    const mins = Math.max(
      0,
      Math.round(
        (Date.now() - new Date(lastSyncedAt).getTime()) / 60000
      )
    );

    return mins === 0 ? 'LIVE · JUST NOW' : `LIVE · ${mins}m ago`;
  };

  // ---------------------------------------------------------
  // Voice recording
  // ---------------------------------------------------------

    const handleMicClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }


    // If already recording, stop it
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      // Ask browser for microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      // Collect audio chunks
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // When recording stops
      recorder.onstop = async () => {
        // Stop microphone
        stream.getTracks().forEach((track) => track.stop());

        setIsRecording(false);

        // Create audio file
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType,
        });

        console.log(
          'Recorded audio:',
          audioBlob.size,
          'bytes',
          recorder.mimeType
        );

        // Send audio to backend
        const formData = new FormData();

        formData.append(
          'audio',
          audioBlob,
          'voice.webm'
        );
try {
  const response = await fetch(
    'https://orca-production-693f.up.railway.app/api/voice/chat/audio/stream?lang=hi',
    { method: 'POST', body: formData }
  );

  if (!response.ok) throw new Error(`Voice chat request failed: ${response.status}`);

  const userText = response.headers.get('X-User-Text');
  const answerText = response.headers.get('X-Answer-Text');
  setChatOpen(true);
  console.log('User said:', userText, 'ORCA:', answerText);

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

      const audioData = await audioCtx.decodeAudioData(frame.buffer.slice(0));
      const source = audioCtx.createBufferSource();
      source.buffer = audioData;
      source.connect(audioCtx.destination);
      const startAt = Math.max(nextStartTime, audioCtx.currentTime);
      source.start(startAt);
      nextStartTime = startAt + audioData.duration;
    }
  }
} catch (error) {
  console.error('Failed to stream audio:', error);
}
              };

      // Start recording
      recorder.start();

      setIsRecording(true);

      console.log('Recording started');

    } catch (error) {
      console.error(
        'Could not access microphone:',
        error
      );

      setIsRecording(false);
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 pt-safe px-4 z-20 pointer-events-none flex flex-col space-y-3">

      {/* ORCA Sync Status */}
      <div className="flex items-center space-x-2 mt-2 pointer-events-auto">

        <button
          onClick={() => {
            void refreshMarine();
          }}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-marine-900 text-white shadow-lg border border-marine-800 active:scale-95 transition-transform"
        >
          <RefreshCw
            size={14}
            className={isSyncing ? 'animate-spin' : ''}
          />
        </button>

        <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-widest text-marine-700 shadow-sm uppercase border border-white/50">
          {syncedLabel()}
        </div>

      </div>

      {/* Universal Command Bar */}
      <div className="flex w-full items-center space-x-3 pointer-events-auto">

        <div
          onClick={() => {
            setChatOpen(true);
          }}
          className="bg-white/95 backdrop-blur-lg rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 pl-5 flex-1 flex items-center space-x-3 cursor-text active:scale-[0.98] transition-transform border border-slate-200"
        >

          <Search
            size={18}
            className="text-marine-600"
          />

          <span className="flex-1 text-sm font-medium text-slate-500 truncate">
            {getPlaceholder()}
          </span>

          {/* MIC BUTTON */}
          <button
            type="button"
            onClick={handleMicClick}
            className={`text-white p-2.5 rounded-full shadow-md transition-all ${
              isRecording
                ? 'bg-danger animate-pulse'
                : 'bg-marine-900'
            }`}
            title={
              isRecording
                ? 'Stop recording'
                : 'Start voice input'
            }
          >
            <Mic size={16} />
          </button>

        </div>

        {/* Profile Avatar */}
        <button
          onClick={() => setOffline(!isOffline)}
          className={`backdrop-blur-lg p-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-[0.98] transition-transform border ${
            isOffline
              ? 'bg-slate-100 text-slate-400 border-slate-300'
              : 'bg-white/95 text-marine-900 border-slate-200'
          }`}
        >
          <User size={20} />
        </button>

      </div>

    </div>
  );
};
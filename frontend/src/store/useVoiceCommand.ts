import { useRef, useState } from 'react';
import { useAppStore } from './useAppStore';

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function useVoiceCommand() {
  const [isListening, setIsListening] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startingRef = useRef(false);

  const handleIntent = async (intent: string, rawText: string) => {
    const store = useAppStore.getState();

    switch (intent) {
    case 'goto_nearest_pfz': {
      await store.fetchPfz();
      store.setActiveTab('map');
      break;
    }

      case 'goto_map':
        store.setActiveTab('map');
        break;

      case 'goto_chat':
        store.setActiveTab('chat');
        break;

      case 'goto_weather':
        store.setActiveTab('weather');
        break;

      case 'explain_context': {
        const ctx = JSON.stringify({
          selectedPfz: store.selectedPfz,
          weather: store.weather,
          activeTab: store.activeTab,
        });

        store.setActiveTab('ai');
        void store.sendChat(
          rawText || 'Explain what I am seeing',
          ctx
        );
        break;
      }

      default:
        store.setActiveTab('ai');

        if (rawText) {
          void store.sendChat(rawText);
        }

        break;
    }
  };

  const stop = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder) return;

    if (recorder.state === 'recording') {
      recorder.stop();
    }
  };

  const start = async () => {
    // Prevent multiple simultaneous starts
    if (startingRef.current || mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    startingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        mediaRecorderRef.current = null;
        setIsListening(false);

        const blob = new Blob(chunksRef.current, {
          type: 'audio/webm',
        });

        const file = new File(
          [blob],
          'voice.webm',
          { type: 'audio/webm' }
        );

        const fd = new FormData();
        fd.append('audio', file, 'voice.webm');

        try {
          const res = await fetch(
            `${BASE}/api/voice/intent`,
            {
              method: 'POST',
              body: fd,
            }
          );

          if (!res.ok) {
            throw new Error(
              `Voice intent failed: ${res.status} ${res.statusText}`
            );
          }

          const data = await res.json();

          if (data?.intent) {
            await handleIntent(
              data.intent,
              data.raw_text || ''
            );
          }
        } catch (err) {
          console.error(
            '[VoiceCommand] intent failed:',
            err
          );

          // IMPORTANT:
          // Backend failure must NOT navigate anywhere.
        }
      };

      recorder.start();
      setIsListening(true);
    } catch (err) {
      console.error(
        '[VoiceCommand] microphone failed:',
        err
      );

      setIsListening(false);
      mediaRecorderRef.current = null;
    } finally {
      startingRef.current = false;
    }
  };

  const toggle = () => {
    if (isListening) {
      stop();
    } else {
      void start();
    }
  };

  return {
    isListening,
    toggle,
  };
}
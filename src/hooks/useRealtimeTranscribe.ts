import { useState, useCallback, useRef } from 'react';

export interface RealtimeTranscribeState {
  isStreaming: boolean;
  isFinalizing: boolean;
  transcript: string;
  speakerSegments: Array<{ speaker: string; text: string }>;
  error: string | null;
}

export function useRealtimeTranscribe() {
  const [state, setState] = useState<RealtimeTranscribeState>({
    isStreaming: false,
    isFinalizing: false,
    transcript: '',
    speakerSegments: [],
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastTranscriptRef = useRef<string>('');
  // クロージャバグ回避: state の代わりに ref でフラグを管理
  const isStreamingRef = useRef(false);

  const streamPartialAudio = useCallback(async (audioBlob: Blob) => {
    // ref を参照するため、古いクロージャの影響を受けない
    if (!isStreamingRef.current) return;

    try {
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT as string;

      const response = await fetch(`${apiEndpoint}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: audioBlob,
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const newTranscript = data.transcript || '';
      const newSegments = data.speakerSegments || [];

      if (newTranscript.length > lastTranscriptRef.current.length) {
        lastTranscriptRef.current = newTranscript;
        setState(prev => ({
          ...prev,
          transcript: newTranscript,
          speakerSegments: newSegments,
          error: null,
        }));
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes('aborted')) {
        console.warn('Partial streaming error:', err);
      }
    }
  }, []); // 依存なし: ref を使うため安全

  const startStreaming = useCallback(() => {
    isStreamingRef.current = true;
    setState({ isStreaming: true, isFinalizing: false, transcript: '', speakerSegments: [], error: null });
    lastTranscriptRef.current = '';
    abortControllerRef.current = new AbortController();
  }, []);

  const stopStreaming = useCallback(async (finalAudioBlob: Blob) => {
    isStreamingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 録音停止 → 最終処理中状態へ
    setState(prev => ({ ...prev, isStreaming: false, isFinalizing: true }));

    try {
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT as string;

      const response = await fetch(`${apiEndpoint}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: finalAudioBlob,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      setState({
        isStreaming: false,
        isFinalizing: false,
        transcript: data.transcript || '',
        speakerSegments: data.speakerSegments || [],
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setState({ isStreaming: false, isFinalizing: false, transcript: '', speakerSegments: [], error: message });
    }
  }, []);

  const reset = useCallback(() => {
    isStreamingRef.current = false;
    setState({ isStreaming: false, isFinalizing: false, transcript: '', speakerSegments: [], error: null });
    lastTranscriptRef.current = '';
  }, []);

  return { ...state, startStreaming, stopStreaming, streamPartialAudio, reset };
}

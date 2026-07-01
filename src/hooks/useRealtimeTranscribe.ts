import { useState, useCallback, useRef } from 'react';

export interface RealtimeTranscribeState {
  isStreaming: boolean;
  transcript: string;
  speakerSegments: Array<{ speaker: string; text: string }>;
  error: string | null;
}

export function useRealtimeTranscribe() {
  const [state, setState] = useState<RealtimeTranscribeState>({
    isStreaming: false,
    transcript: '',
    speakerSegments: [],
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastTranscriptRef = useRef<string>('');

  const streamPartialAudio = useCallback(async (audioBlob: Blob) => {
    if (!state.isStreaming) return;

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

      // 新しい部分のみを抽出
      const newTranscript = data.transcript || '';
      const newSegments = data.speakerSegments || [];

      // 前回のトランスクリプトより新しい部分を追加
      if (newTranscript.length > lastTranscriptRef.current.length) {
        lastTranscriptRef.current = newTranscript;
        setState({
          isStreaming: true,
          transcript: newTranscript,
          speakerSegments: newSegments,
          error: null,
        });
      }
    } catch (err) {
      // ネットワークエラーは無視（ストリーミング中なので気にしない）
      if (err instanceof Error && !err.message.includes('aborted')) {
        console.warn('Partial streaming error:', err);
      }
    }
  }, [state.isStreaming]);

  const startStreaming = useCallback(async () => {
    setState({ isStreaming: true, transcript: '', speakerSegments: [], error: null });
    lastTranscriptRef.current = '';
    abortControllerRef.current = new AbortController();
  }, []);

  const stopStreaming = useCallback(async (finalAudioBlob: Blob) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT as string;

      // 最後の完全なデータを送信
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
        transcript: data.transcript || '',
        speakerSegments: data.speakerSegments || [],
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setState({ isStreaming: false, transcript: '', speakerSegments: [], error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isStreaming: false, transcript: '', speakerSegments: [], error: null });
    lastTranscriptRef.current = '';
  }, []);

  return { ...state, startStreaming, stopStreaming, streamPartialAudio, reset };
}

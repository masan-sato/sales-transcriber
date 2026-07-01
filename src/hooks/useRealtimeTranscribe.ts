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

  const startStreaming = useCallback(async (audioBlob: Blob) => {
    setState({ isStreaming: true, transcript: '', speakerSegments: [], error: null });

    try {
      abortControllerRef.current = new AbortController();
      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT as string;

      const response = await fetch(`${apiEndpoint}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/webm' },
        body: audioBlob,
        signal: abortControllerRef.current.signal,
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

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState((prev) => ({ ...prev, isStreaming: false }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isStreaming: false, transcript: '', speakerSegments: [], error: null });
  }, []);

  return { ...state, startStreaming, stopStreaming, reset };
}

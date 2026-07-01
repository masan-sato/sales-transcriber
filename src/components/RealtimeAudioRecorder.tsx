import { useState, useRef, useCallback } from 'react';

interface RealtimeAudioRecorderProps {
  onRecordingComplete: (file: Blob) => void;
  isProcessing?: boolean;
}

/**
 * PCM データから WAV ファイルを生成
 */
function createWavBlob(pcmData: Float32Array, sampleRate: number): Blob {
  const channelData = [pcmData];
  const numberOfChannels = channelData.length;
  const sampleCount = pcmData.length;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;

  const bufferLength = 44 + sampleCount * blockAlign;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // WAV ヘッダー（44 バイト）
  writeString(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  writeString(36, 'data');
  view.setUint32(40, sampleCount * blockAlign, true);

  // PCM データを 16-bit に変換して書き込み
  let index = 44;
  for (let i = 0; i < sampleCount; i++) {
    const sample = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    index += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export function RealtimeAudioRecorder({ onRecordingComplete, isProcessing }: RealtimeAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    pcmChunksRef.current = [];
    setSeconds(0);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const pcmData = e.inputBuffer.getChannelData(0);
      pcmChunksRef.current.push(new Float32Array(pcmData));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    setIsRecording(true);
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (!audioContextRef.current || !processorRef.current) return;

    processorRef.current.disconnect();
    audioContextRef.current.close();

    // PCM データを結合
    const totalLength = pcmChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const pcmData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunksRef.current) {
      pcmData.set(chunk, offset);
      offset += chunk.length;
    }

    // WAV フォーマットで Blob を作成（Transcribe Streaming が対応している形式）
    const wavBlob = createWavBlob(pcmData, audioContextRef.current?.sampleRate || 16000);
    onRecordingComplete(wavBlob);

    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [onRecordingComplete]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎤 リアルタイム録音</h2>
      {isRecording && (
        <div style={styles.timer}>
          <span style={styles.dot} /> {formatTime(seconds)} 録音中...
        </div>
      )}
      {isProcessing && (
        <div style={styles.processing}>
          <span style={styles.spinner} /> 処理中...
        </div>
      )}
      <button
        style={isRecording ? styles.stopBtn : styles.startBtn}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        {isRecording ? '■ 録音停止' : '● 録音開始'}
      </button>
      <p style={styles.note}>マイクへのアクセス許可が必要です</p>
    </div>
  );
}

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎤 リアルタイム録音</h2>
      {isRecording && (
        <div style={styles.timer}>
          <span style={styles.dot} /> {formatTime(seconds)} 録音中...
        </div>
      )}
      {isProcessing && (
        <div style={styles.processing}>
          <span style={styles.spinner} /> 処理中...
        </div>
      )}
      <button
        style={isRecording ? styles.stopBtn : styles.startBtn}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        {isRecording ? '■ 録音停止' : '● 録音開始'}
      </button>
      <p style={styles.note}>マイクへのアクセス許可が必要です</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  title: { marginBottom: 16, fontSize: 18 },
  timer: { color: '#e53e3e', marginBottom: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, background: '#e53e3e', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' },
  processing: { color: '#3182ce', marginBottom: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 },
  spinner: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3182ce', animation: 'spin 1s linear infinite' },
  startBtn: { background: '#3182ce', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 'bold' },
  stopBtn: { background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 'bold' },
  note: { marginTop: 8, fontSize: 12, color: '#718096' },
};

import { useState, useRef, useCallback } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    setSeconds(0);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      onRecordingComplete(file);
    };

    mediaRecorder.start(1000);
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎤 録音</h2>
      {isRecording && (
        <div style={styles.timer}>
          <span style={styles.dot} /> {formatTime(seconds)} 録音中...
        </div>
      )}
      <button
        style={isRecording ? styles.stopBtn : styles.startBtn}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
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
  startBtn: { background: '#3182ce', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 'bold' },
  stopBtn: { background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 'bold' },
  note: { marginTop: 8, fontSize: 12, color: '#718096' },
};

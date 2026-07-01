import { useState } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { RealtimeAudioRecorder } from './components/RealtimeAudioRecorder';
import { FileUploader } from './components/FileUploader';
import { TranscriptViewer } from './components/TranscriptViewer';
import { MarkdownExporter } from './components/MarkdownExporter';
import { useTranscribe } from './hooks/useTranscribe';
import { useRealtimeTranscribe } from './hooks/useRealtimeTranscribe';

function App() {
  const [mode, setMode] = useState<'normal' | 'realtime'>('normal');
  const normal = useTranscribe();
  const realtime = useRealtimeTranscribe();

  const isProcessing = mode === 'normal' ? (normal.status === 'uploading' || normal.status === 'processing') : realtime.isStreaming;
  const error = mode === 'normal' ? normal.error : realtime.error;
  const result = mode === 'normal' && normal.status === 'completed' 
    ? normal.result 
    : mode === 'realtime' && realtime.transcript 
    ? { transcript: realtime.transcript, speakerSegments: realtime.speakerSegments }
    : null;

  const handleReset = () => {
    if (mode === 'normal') normal.reset();
    else realtime.reset();
  };

  const handleNormalRecord = (file: File) => {
    setMode('normal');
    normal.transcribe(file);
  };

  const handleRealtimePartialAudio = (blob: Blob) => {
    realtime.streamPartialAudio(blob);
  };

  const handleRealtimeRecordComplete = (blob: Blob) => {
    realtime.stopStreaming(blob);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.h1}>🎙️ Sales Transcriber</h1>
        <p style={styles.sub}>営業同行の会話を録音・文字起こし・Markdown化</p>
      </header>

      <main style={styles.main}>
        {/* モード選択 */}
        {result === null && (
          <div style={styles.modeSelector}>
            <button
              style={{ ...styles.modeBtn, ...(mode === 'normal' ? styles.activeModeBtn : {}) }}
              onClick={() => setMode('normal')}
            >
              📋 通常モード
            </button>
            <button
              style={{ ...styles.modeBtn, ...(mode === 'realtime' ? styles.activeModeBtn : {}) }}
              onClick={() => setMode('realtime')}
            >
              ⚡ リアルタイムモード
            </button>
          </div>
        )}

        {/* 入力エリア */}
        {result === null && (
          <>
            {mode === 'normal' ? (
              <>
                <AudioRecorder onRecordingComplete={handleNormalRecord} disabled={isProcessing} />
                <FileUploader onFileSelected={handleNormalRecord} disabled={isProcessing} />
              </>
            ) : (
              <RealtimeAudioRecorder 
                onRecordingComplete={handleRealtimeRecordComplete} 
                onPartialAudio={handleRealtimePartialAudio}
                isProcessing={isProcessing}
                onStartRecording={() => realtime.startStreaming()}
                onStopRecording={() => {}}
              />
            )}
          </>
        )}

        {/* 処理中 */}
        {isProcessing && (
          <div style={styles.progressCard}>
            <div style={styles.spinner} />
            <p style={styles.progressText}>
              {mode === 'normal' ? normal.progress : 'リアルタイム処理中...'}
            </p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div style={styles.errorCard}>
            <p style={styles.errorText}>⚠️ {error}</p>
            <button style={styles.retryBtn} onClick={handleReset}>
              もう一度試す
            </button>
          </div>
        )}

        {/* 結果 */}
        {result && (
          <>
            <TranscriptViewer
              transcript={result.transcript || ''}
              speakerSegments={result.speakerSegments}
            />
            <MarkdownExporter
              transcript={result.transcript || ''}
              speakerSegments={result.speakerSegments}
            />
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button style={styles.retryBtn} onClick={handleReset}>
                新しい録音を処理する
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f5f7fa' },
  header: { background: 'linear-gradient(135deg, #2b6cb0, #3182ce)', color: '#fff', padding: '32px 24px', textAlign: 'center' },
  h1: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  sub: { fontSize: 14, opacity: 0.85 },
  main: { maxWidth: 720, margin: '0 auto', padding: '24px 16px' },
  modeSelector: { display: 'flex', gap: 12, marginBottom: 16 },
  modeBtn: { flex: 1, padding: '12px 16px', fontSize: 14, fontWeight: 'bold', border: '2px solid #cbd5e0', background: '#fff', borderRadius: 8, cursor: 'pointer' },
  activeModeBtn: { background: '#3182ce', color: '#fff', borderColor: '#3182ce' },
  progressCard: { background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 },
  spinner: { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #3182ce', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
  progressText: { color: '#4a5568', fontSize: 15 },
  errorCard: { background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 12, padding: 24, marginBottom: 16, textAlign: 'center' },
  errorText: { color: '#c53030', marginBottom: 16 },
  retryBtn: { background: '#718096', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 'bold' },
};

export default App;

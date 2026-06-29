import { AudioRecorder } from './components/AudioRecorder';
import { FileUploader } from './components/FileUploader';
import { TranscriptViewer } from './components/TranscriptViewer';
import { MarkdownExporter } from './components/MarkdownExporter';
import { useTranscribe } from './hooks/useTranscribe';

function App() {
  const { status, progress, result, error, transcribe, reset } = useTranscribe();

  const isProcessing = status === 'uploading' || status === 'processing';

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.h1}>🎙️ Sales Transcriber</h1>
        <p style={styles.sub}>営業同行の会話を録音・文字起こし・Markdown化</p>
      </header>

      <main style={styles.main}>
        {/* 入力エリア */}
        {status !== 'completed' && (
          <>
            <AudioRecorder onRecordingComplete={transcribe} disabled={isProcessing} />
            <FileUploader onFileSelected={transcribe} disabled={isProcessing} />
          </>
        )}

        {/* 処理中 */}
        {isProcessing && (
          <div style={styles.progressCard}>
            <div style={styles.spinner} />
            <p style={styles.progressText}>{progress}</p>
          </div>
        )}

        {/* エラー */}
        {status === 'error' && (
          <div style={styles.errorCard}>
            <p style={styles.errorText}>⚠️ {error}</p>
            <button style={styles.retryBtn} onClick={reset}>もう一度試す</button>
          </div>
        )}

        {/* 結果 */}
        {status === 'completed' && result && (
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
              <button style={styles.retryBtn} onClick={reset}>
                新しい録音・ファイルを処理する
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
  progressCard: { background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 },
  spinner: {
    width: 40, height: 40, border: '4px solid #e2e8f0',
    borderTop: '4px solid #3182ce', borderRadius: '50%',
    animation: 'spin 1s linear infinite', margin: '0 auto 16px',
  },
  progressText: { color: '#4a5568', fontSize: 15 },
  errorCard: { background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 12, padding: 24, marginBottom: 16, textAlign: 'center' },
  errorText: { color: '#c53030', marginBottom: 16 },
  retryBtn: { background: '#718096', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 'bold' },
};

export default App;

interface TranscriptViewerProps {
  transcript: string;
  speakerSegments?: Array<{ speaker: string; text: string }>;
}

const SPEAKER_COLORS: Record<string, string> = {
  spk_0: '#3182ce',
  spk_1: '#e53e3e',
  spk_2: '#38a169',
  spk_3: '#d69e2e',
  spk_4: '#805ad5',
};

export function TranscriptViewer({ transcript, speakerSegments }: TranscriptViewerProps) {
  const hasSegments = speakerSegments && speakerSegments.length > 0;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📄 文字起こし結果</h2>

      {hasSegments ? (
        <div>
          <p style={styles.subLabel}>話者別</p>
          {speakerSegments.map((seg, i) => {
            const color = SPEAKER_COLORS[seg.speaker] || '#666';
            const label = seg.speaker.replace('spk_', '話者') + (parseInt(seg.speaker.split('_')[1]) + 1);
            return (
              <div key={i} style={styles.segment}>
                <span style={{ ...styles.speakerTag, background: color }}>{label}</span>
                <span style={styles.segText}>{seg.text}</span>
              </div>
            );
          })}
          <hr style={styles.divider} />
        </div>
      ) : null}

      <p style={styles.subLabel}>全文</p>
      <div style={styles.fullText}>{transcript}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  title: { marginBottom: 16, fontSize: 18 },
  subLabel: { fontWeight: 'bold', color: '#4a5568', marginBottom: 10, fontSize: 14 },
  segment: { display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  speakerTag: { color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 },
  segText: { fontSize: 15, lineHeight: 1.6, color: '#2d3748' },
  divider: { margin: '16px 0', borderColor: '#e2e8f0' },
  fullText: { background: '#f7fafc', borderRadius: 8, padding: 16, fontSize: 15, lineHeight: 1.8, color: '#2d3748', whiteSpace: 'pre-wrap' },
};

import { useState } from 'react';

interface MarkdownExporterProps {
  transcript: string;
  speakerSegments?: Array<{ speaker: string; text: string }>;
}

function buildMarkdown(transcript: string, speakerSegments?: Array<{ speaker: string; text: string }>): string {
  const today = new Date().toISOString().split('T')[0];

  let content = '';

  if (speakerSegments && speakerSegments.length > 0) {
    content = speakerSegments
      .map((seg) => {
        const label = `話者${parseInt(seg.speaker.split('_')[1]) + 1}`;
        return `**${label}**: ${seg.text}`;
      })
      .join('\n\n');
  } else {
    content = transcript;
  }

  return `# 商談メモ

**日時**: ${today}  
**場所**:   
**参加者**:   

---

## 会話内容

${content}

---

## アクションアイテム

- [ ] 

## 次回アポ

- 
`;
}

export function MarkdownExporter({ transcript, speakerSegments }: MarkdownExporterProps) {
  const [copied, setCopied] = useState(false);
  const markdown = buildMarkdown(transcript, speakerSegments);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `商談メモ_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📝 Markdown 出力</h2>
      <pre style={styles.preview}>{markdown}</pre>
      <div style={styles.btnRow}>
        <button style={styles.copyBtn} onClick={handleCopy}>
          {copied ? '✓ コピーしました' : '📋 コピー'}
        </button>
        <button style={styles.downloadBtn} onClick={handleDownload}>
          ⬇ .md ダウンロード
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  title: { marginBottom: 16, fontSize: 18 },
  preview: { background: '#f7fafc', borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'pre-wrap', marginBottom: 16 },
  btnRow: { display: 'flex', gap: 12 },
  copyBtn: { background: '#4a5568', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 'bold' },
  downloadBtn: { background: '#3182ce', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 'bold' },
};

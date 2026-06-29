import { useRef } from 'react';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function FileUploader({ onFileSelected, disabled }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      e.target.value = '';
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📁 ファイルアップロード</h2>
      <p style={styles.desc}>MP3・WAV・M4A・WebM 形式に対応</p>
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/webm,audio/ogg"
        onChange={handleChange}
        disabled={disabled}
        style={{ display: 'none' }}
      />
      <button
        style={styles.btn}
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        ファイルを選択
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  title: { marginBottom: 8, fontSize: 18 },
  desc: { color: '#718096', fontSize: 14, marginBottom: 16 },
  btn: { background: '#48bb78', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 'bold' },
};

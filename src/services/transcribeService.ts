const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT as string;

export interface UploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
  fileId: string;
}

export interface TranscribeResponse {
  jobId: string;
  status: string;
}

export interface ResultResponse {
  jobId: string;
  status: 'IN_PROGRESS' | 'QUEUED' | 'COMPLETED' | 'FAILED';
  transcript?: string;
  speakerSegments?: Array<{ speaker: string; text: string }>;
  error?: string;
}

/** S3署名付きアップロードURLを取得する */
export async function getUploadUrl(fileName: string, contentType: string): Promise<UploadUrlResponse> {
  const res = await fetch(`${API_ENDPOINT}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType }),
  });
  if (!res.ok) throw new Error(`Upload URL取得失敗: ${res.status}`);
  return res.json();
}

/** 音声ファイルをS3に直接アップロードする */
export async function uploadAudioToS3(uploadUrl: string, file: Blob, contentType: string): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) throw new Error(`S3アップロード失敗: ${res.status}`);
}

/** 文字起こしジョブを開始する */
export async function startTranscription(s3Key: string): Promise<TranscribeResponse> {
  const res = await fetch(`${API_ENDPOINT}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3Key }),
  });
  if (!res.ok) throw new Error(`文字起こし開始失敗: ${res.status}`);
  return res.json();
}

/** 文字起こし結果を取得する */
export async function getTranscriptionResult(jobId: string): Promise<ResultResponse> {
  const res = await fetch(`${API_ENDPOINT}/result/${jobId}`);
  if (!res.ok) throw new Error(`結果取得失敗: ${res.status}`);
  return res.json();
}

import { useState, useCallback } from 'react';
import {
  getUploadUrl,
  uploadAudioToS3,
  startTranscription,
  getTranscriptionResult,
  type ResultResponse,
} from '../services/transcribeService';

export type TranscribeStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export interface TranscribeState {
  status: TranscribeStatus;
  progress: string;
  result: ResultResponse | null;
  error: string | null;
}

export function useTranscribe() {
  const [state, setState] = useState<TranscribeState>({
    status: 'idle',
    progress: '',
    result: null,
    error: null,
  });

  const transcribe = useCallback(async (file: File) => {
    setState({ status: 'uploading', progress: 'ファイルをアップロード中...', result: null, error: null });

    try {
      // 1. 署名付きURL取得
      const { uploadUrl, s3Key } = await getUploadUrl(file.name, file.type || 'audio/mpeg');

      // 2. S3に直接アップロード
      await uploadAudioToS3(uploadUrl, file, file.type || 'audio/mpeg');
      setState((prev) => ({ ...prev, progress: '文字起こし中... (1〜2分かかります)' }));

      // 3. 文字起こし開始
      const { jobId } = await startTranscription(s3Key);
      setState((prev) => ({ ...prev, status: 'processing' }));

      // 4. ポーリングで結果待機（最大10分）
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await sleep(10000); // 10秒待機
        const result = await getTranscriptionResult(jobId);

        if (result.status === 'COMPLETED') {
          setState({ status: 'completed', progress: '完了', result, error: null });
          return;
        }
        if (result.status === 'FAILED') {
          throw new Error(result.error || '文字起こしに失敗しました');
        }

        const elapsed = (i + 1) * 10;
        setState((prev) => ({
          ...prev,
          progress: `文字起こし中... (${elapsed}秒経過)`,
        }));
      }

      throw new Error('タイムアウト: 文字起こしに10分以上かかっています');
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setState({ status: 'error', progress: '', result: null, error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: '', result: null, error: null });
  }, []);

  return { ...state, transcribe, reset };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

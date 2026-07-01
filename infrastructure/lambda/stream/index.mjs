import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from "@aws-sdk/client-transcribe-streaming";
import { randomUUID } from "crypto";

const transcribeStreaming = new TranscribeStreamingClient({
  region: process.env.REGION,
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

/**
 * 音声チャンクを async generator でストリーミング
 * WAV ファイルを受け取り、ヘッダーをスキップして PCM データを送信
 */
async function* audioChunkGenerator(body) {
  let audioBuffer;
  
  // body を Buffer に変換
  if (Buffer.isBuffer(body)) {
    audioBuffer = body;
  } else if (body instanceof ArrayBuffer) {
    audioBuffer = Buffer.from(body);
  } else {
    const arrayBuffer = await body.arrayBuffer();
    audioBuffer = Buffer.from(arrayBuffer);
  }
  
  // WAV ファイルのヘッダーをスキップ（最初の 44 バイト）
  const pcmData = audioBuffer.slice(44);
  const chunkSize = 1024;
  
  for (let i = 0; i < pcmData.length; i += chunkSize) {
    const chunk = pcmData.slice(i, i + chunkSize);
    yield {
      AudioEvent: {
        AudioChunk: chunk,
      },
    };
    // 音声チャンク間に小さい遅延を入れる
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "POST only" }),
    };
  }

  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body);

    // Transcribe Streaming を開始
    const command = new StartStreamTranscriptionCommand({
      LanguageCode: "ja-JP",
      MediaSampleRateHertz: 16000, // AudioContext のデフォルト sample rate
      MediaEncoding: "pcm", // WAV ファイルに含まれる PCM データ
      AudioStream: audioChunkGenerator(body),
    });

    const response = await transcribeStreaming.send(command);

    let fullTranscript = "";
    let speakerSegments = [];

    // ストリーミング結果を処理
    for await (const event of response.TranscriptResultStream) {
      if (event.TranscriptEvent) {
        const results = event.TranscriptEvent.Transcript.Results || [];

        for (const result of results) {
          const transcript =
            result.Alternatives?.[0]?.Transcript || "";

          // 暫定結果（is_partial=true）はスキップして、確定したもの（is_partial=false）のみを保存
          if (!result.IsPartial) {
            fullTranscript += transcript + " ";

            // 話者情報を抽出
            if (result.Alternatives?.[0]?.Items) {
              const items = result.Alternatives[0].Items;
              const speaker = items[0]?.Speaker || "spk_0";
              const segmentText = transcript;

              if (
                !speakerSegments.length ||
                speakerSegments[speakerSegments.length - 1].speaker !==
                  speaker
              ) {
                speakerSegments.push({ speaker, text: segmentText });
              } else {
                speakerSegments[speakerSegments.length - 1].text +=
                  " " + segmentText;
              }
            }
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcript: fullTranscript.trim(),
        speakerSegments,
        status: "COMPLETED",
      }),
    };
  } catch (err) {
    console.error("Streaming transcription error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "ストリーミング文字起こしに失敗しました",
      }),
    };
  }
};

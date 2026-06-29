import {
  TranscribeClient,
  StartTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import { randomUUID } from "crypto";

const transcribe = new TranscribeClient({ region: process.env.REGION });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { s3Key } = body;

    if (!s3Key) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "s3Key は必須です" }),
      };
    }

    const jobName = `transcribe-${randomUUID()}`;
    const mediaUri = `s3://${process.env.AUDIO_BUCKET}/${s3Key}`;

    // ファイル拡張子からメディア形式を判定
    const ext = s3Key.split(".").pop()?.toLowerCase();
    const formatMap = {
      mp3: "mp3",
      wav: "wav",
      mp4: "mp4",
      m4a: "mp4",
      webm: "webm",
      ogg: "ogg",
    };
    const mediaFormat = formatMap[ext] || "mp3";

    const command = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: "ja-JP",
      MediaFormat: mediaFormat,
      Media: { MediaFileUri: mediaUri },
      OutputBucketName: process.env.OUTPUT_BUCKET,
      Settings: {
        ShowSpeakerLabels: true,
        MaxSpeakerLabels: 5,
      },
    });

    await transcribe.send(command);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ jobId: jobName, status: "IN_PROGRESS" }),
    };
  } catch (err) {
    console.error("Transcription start error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "文字起こしジョブの開始に失敗しました" }),
    };
  }
};

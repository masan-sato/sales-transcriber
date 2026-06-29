import {
  TranscribeClient,
  GetTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const transcribe = new TranscribeClient({ region: process.env.REGION });
const s3 = new S3Client({ region: process.env.REGION });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

/**
 * S3 オブジェクトのストリームを文字列に変換する
 */
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  try {
    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "jobId は必須です" }),
      };
    }

    // Transcribe ジョブの状態を確認
    const getJobCommand = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobId,
    });
    const jobResult = await transcribe.send(getJobCommand);
    const job = jobResult.TranscriptionJob;
    const jobStatus = job.TranscriptionJobStatus;

    if (jobStatus === "IN_PROGRESS" || jobStatus === "QUEUED") {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ jobId, status: jobStatus }),
      };
    }

    if (jobStatus === "FAILED") {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          jobId,
          status: "FAILED",
          error: job.FailureReason || "不明なエラー",
        }),
      };
    }

    // COMPLETED: S3 から結果を取得
    const outputUri = job.Transcript?.TranscriptFileUri;
    if (!outputUri) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "文字起こし結果URLが取得できませんでした" }),
      };
    }

    // S3 URIからバケット名とキーを抽出
    // 例: https://s3.ap-northeast-1.amazonaws.com/bucket-name/key
    const url = new URL(outputUri);
    const pathParts = url.pathname.slice(1).split("/");
    const bucketName = process.env.OUTPUT_BUCKET;
    const s3Key = pathParts.slice(1).join("/");

    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    const s3Response = await s3.send(getObjectCommand);
    const rawJson = await streamToString(s3Response.Body);
    const transcriptData = JSON.parse(rawJson);

    // テキストと話者ラベルを抽出
    const transcript = transcriptData.results?.transcripts?.[0]?.transcript || "";
    const items = transcriptData.results?.items || [];

    // 話者別に会話を整理
    const speakerSegments = buildSpeakerSegments(items);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        jobId,
        status: "COMPLETED",
        transcript,
        speakerSegments,
      }),
    };
  } catch (err) {
    console.error("Result fetch error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "結果の取得に失敗しました" }),
    };
  }
};

/**
 * items 配列から話者ごとのセグメントを生成する
 */
function buildSpeakerSegments(items) {
  const segments = [];
  let currentSpeaker = null;
  let currentWords = [];

  for (const item of items) {
    if (item.type !== "pronunciation") continue;

    const speaker = item.speaker_label || "spk_0";
    const word = item.alternatives?.[0]?.content || "";

    if (speaker !== currentSpeaker) {
      if (currentSpeaker !== null && currentWords.length > 0) {
        segments.push({ speaker: currentSpeaker, text: currentWords.join(" ") });
      }
      currentSpeaker = speaker;
      currentWords = [word];
    } else {
      currentWords.push(word);
    }
  }

  if (currentSpeaker !== null && currentWords.length > 0) {
    segments.push({ speaker: currentSpeaker, text: currentWords.join(" ") });
  }

  return segments;
}

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({ region: process.env.REGION });

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
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "fileName と contentType は必須です" }),
      };
    }

    // 許可するファイル形式
    const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/ogg"];
    if (!allowedTypes.includes(contentType)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "サポートされていないファイル形式です" }),
      };
    }

    const fileId = randomUUID();
    const ext = fileName.split(".").pop() || "mp3";
    const s3Key = `uploads/${fileId}.${ext}`;

    // 署名付きURL生成（5分間有効）
    const command = new PutObjectCommand({
      Bucket: process.env.AUDIO_BUCKET,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ uploadUrl, s3Key, fileId }),
    };
  } catch (err) {
    console.error("Upload URL generation error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "署名付きURLの生成に失敗しました" }),
    };
  }
};

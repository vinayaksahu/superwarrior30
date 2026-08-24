import "server-only";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, isR2Configured } from "./r2";

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket && process.env.NODE_ENV === "production" && isR2Configured()) {
    throw new Error("Missing R2_BUCKET_NAME environment variable");
  }
  return bucket || "superwarrior30-placeholder";
}

export async function createPresignedUploadUrl({
  key,
  contentType,
  contentLength,
  expiresIn = 300, // 5 minutes
}: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn });
  return { uploadUrl, key };
}

export async function createPresignedDownloadUrl(
  key: string,
  expiresIn = 3600 // 1 hour
) {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(r2, command, { expiresIn });
}

export async function deleteR2Object(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return r2.send(command);
}

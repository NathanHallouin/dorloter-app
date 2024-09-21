import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET!;

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${process.env.S3_PUBLIC_URL}/${key}`;
}

export async function deleteFile(key: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  contentLength?: number
) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Télécharge un objet S3 et renvoie son contenu + Content-Type.
 * Utilisé par les endpoints qui proxient le contenu côté serveur (ex.
 * `/api/v1/uploads/voice/...`) pour exposer des assets sans présigner
 * une URL S3 — pratique quand le bucket dev (MinIO) n'est pas joignable
 * depuis le mobile.
 */
export async function downloadFile(key: string): Promise<{
  body: Uint8Array;
  contentType: string;
}> {
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
  if (!res.Body) {
    throw new Error("Objet introuvable.");
  }
  const bytes = await res.Body.transformToByteArray();
  return {
    body: bytes,
    contentType: res.ContentType ?? "application/octet-stream",
  };
}

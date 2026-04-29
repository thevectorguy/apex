import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import './networkTls.js';
import { getS3Config, isS3Configured } from './myCoachConfig.js';

let s3Client = null;
const PRESIGNED_URL_TTL_SECONDS = 15 * 60;
const MULTIPART_UPLOAD_THRESHOLD_BYTES = 50 * 1024 * 1024;
const MULTIPART_PART_SIZE_BYTES = 8 * 1024 * 1024;

export async function getS3Health() {
  const config = getS3Config();
  if (!isS3Configured()) {
    return {
      configured: false,
      bucket: config.bucket || null,
      region: config.region || null,
    };
  }

  try {
    const client = getS3Client();
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return {
      configured: true,
      connected: true,
      bucket: config.bucket,
      region: config.region,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      bucket: config.bucket,
      region: config.region,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function uploadMyCoachAudioObject({ audioId, customerId, sessionId, filename, mimeType, buffer }) {
  if (!isS3Configured()) {
    throw new Error(
      'AWS S3 is not configured. Set AWS_REGION and AWS_S3_BUCKET_NAME_OUT (or AWS_S3_BUCKET) for My Coach audio uploads.',
    );
  }

  const config = getS3Config();
  const key = buildAudioObjectKey(config.audioPath, customerId, sessionId, audioId, filename);
  const startedAt = Date.now();

  console.log('[my-coach][s3] upload start', {
    audioId,
    customerId,
    sessionId,
    filename,
    mimeType,
    sizeBytes: buffer.length,
    bucket: config.bucket,
    key,
  });

  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          customerid: customerId,
          sessionid: sessionId,
          audioid: audioId,
        },
      }),
    );
    console.log('[my-coach][s3] upload complete', {
      audioId,
      sessionId,
      durationMs: Date.now() - startedAt,
      bucket: config.bucket,
      key,
    });
  } catch (error) {
    console.error('[my-coach][s3] upload failed', {
      audioId,
      sessionId,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  return {
    bucket: config.bucket,
    storageKey: key,
    filePath: `s3://${config.bucket}/${key}`,
    sizeBytes: buffer.length,
  };
}

export async function createDirectAudioUploadTarget({
  audioId,
  customerId,
  sessionId,
  filename,
  mimeType,
  sizeBytes,
}) {
  if (!isS3Configured()) {
    throw new Error(
      'AWS S3 is not configured. Set AWS_REGION and AWS_S3_BUCKET_NAME_OUT (or AWS_S3_BUCKET) for My Coach audio uploads.',
    );
  }

  const config = getS3Config();
  const storageKey = buildAudioObjectKey(config.audioPath, customerId, sessionId, audioId, filename);
  const sharedTarget = {
    audioId,
    bucket: config.bucket,
    storageKey,
    filePath: `s3://${config.bucket}/${storageKey}`,
    fileName: filename,
    mimeType,
    sizeBytes,
  };

  if (Number(sizeBytes) > MULTIPART_UPLOAD_THRESHOLD_BYTES) {
    const multipart = await getS3Client().send(
      new CreateMultipartUploadCommand({
        Bucket: config.bucket,
        Key: storageKey,
        ContentType: mimeType,
        Metadata: {
          customerid: customerId,
          sessionid: sessionId,
          audioid: audioId,
        },
      }),
    );
    const uploadId = String(multipart.UploadId || '');
    if (!uploadId) {
      throw new Error('Could not initialize multipart S3 upload.');
    }

    const partCount = Math.max(1, Math.ceil(Number(sizeBytes) / MULTIPART_PART_SIZE_BYTES));
    const parts = await Promise.all(
      Array.from({ length: partCount }, async (_value, index) => ({
        partNumber: index + 1,
        uploadUrl: await getSignedUrl(
          getS3Client(),
          new UploadPartCommand({
            Bucket: config.bucket,
            Key: storageKey,
            UploadId: uploadId,
            PartNumber: index + 1,
          }),
          { expiresIn: PRESIGNED_URL_TTL_SECONDS },
        ),
      })),
    );

    return {
      ...sharedTarget,
      upload: {
        mode: 'multipart',
        uploadId,
        partSizeBytes: MULTIPART_PART_SIZE_BYTES,
        expiresInSeconds: PRESIGNED_URL_TTL_SECONDS,
        parts,
      },
    };
  }

  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      ContentType: mimeType,
      Metadata: {
        customerid: customerId,
        sessionid: sessionId,
        audioid: audioId,
      },
    }),
    { expiresIn: PRESIGNED_URL_TTL_SECONDS },
  );

  return {
    ...sharedTarget,
    upload: {
      mode: 'single',
      uploadUrl,
      expiresInSeconds: PRESIGNED_URL_TTL_SECONDS,
      headers: {
        'Content-Type': mimeType,
      },
    },
  };
}

export async function completeDirectAudioUpload({ storageKey, upload }) {
  if (!isS3Configured()) {
    throw new Error('AWS S3 is not configured.');
  }

  if (!upload || upload.mode === 'single') {
    return;
  }

  const config = getS3Config();
  const uploadId = String(upload.uploadId || '').trim();
  const parts = Array.isArray(upload.parts)
    ? upload.parts
        .map((part) => ({
          PartNumber: Number(part?.partNumber),
          ETag: String(part?.etag || '').trim(),
        }))
        .filter((part) => Number.isFinite(part.PartNumber) && part.PartNumber > 0 && part.ETag)
        .sort((left, right) => left.PartNumber - right.PartNumber)
    : [];

  if (!uploadId || !parts.length) {
    throw new Error('Multipart upload completion is missing uploadId or part ETags.');
  }

  try {
    await getS3Client().send(
      new CompleteMultipartUploadCommand({
        Bucket: config.bucket,
        Key: storageKey,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      }),
    );
  } catch (error) {
    await getS3Client().send(
      new AbortMultipartUploadCommand({
        Bucket: config.bucket,
        Key: storageKey,
        UploadId: uploadId,
      }),
    ).catch(() => {});
    throw error;
  }
}

export async function createPresignedReadUrl(storageKey) {
  if (!isS3Configured()) {
    throw new Error('AWS S3 is not configured.');
  }

  const config = getS3Config();
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
    }),
    { expiresIn: PRESIGNED_URL_TTL_SECONDS },
  );
}

export async function deleteMyCoachAudioObjects(storageKeys) {
  const keys = [...new Set((storageKeys || []).map((key) => String(key || '').trim()).filter(Boolean))];
  if (!keys.length || !isS3Configured()) return;

  const config = getS3Config();
  const client = getS3Client();

  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: config.bucket,
        Delete: {
          Quiet: true,
          Objects: chunk.map((key) => ({ Key: key })),
        },
      }),
    );
  }
}

function getS3Client() {
  if (!s3Client) {
    const config = getS3Config();
    const credentials =
      config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
          }
        : undefined;

    s3Client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      ...(credentials ? { credentials } : {}),
      ...(config.forcePathStyle ? { forcePathStyle: true } : {}),
    });
  }

  return s3Client;
}

function buildAudioObjectKey(audioPath, customerId, sessionId, audioId, filename) {
  const parts = [audioPath, customerId, sessionId, `${audioId}-${filename}`].filter(Boolean);
  return parts.join('/');
}

import { DeleteObjectsCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import './networkTls.js';
import { getS3Config, isS3Configured } from './myCoachConfig.js';

let s3Client = null;

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
    throw new Error('AWS S3 is not configured. Set AWS_REGION and AWS_S3_BUCKET for My Coach audio uploads.');
  }

  const config = getS3Config();
  const key = `my-coach/${customerId}/${sessionId}/${audioId}-${filename}`;

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

  return {
    bucket: config.bucket,
    storageKey: key,
    filePath: `s3://${config.bucket}/${key}`,
    sizeBytes: buffer.length,
  };
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

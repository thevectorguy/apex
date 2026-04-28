function readOptionalBoolean(name, fallback = false) {
  const value = String(process.env[name] ?? '').trim().toLowerCase();
  if (!value) return fallback;
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function readFirstDefinedEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] ?? '').trim();
    if (value) return value;
  }
  return '';
}

function normalizeS3Prefix(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
}

export function getMongoConfig() {
  return {
    uri: String(process.env.MONGODB_URI || '').trim(),
    dbName: String(process.env.MONGODB_DB_NAME || '').trim(),
  };
}

export function isMongoConfigured() {
  const config = getMongoConfig();
  return Boolean(config.uri && config.dbName);
}

export function getS3Config() {
  return {
    region: readFirstDefinedEnv('AWS_REGION'),
    bucket: readFirstDefinedEnv('AWS_S3_BUCKET_NAME_OUT', 'AWS_S3_BUCKET'),
    accessKeyId: readFirstDefinedEnv('AWS_S3_ACCESS_KEY', 'AWS_ACCESS_KEY_ID'),
    secretAccessKey: readFirstDefinedEnv('AWS_S3_SECRET_KEY', 'AWS_SECRET_ACCESS_KEY'),
    sessionToken: readFirstDefinedEnv('AWS_SESSION_TOKEN'),
    endpoint: readFirstDefinedEnv('AWS_S3_ENDPOINT'),
    audioPath: normalizeS3Prefix(readFirstDefinedEnv('AWS_AUDIO_PATH', 'AWS_S3_AUDIO_PATH')),
    forcePathStyle: readOptionalBoolean('AWS_S3_FORCE_PATH_STYLE', false),
  };
}

export function isS3Configured() {
  const config = getS3Config();
  return Boolean(config.region && config.bucket);
}

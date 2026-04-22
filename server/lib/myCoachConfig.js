function readOptionalBoolean(name, fallback = false) {
  const value = String(process.env[name] ?? '').trim().toLowerCase();
  if (!value) return fallback;
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
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
    region: String(process.env.AWS_REGION || '').trim(),
    bucket: String(process.env.AWS_S3_BUCKET || '').trim(),
    accessKeyId: String(process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY || '').trim(),
    sessionToken: String(process.env.AWS_SESSION_TOKEN || '').trim(),
    endpoint: String(process.env.AWS_S3_ENDPOINT || '').trim(),
    forcePathStyle: readOptionalBoolean('AWS_S3_FORCE_PATH_STYLE', false),
  };
}

export function isS3Configured() {
  const config = getS3Config();
  return Boolean(config.region && config.bucket);
}

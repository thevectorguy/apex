import fs from 'node:fs';
import path from 'node:path';
import { audioRoot, reportRoot, storageRoot, transcriptRoot } from './paths.js';

export function ensureStorageDirs() {
  for (const dir of [storageRoot, audioRoot, reportRoot, transcriptRoot]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function safeFileName(input, fallback = 'asset') {
  const base = String(input || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || fallback;
}

export function writeJsonFile(dir, fileName, value) {
  const fullPath = path.join(dir, fileName);
  fs.writeFileSync(fullPath, JSON.stringify(value, null, 2), 'utf8');
  return fullPath;
}

export function writeBufferFile(dir, fileName, buffer) {
  fs.mkdirSync(dir, { recursive: true });
  const fullPath = path.join(dir, fileName);
  fs.writeFileSync(fullPath, buffer);
  return fullPath;
}

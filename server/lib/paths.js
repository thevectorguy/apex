import path from 'node:path';

export const serverRoot = path.resolve(process.cwd(), 'server');
export const storageRoot = process.env.MY_COACH_STORAGE_PATH
  ? path.resolve(process.cwd(), process.env.MY_COACH_STORAGE_PATH)
  : path.join(serverRoot, 'storage');
export const audioRoot = path.join(storageRoot, 'audio');
export const reportRoot = path.join(storageRoot, 'reports');
export const transcriptRoot = path.join(storageRoot, 'transcripts');
export const dbPath = path.join(storageRoot, 'my-coach.sqlite');

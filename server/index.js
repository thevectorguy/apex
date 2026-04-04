import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getDb } from './lib/db.js';
import { isSupabaseConfigured } from './lib/persistence.js';
import { ensureStorageDirs } from './lib/storage.js';
import { registerMyCoachRoutes } from './routes/myCoach.js';

for (const envPath of ['.env.local', '.env']) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

export function createServer() {
  if (!isSupabaseConfigured()) {
    ensureStorageDirs();
    getDb();
  }

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(corsLite);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'my-coach-backend' });
  });

  registerMyCoachRoutes(app);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : String(err),
    });
  });

  return app;
}

export function startServer(port = Number(process.env.MY_COACH_API_PORT || process.env.PORT || 8787)) {
  const app = createServer();
  return app.listen(port, () => {
    console.log(`[my-coach] listening on http://localhost:${port}`);
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  startServer();
}

function corsLite(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  next();
}

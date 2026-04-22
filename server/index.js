import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getMongoHealth } from './lib/mongo.js';
import { getS3Health } from './lib/s3.js';
import { registerContentRoutes } from './routes/content.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerLeadRoutes } from './routes/leads.js';
import { registerMyCoachRoutes } from './routes/myCoach.js';
import { registerProductAuthorityRoutes } from './routes/productAuthority.js';

for (const envPath of ['.env.local', '.env']) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

export function createServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(corsLite);

  app.get('/api/health', async (_req, res) => {
    const [mongo, s3] = await Promise.all([getMongoHealth(), getS3Health()]);
    res.json({
      ok: true,
      service: 'my-coach-backend',
      storage: {
        mongo,
        s3,
      },
    });
  });

  registerContentRoutes(app);
  registerLeadRoutes(app);
  registerDashboardRoutes(app);
  registerMyCoachRoutes(app);
  registerProductAuthorityRoutes(app);

  app.use((err, _req, res, _next) => {
    console.error(err);
    const statusCode = Number(err?.statusCode) || 500;
    res.status(statusCode).json({
      ok: false,
      error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
      message: err instanceof Error ? err.message : String(err),
      details: err?.details || undefined,
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

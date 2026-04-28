import { getAppBootstrap, getAppMe } from '../lib/appService.js';

export function registerAppRoutes(app) {
  app.get('/api/me', async (_req, res, next) => {
    try {
      res.json({
        ok: true,
        me: await getAppMe(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/bootstrap', async (_req, res, next) => {
    try {
      res.json({
        ok: true,
        bootstrap: await getAppBootstrap(),
      });
    } catch (error) {
      next(error);
    }
  });
}

import { getDashboardHome } from '../lib/dashboardService.js';

export function registerDashboardRoutes(app) {
  app.get('/api/dashboard/home', async (_req, res, next) => {
    try {
      const dashboard = await getDashboardHome();
      res.json({
        ok: true,
        dashboard,
        source: dashboard.source,
      });
    } catch (error) {
      next(error);
    }
  });
}

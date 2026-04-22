import {
  getAnnouncementById,
  getBrochureById,
  getVehicleById,
  listAnnouncements,
  listBrochures,
  listVehicles,
} from '../lib/contentService.js';

export function registerContentRoutes(app) {
  app.get('/api/catalog/vehicles', async (req, res, next) => {
    try {
      const result = await listVehicles(req.query || {});
      res.json({
        ok: true,
        vehicles: result.items,
        total: result.items.length,
        source: result.source,
        notice: result.notice,
        filters: {
          network: normalizeNullable(req.query.network),
          bodyStyle: normalizeNullable(req.query.bodyStyle),
          inventoryStatus: normalizeNullable(req.query.inventoryStatus),
          search: normalizeNullable(req.query.search || req.query.q),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/catalog/vehicles/:vehicleId', async (req, res, next) => {
    try {
      const result = await getVehicleById(req.params.vehicleId);
      if (!result.item) {
        return res.status(404).json({ ok: false, error: 'Vehicle not found' });
      }

      res.json({
        ok: true,
        vehicle: result.item,
        source: result.source,
        notice: result.notice,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/brochures', async (req, res, next) => {
    try {
      const result = await listBrochures(req.query || {});
      res.json({
        ok: true,
        brochures: result.items,
        total: result.items.length,
        source: result.source,
        notice: result.notice,
        filters: {
          theme: normalizeNullable(req.query.theme),
          vehicleId: normalizeNullable(req.query.vehicleId),
          search: normalizeNullable(req.query.search || req.query.q),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/brochures/:brochureId', async (req, res, next) => {
    try {
      const result = await getBrochureById(req.params.brochureId);
      if (!result.item) {
        return res.status(404).json({ ok: false, error: 'Brochure not found' });
      }

      res.json({
        ok: true,
        brochure: result.item,
        source: result.source,
        notice: result.notice,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/communications/announcements', async (req, res, next) => {
    try {
      const result = await listAnnouncements(req.query || {});
      res.json({
        ok: true,
        announcements: result.items,
        total: result.items.length,
        source: result.source,
        notice: result.notice,
        filters: {
          segment: normalizeNullable(req.query.segment),
          search: normalizeNullable(req.query.search || req.query.q),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/communications/announcements/:announcementId', async (req, res, next) => {
    try {
      const result = await getAnnouncementById(req.params.announcementId);
      if (!result.item) {
        return res.status(404).json({ ok: false, error: 'Announcement not found' });
      }

      res.json({
        ok: true,
        announcement: result.item,
        source: result.source,
        notice: result.notice,
      });
    } catch (error) {
      next(error);
    }
  });
}

function normalizeNullable(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

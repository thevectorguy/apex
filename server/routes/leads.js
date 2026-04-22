import { ZodError, z } from 'zod';
import {
  createLead,
  getLeadById,
  listLeads,
  parseBrochureSharePayload,
  parseLeadCreatePayload,
  parseLeadPatchPayload,
  shareBrochure,
  updateLead,
} from '../lib/leadsService.js';

const listLeadsQuerySchema = z.object({
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  vehicleId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export function registerLeadRoutes(app) {
  app.get('/api/leads', async (req, res, next) => {
    try {
      const query = listLeadsQuerySchema.parse(req.query || {});
      const result = await listLeads(query);
      res.json({
        ok: true,
        leads: result.items,
        total: result.total,
        filters: result.filters,
        source: result.source,
      });
    } catch (error) {
      next(normalizeRouteError(error));
    }
  });

  app.post('/api/leads', async (req, res, next) => {
    try {
      const payload = parseLeadCreatePayload(req.body || {});
      const lead = await createLead(payload);
      res.status(201).json({
        ok: true,
        lead,
        source: lead.source || null,
      });
    } catch (error) {
      next(normalizeRouteError(error));
    }
  });

  app.get('/api/leads/:leadId', async (req, res, next) => {
    try {
      const lead = await getLeadById(req.params.leadId);
      if (!lead) {
        res.status(404).json({ ok: false, error: 'Lead not found' });
        return;
      }

      res.json({
        ok: true,
        lead,
        source: lead.source || null,
      });
    } catch (error) {
      next(normalizeRouteError(error));
    }
  });

  app.patch('/api/leads/:leadId', async (req, res, next) => {
    try {
      const payload = parseLeadPatchPayload(req.body || {});
      const lead = await updateLead(req.params.leadId, payload);
      if (!lead) {
        res.status(404).json({ ok: false, error: 'Lead not found' });
        return;
      }

      res.json({
        ok: true,
        lead,
        source: lead.source || null,
      });
    } catch (error) {
      next(normalizeRouteError(error));
    }
  });

  app.post('/api/brochures/share', async (req, res, next) => {
    try {
      const payload = parseBrochureSharePayload(req.body || {});
      const result = await shareBrochure(payload);
      res.status(201).json({
        ok: true,
        lead: result.lead,
        handoff: result.handoff,
        source: result.source || result.lead.source || null,
      });
    } catch (error) {
      const normalized = normalizeRouteError(error);
      if (normalized.statusCode === 404) {
        res.status(404).json({ ok: false, error: normalized.message || 'Brochure not found' });
        return;
      }
      next(normalized);
    }
  });
}

function normalizeRouteError(error) {
  if (error instanceof ZodError) {
    const wrapped = new Error(error.issues.map((issue) => issue.message).join('; '));
    wrapped.statusCode = 400;
    wrapped.details = error.flatten();
    return wrapped;
  }

  return error;
}

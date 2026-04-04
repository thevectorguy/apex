import app from '../[...path].js';

export const config = {
  runtime: 'nodejs',
};

export default function handler(req, res) {
  // TODO: Consolidate the explicit nested Vercel route files back into one
  // production routing strategy once either vercel.json rewrites or framework-
  // native route handlers are proven stable for /api/my-coach/** paths.
  const url = String(req.url || '');

  if (!url.startsWith('/api/my-coach')) {
    req.url = `/api/my-coach${url.startsWith('/') ? url : `/${url}`}`;
  }

  return app(req, res);
}

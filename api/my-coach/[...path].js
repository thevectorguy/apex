import app from '../[...path].js';

export const config = {
  runtime: 'nodejs',
};

export default function handler(req, res) {
  const url = String(req.url || '');

  if (!url.startsWith('/api/my-coach')) {
    req.url = `/api/my-coach${url.startsWith('/') ? url : `/${url}`}`;
  }

  return app(req, res);
}

import app from '../[...path].js';

export const config = {
  runtime: 'nodejs',
};

export default function handler(req, res) {
  const url = String(req.url || '');

  if (!url.startsWith('/api/product-authority/start')) {
    const queryIndex = url.indexOf('?');
    const query = queryIndex >= 0 ? url.slice(queryIndex) : '';
    req.url = `/api/product-authority/start${query}`;
  }

  return app(req, res);
}

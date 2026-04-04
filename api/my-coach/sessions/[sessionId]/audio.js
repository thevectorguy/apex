import app from '../../../[...path].js';

export const config = {
  runtime: 'nodejs',
};

export default function handler(req, res) {
  return app(req, res);
}

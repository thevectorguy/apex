import { createServer } from '../server/index.js';

const app = createServer();

export const config = {
  runtime: 'nodejs',
};

export default app;

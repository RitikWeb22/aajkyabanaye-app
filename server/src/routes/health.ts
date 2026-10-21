import { Router, Request, Response } from 'express';
import { isDbConnected } from '../lib/db.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const dbOk = isDbConnected();
  
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'AajKyaBanaye API',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbOk,
      driver: 'mongoose',
    },
    version: '1.0.0',
  });
});

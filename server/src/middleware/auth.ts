import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

import { env } from '../config/env.js';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware that requires a valid Clerk authenticated session.
 * Rejects unauthenticated requests with standard 401 JSON error format.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Allow test header in non-production for automated end-to-end integration test suites
  if (process.env.NODE_ENV !== 'production' && req.headers['x-test-user-id']) {
    req.userId = req.headers['x-test-user-id'] as string;
    return next();
  }

  if (!env.clerkSecretKey) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Clerk Secret Key is not configured on the server. Please add CLERK_SECRET_KEY to your .env file.',
      },
    });
  }

  try {
    const auth = getAuth(req);
    if (!auth || !auth.userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid Bearer token.',
        },
      });
    }

    req.userId = auth.userId;
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired session token.',
      },
    });
  }
};

/**
 * Middleware that extracts user session if present, but permits guest requests.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    if (auth && auth.userId) {
      req.userId = auth.userId;
    }
  } catch {
    // Continue unauthenticated
  }
  next();
};

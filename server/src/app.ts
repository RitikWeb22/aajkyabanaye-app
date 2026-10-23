import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { meRouter } from './routes/me.js';
import { webhookRouter } from './routes/webhooks.js';
import { recipesRouter } from './routes/recipes.js';
import { bannersRouter } from './routes/banners.js';
import { searchRouter } from './routes/search.js';
import { aiRouter } from './routes/ai.js';
import { shoppingRouter } from './routes/shopping.js';
import { groceryListsRouter } from './routes/groceryLists.js';
import { mealPlansRouter } from './routes/mealPlans.js';

export const app = express();

// Security & Cross-Origin
app.use(
  cors({
    origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(','),
    credentials: true,
  })
);

// Clerk Authentication Middleware
if (env.clerkSecretKey) {
  app.use(
    clerkMiddleware({
      publishableKey: env.clerkPublishableKey || undefined,
      secretKey: env.clerkSecretKey,
    })
  );
} else {
  console.warn('⚠️  CLERK_SECRET_KEY not set in .env. Protected endpoints will reject unverified requests until added.');
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});
app.use(limiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} ${_res.statusCode} - ${duration}ms`);
  });
  next();
});

// Mount Routes
app.use(healthRouter);
app.use(meRouter);
app.use(webhookRouter);
app.use(recipesRouter);
app.use(bannersRouter);
app.use(searchRouter);
app.use(aiRouter);
app.use(shoppingRouter);
app.use(groceryListsRouter);
app.use(mealPlansRouter);

// Google AdMob verification
app.get('/app-ads.txt', (_req: Request, res: Response) => {
  res.type('text/plain').send('google.com, pub-1416168271239862, DIRECT, f08c47fec0942fa0\n');
});

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to AajKyaBanaye API',
    tagline: "Aaj kya banega? Let's find out!",
    docs: '/health',
  });
});

// Centralized 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
});

// Centralized Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
});

import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load from root .env or local .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URL: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().default('*'),
  RECIPE_PROVIDER_PRIMARY: z.string().default('themealdb'),
  THEMEALDB_API_KEY: z.string().default('1'),
  SPOONACULAR_API_KEY: z.string().optional(),
  AI_PROVIDER: z.string().default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_DAILY_LIMIT_PER_USER: z.string().default('5').transform((v) => parseInt(v, 10)),
  AI_REQUEST_TIMEOUT_MS: z.string().default('20000').transform((v) => parseInt(v, 10)),
  GROCERY_PROVIDER: z.string().default('copy_list'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform((v) => parseInt(v, 10)),
  RATE_LIMIT_MAX: z.string().default('1000').transform((v) => parseInt(v, 10)),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

const rawEnv = parsed.data;

export const env = {
  ...rawEnv,
  mongoUri: rawEnv.MONGODB_URL || rawEnv.MONGODB_URI || '',
  clerkPublishableKey: rawEnv.CLERK_PUBLISHABLE_KEY || rawEnv.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || rawEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  clerkSecretKey: rawEnv.CLERK_SECRET_KEY || '',
  clerkWebhookSecret: rawEnv.CLERK_WEBHOOK_SECRET || '',
  aiApiKey: rawEnv.GEMINI_API_KEY || rawEnv.AI_API_KEY || '',
  aiModel: rawEnv.GEMINI_MODEL || rawEnv.AI_MODEL || 'gemini-3.8-flash',
  cloudinaryCloudName: rawEnv.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: rawEnv.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: rawEnv.CLOUDINARY_API_SECRET || '',
  cloudinaryUrl: rawEnv.CLOUDINARY_URL || '',
};

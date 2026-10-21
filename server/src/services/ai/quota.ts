import { AiUsageModel } from '../../models/AiUsage.js';
import { env } from '../../config/env.js';

export interface QuotaStatus {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  dateKey: string;
}

export function getTodayDateKey(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Check if the user is within their daily AI quota and atomically increment if allowed
 */
export async function checkAndIncrementQuota(userId: string): Promise<QuotaStatus> {
  const dateKey = getTodayDateKey();
  const limit = env.AI_DAILY_LIMIT_PER_USER;

  // 1. First check existing usage for today
  const existing = await AiUsageModel.findOne({ clerkUserId: userId, dateKey });
  const currentCount = existing ? existing.count : 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      used: currentCount,
      limit,
      remaining: 0,
      dateKey,
    };
  }

  // 2. Atomically increment
  const updated = await AiUsageModel.findOneAndUpdate(
    {
      clerkUserId: userId,
      dateKey,
      count: { $lt: limit },
    },
    {
      $inc: { count: 1 },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  if (!updated) {
    // Race condition hit: limit reached concurrently
    return {
      allowed: false,
      used: limit,
      limit,
      remaining: 0,
      dateKey,
    };
  }

  return {
    allowed: true,
    used: updated.count,
    limit,
    remaining: Math.max(0, limit - updated.count),
    dateKey,
  };
}

/**
 * Check current quota without incrementing (for UI display)
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const dateKey = getTodayDateKey();
  const limit = env.AI_DAILY_LIMIT_PER_USER;

  const usage = await AiUsageModel.findOne({ clerkUserId: userId, dateKey });
  const used = usage ? usage.count : 0;

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    dateKey,
  };
}

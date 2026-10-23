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
 * Check if the user is within their daily AI quota and atomically increment if allowed.
 * Handles concurrent initial creation and prevents MongoDB duplicate key errors (E11000).
 */
export async function checkAndIncrementQuota(userId: string): Promise<QuotaStatus> {
  const dateKey = getTodayDateKey();
  const limit = env.AI_DAILY_LIMIT_PER_USER;

  // 1. Ensure record exists atomically without race conditions
  try {
    await AiUsageModel.updateOne(
      { clerkUserId: userId, dateKey },
      { $setOnInsert: { clerkUserId: userId, dateKey, count: 0 } },
      { upsert: true }
    );
  } catch (err: any) {
    // E11000 duplicate key error can occur under simultaneous upserts - safe to ignore
    if (err.code !== 11000) throw err;
  }

  // 2. Atomically increment count ONLY IF current count < limit (without upsert)
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
    }
  );

  if (!updated) {
    // Limit reached or exceeded concurrently
    const current = await AiUsageModel.findOne({ clerkUserId: userId, dateKey });
    const used = current ? current.count : limit;
    return {
      allowed: false,
      used,
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
 * Rollback/refund an incremented quota if AI generation fails (network error, timeout, filter)
 */
export async function rollbackQuota(userId: string): Promise<void> {
  try {
    const dateKey = getTodayDateKey();
    await AiUsageModel.updateOne(
      { clerkUserId: userId, dateKey, count: { $gt: 0 } },
      { $inc: { count: -1 } }
    );
  } catch (err) {
    console.error('Failed to rollback AI quota:', err);
  }
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

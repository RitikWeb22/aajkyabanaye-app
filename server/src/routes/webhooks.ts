import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';
import { UserProfile } from '../models/UserProfile.js';

export const webhookRouter = Router();

interface ClerkUserWebhookEvent {
  data: {
    id: string;
    first_name?: string;
    last_name?: string;
    email_addresses?: Array<{ email_address: string; id: string }>;
    image_url?: string;
    primary_email_address_id?: string;
  };
  type: string;
}

/**
 * POST /webhooks/clerk
 * Handles Svix verified Clerk webhooks for real-time user sync
 */
webhookRouter.post('/webhooks/clerk', async (req: Request, res: Response) => {
  const secret = env.clerkWebhookSecret;

  let event: ClerkUserWebhookEvent;

  if (secret) {
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({
        error: { code: 'INVALID_WEBHOOK_HEADERS', message: 'Missing required Svix headers' },
      });
    }

    try {
      const { Webhook } = await import('svix');
      const wh = new Webhook(secret);
      event = wh.verify(JSON.stringify(req.body), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as unknown as ClerkUserWebhookEvent;
    } catch (err) {
      console.error('Svix signature verification failed:', err);
      return res.status(400).json({
        error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' },
      });
    }
  } else {
    // Development mode fallback
    event = req.body as ClerkUserWebhookEvent;
  }

  const { type, data } = event;
  console.log(`[Clerk Webhook] Received event: ${type} for user: ${data?.id}`);

  try {
    if (type === 'user.created' || type === 'user.updated') {
      const primaryEmail = data.email_addresses?.[0]?.email_address || '';
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();

      await UserProfile.findOneAndUpdate(
        { clerkUserId: data.id },
        {
          $set: {
            displayName: fullName,
            email: primaryEmail,
            avatarUrl: data.image_url || '',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else if (type === 'user.deleted') {
      await UserProfile.deleteOne({ clerkUserId: data.id });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Clerk webhook event:', error);
    res.status(500).json({
      error: { code: 'WEBHOOK_PROCESSING_FAILED', message: 'Error processing webhook' },
    });
  }
});

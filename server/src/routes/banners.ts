import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Banner } from '../models/Banner.js';
import { DEFAULT_BANNERS } from '../config/banners.js';

export const bannersRouter = Router();

/**
 * GET /banners
 * Returns active promotional & discovery banners
 */
bannersRouter.get('/banners', async (_req: Request, res: Response) => {
  try {
    // If MongoDB is connected, query database
    if (mongoose.connection.readyState === 1) {
      try {
        const count = await Banner.countDocuments();
        if (count === 0) {
          // Seed initial banners
          await Banner.insertMany(
            DEFAULT_BANNERS.map((b) => ({
              ...b,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          );
        }

        const now = new Date();
        const banners = await Banner.find({
          isActive: true,
          $and: [
            { $or: [{ activeFrom: { $exists: false } }, { activeFrom: null }, { activeFrom: { $lte: now } }] },
            { $or: [{ activeTo: { $exists: false } }, { activeTo: null }, { activeTo: { $gte: now } }] },
          ],
        })
          .sort({ priority: 1, createdAt: -1 })
          .lean();

        return res.json({
          data: banners.map((b) => {
            const fallbackConfig = DEFAULT_BANNERS.find((d) => d.title === b.title || d.id === String(b._id));
            return {
              id: String(b._id),
              title: b.title,
              subtitle: b.subtitle,
              badgeText: b.badgeText,
              image: b.image || fallbackConfig?.image,
              action: b.action,
              buttonText: b.buttonText || 'Explore Now',
              priority: b.priority,
            };
          }),
        });
      } catch (dbErr) {
        console.warn('Banner DB query warning, falling back to config:', dbErr);
      }
    }

    // Fallback to config if DB is disconnected
    res.json({
      data: DEFAULT_BANNERS.filter((b) => b.isActive),
    });
  } catch (err: any) {
    console.error('Error in GET /banners:', err);
    res.json({
      data: DEFAULT_BANNERS.filter((b) => b.isActive),
    });
  }
});

import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

// Configure Cloudinary if credentials are present
const isConfigured = Boolean(
  env.cloudinaryUrl ||
  (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret)
);

if (isConfigured) {
  if (env.cloudinaryUrl) {
    cloudinary.config({
      cloudinary_url: env.cloudinaryUrl,
      secure: true,
    });
  } else {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true,
    });
  }
}

/**
 * Checks whether Cloudinary credentials have been configured in environment variables.
 */
export function isCloudinaryConfigured(): boolean {
  return isConfigured;
}

/**
 * Uploads a profile picture to Cloudinary.
 * Accepts base64 data URI (data:image/...;base64,...) or remote image URL.
 * Transforms with face detection crop, max 400x400, auto format & quality.
 */
export async function uploadAvatarImage(imageString: string, clerkUserId: string): Promise<string> {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.');
  }

  // Format base64 if raw data was provided without prefix
  let uploadSource = imageString.trim();
  if (!uploadSource.startsWith('data:') && !uploadSource.startsWith('http://') && !uploadSource.startsWith('https://')) {
    uploadSource = `data:image/jpeg;base64,${uploadSource}`;
  }

  const result = await cloudinary.uploader.upload(uploadSource, {
    folder: 'aajkyabanaye/avatars',
    public_id: `avatar_${clerkUserId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`,
    resource_type: 'image',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  return result.secure_url;
}

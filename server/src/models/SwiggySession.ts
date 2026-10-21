import mongoose, { Schema, Document } from 'mongoose';

export interface ISwiggyUserToken extends Document {
  clerkUserId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  tokenType: string;
  expiresAt: Date;
  scope?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SwiggyUserTokenSchema = new Schema<ISwiggyUserToken>(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    encryptedAccessToken: {
      type: String,
      required: true,
    },
    encryptedRefreshToken: {
      type: String,
    },
    tokenType: {
      type: String,
      default: 'Bearer',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    scope: {
      type: String,
      default: 'mcp:tools mcp:resources',
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
);

export const SwiggyUserToken = mongoose.model<ISwiggyUserToken>('SwiggyUserToken', SwiggyUserTokenSchema);

export interface ISwiggyOAuthSession extends Document {
  state: string;
  clerkUserId?: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: Date;
}

const SwiggyOAuthSessionSchema = new Schema<ISwiggyOAuthSession>(
  {
    state: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clerkUserId: {
      type: String,
      index: true,
    },
    codeVerifier: {
      type: String,
      required: true,
    },
    redirectUri: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // MongoDB TTL index: automatically deletes document 10 minutes after creation
    },
  },
  {
    timestamps: false,
    bufferCommands: false,
  }
);

export const SwiggyOAuthSession = mongoose.model<ISwiggyOAuthSession>('SwiggyOAuthSession', SwiggyOAuthSessionSchema);

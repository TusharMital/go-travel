import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { resetRateLimits } from '../src/middlewares/rate-limit.middleware.js';
import { authenticate, authorize, requireVerifiedEmail } from '../src/middlewares/auth.middleware.js';
import { UserRole } from '@travel/shared';
import crypto from 'crypto';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    emailVerificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      const tx = {
        user: { create: vi.fn(), update: vi.fn() },
        partnerAccount: { create: vi.fn() },
        storageProvider: { create: vi.fn() },
        transportProvider: { create: vi.fn() },
        passwordResetToken: { update: vi.fn() },
        refreshToken: { updateMany: vi.fn() },
        emailVerificationToken: { update: vi.fn() },
      };
      return cb(tx);
    }),
  },
}));

// Mock Notifications Adapter
const mockSendNotification = vi.fn().mockResolvedValue({
  notificationId: 'notif-123',
  channel: 'EMAIL',
  status: 'SENT',
  dispatchedAt: new Date(),
});

vi.mock('../src/adapters/notifications/index.js', () => ({
  getNotificationsAdapter: () => ({
    name: 'mock-notifications-adapter',
    send: mockSendNotification,
  }),
}));

describe('Authentication & Users Module', () => {
  const app = createApp();

  // Add dummy test route guarded with RBAC and Email Verification
  app.get('/test-admin', authenticate, authorize(UserRole.ADMIN), (_req, res) => {
    res.json({ message: 'Welcome Admin' });
  });

  app.get('/test-verified-only', authenticate, requireVerifiedEmail, (_req, res) => {
    res.json({ message: 'Email is verified' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  describe('1. Correlation ID Header', () => {
    it('should attach X-Correlation-Id to health check and responses', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBeDefined();
    });

    it('should preserve incoming X-Correlation-Id header', async () => {
      const customId = 'client-trace-12345';
      const res = await request(app)
        .get('/health')
        .set('x-correlation-id', customId);
      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBe(customId);
    });
  });

  describe('2. POST /api/v1/auth/register', () => {
    it('should fail with 400 when body fails schema validation', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });

    it('should fail with 409 if user email already exists', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'existing-id',
        email: 'test@example.com',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          full_name: 'Existing User',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should register a new traveler user successfully and return tokens', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce(null);

      const mockCreatedUser = {
        id: 'new-user-uuid',
        email: 'newuser@example.com',
        full_name: 'New User',
        role: 'traveler',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.$transaction as any).mockResolvedValueOnce(mockCreatedUser);
      (prisma.refreshToken.create as any).mockResolvedValueOnce({});
      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          full_name: 'New User',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('3. POST /api/v1/auth/login & Rate Limiting', () => {
    it('should fail with 401 when user does not exist', async () => {
      (prisma.user.findFirst as any).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should fail with 401 when password does not match', async () => {
      const realHash = await bcrypt.hash('CorrectPassword123!', 10);
      (prisma.user.findFirst as any).mockResolvedValueOnce({
        id: 'u-1',
        email: 'user@example.com',
        password_hash: realHash,
        full_name: 'User One',
        role: 'traveler',
        created_at: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should login successfully with valid credentials', async () => {
      const password = 'CorrectPassword123!';
      const hash = await bcrypt.hash(password, 10);

      (prisma.user.findFirst as any).mockResolvedValueOnce({
        id: 'u-123',
        email: 'user@example.com',
        password_hash: hash,
        full_name: 'User One',
        role: 'traveler',
        created_at: new Date(),
      });

      (prisma.refreshToken.create as any).mockResolvedValueOnce({});
      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.id).toBe('u-123');
    });

    it('should block attempts after 5 failures with 429 TOO_MANY_REQUESTS', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);

      // Attempt 1 to 5
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'spammer@example.com', password: 'bad' });
        expect(res.status).toBe(401);
      }

      // Attempt 6 should hit the rate limiter
      const blockedRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'spammer@example.com', password: 'bad' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });
  });

  describe('4. Token Refresh & Logout', () => {
    it('should reject invalid or expired refresh token with 401', async () => {
      (prisma.refreshToken.findUnique as any).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should rotate refresh token successfully when valid', async () => {
      (prisma.refreshToken.findUnique as any).mockResolvedValueOnce({
        id: 'rt-1',
        user_id: 'u-123',
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
        user: {
          id: 'u-123',
          email: 'user@example.com',
          role: 'traveler',
          deleted_at: null,
        },
      });

      (prisma.refreshToken.update as any).mockResolvedValueOnce({});
      (prisma.refreshToken.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should logout and revoke token', async () => {
      (prisma.refreshToken.findUnique as any).mockResolvedValueOnce({
        id: 'rt-99',
        user_id: 'u-99',
      });
      (prisma.refreshToken.update as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'some-token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out');
    });
  });

  describe('5. Password Reset Flow', () => {
    it('should handle forgot password gracefully even if email not registered', async () => {
      (prisma.user.findFirst as any).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ghost@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should dispatch reset email when user exists', async () => {
      (prisma.user.findFirst as any).mockResolvedValueOnce({
        id: 'u-reset-1',
        email: 'registered@example.com',
      });
      (prisma.passwordResetToken.create as any).mockResolvedValueOnce({});
      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'registered@example.com' });

      expect(res.status).toBe(200);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    it('should fail reset password if token is expired or used', async () => {
      (prisma.passwordResetToken.findUnique as any).mockResolvedValueOnce({
        id: 'prt-1',
        token_hash: 'hash',
        expires_at: new Date(Date.now() - 1000), // expired
        used_at: null,
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'expired-token',
          newPassword: 'BrandNewPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
    });

    it('should successfully reset password, mark token used, and revoke refresh tokens', async () => {
      (prisma.passwordResetToken.findUnique as any).mockResolvedValueOnce({
        id: 'prt-valid',
        user_id: 'u-100',
        expires_at: new Date(Date.now() + 3600000),
        used_at: null,
      });

      (prisma.$transaction as any).mockResolvedValueOnce([{}, {}, {}]);
      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'SuperSecureNewPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password has been reset');
    });
  });

  describe('6. Email Verification Flow', () => {
    it('should fail requesting verification if already verified', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'u-verified',
        email: 'verified@example.com',
        email_verified_at: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-email/request')
        .send({ email: 'verified@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_VERIFIED');
    });

    it('should dispatch verification email for unverified user', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'u-unverified',
        email: 'unverified@example.com',
        email_verified_at: null,
      });
      (prisma.emailVerificationToken.create as any).mockResolvedValueOnce({});
      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/auth/verify-email/request')
        .send({ email: 'unverified@example.com' });

      expect(res.status).toBe(200);
      expect(mockSendNotification).toHaveBeenCalled();
    });

    it('should fail confirming email if token is expired or invalid', async () => {
      (prisma.emailVerificationToken.findUnique as any).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/verify-email/confirm')
        .send({ token: 'bogus-token' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });

    it('should confirm verification and update email_verified_at', async () => {
      (prisma.emailVerificationToken.findUnique as any).mockResolvedValueOnce({
        id: 'evt-1',
        user_id: 'u-verify-now',
        expires_at: new Date(Date.now() + 86400000),
        used_at: null,
      });
      (prisma.$transaction as any).mockResolvedValueOnce([{}, {}]);
      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/auth/verify-email/confirm')
        .send({ token: 'valid-verify-token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verified successfully');
    });
  });

  describe('7. RBAC & Email Verification Middleware Guards', () => {
    it('should forbid traveler role from accessing admin route with 403', async () => {
      const travelerToken = jwt.sign(
        { id: 't-1', email: 'traveler@example.com', role: UserRole.TRAVELER },
        env.JWT_ACCESS_SECRET
      );

      const res = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${travelerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow admin role to access admin route', async () => {
      const adminToken = jwt.sign(
        { id: 'a-1', email: 'admin@platform.com', role: UserRole.ADMIN },
        env.JWT_ACCESS_SECRET
      );

      const res = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Welcome Admin');
    });

    it('should block unverified user on requireVerifiedEmail with 403', async () => {
      const unverifiedToken = jwt.sign(
        { id: 't-unverified', email: 't@example.com', role: UserRole.TRAVELER, email_verified: false },
        env.JWT_ACCESS_SECRET
      );

      const res = await request(app)
        .get('/test-verified-only')
        .set('Authorization', `Bearer ${unverifiedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('should allow verified user on requireVerifiedEmail route', async () => {
      const verifiedToken = jwt.sign(
        { id: 't-verified', email: 't@example.com', role: UserRole.TRAVELER, email_verified: true },
        env.JWT_ACCESS_SECRET
      );

      const res = await request(app)
        .get('/test-verified-only')
        .set('Authorization', `Bearer ${verifiedToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Email is verified');
    });
  });
});

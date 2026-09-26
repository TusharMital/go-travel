import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      const tx = {
        user: { create: vi.fn() },
        partnerAccount: { create: vi.fn() },
        storageProvider: { create: vi.fn() },
        transportProvider: { create: vi.fn() },
      };
      return cb(tx);
    }),
  },
}));

describe('Auth API & Middlewares', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Correlation ID & Standard Headers', () => {
    it('should attach X-Correlation-Id to health check and responses', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(typeof res.headers['x-correlation-id']).toBe('string');
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

  describe('POST /api/v1/auth/register', () => {
    it('should fail with 400 when body is invalid', async () => {
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

    it('should register a new user successfully and return tokens', async () => {
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

  describe('POST /api/v1/auth/login', () => {
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
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid Bearer token with 401 INVALID_TOKEN', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return user profile when valid token provided', async () => {
      const token = jwt.sign(
        { id: 'u-999', email: 'valid@example.com', role: 'traveler' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      (prisma.user.findFirst as any).mockResolvedValueOnce({
        id: 'u-999',
        email: 'valid@example.com',
        full_name: 'Valid Traveler',
        phone: null,
        role: 'traveler',
        email_verified_at: null,
        created_at: new Date(),
        partner_account: null,
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('u-999');
      expect(res.body.email).toBe('valid@example.com');
    });
  });
});

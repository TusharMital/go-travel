import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { resetRateLimits } from '../src/middlewares/rate-limit.middleware.js';
import { env } from '../src/config/env.js';
import jwt from 'jsonwebtoken';

// Mock Prisma client
vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    storageLocation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    storageBooking: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      const tx = {
        storageBooking: { create: vi.fn() },
        auditEvent: { create: vi.fn() },
      };
      return cb(tx);
    }),
  },
}));

describe('4.12 Security Pass Test Suite', () => {
  let app: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    app = createApp();
  });

  // -------------------------------------------------------------
  // 1. Helmet & Security Headers
  // -------------------------------------------------------------
  describe('1. Helmet & HTTP Security Headers', () => {
    it('sets strict security headers on all responses', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);

      // X-Content-Type-Options: nosniff
      expect(res.headers['x-content-type-options']).toBe('nosniff');

      // X-Frame-Options: DENY
      expect(res.headers['x-frame-options']).toBe('DENY');

      // Strict-Transport-Security (HSTS)
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');

      // Content-Security-Policy
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");

      // Referrer-Policy
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

      // Correlation ID is present
      expect(res.headers['x-correlation-id']).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // 2. CORS Locked Origins
  // -------------------------------------------------------------
  describe('2. CORS Origin Whitelisting', () => {
    it('allows requests from known whitelisted frontend origins', async () => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
      ];

      for (const origin of allowedOrigins) {
        const res = await request(app)
          .get('/health')
          .set('Origin', origin);

        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
        expect(res.headers['access-control-allow-credentials']).toBe('true');
      }
    });

    it('rejects cross-origin requests from unauthorized origins with 403 CORS_FORBIDDEN', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-attacker-domain.xyz');

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('CORS_FORBIDDEN');
      expect(res.body.error.message).toContain('not allowed by CORS policy');
    });

    it('allows non-browser requests without an Origin header (e.g. server-to-server, curl)', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('handles CORS preflight OPTIONS requests for allowed origins', async () => {
      const res = await request(app)
        .options('/api/v1/storage/locations')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization,Idempotency-Key');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  // -------------------------------------------------------------
  // 3. Rate Limiting on Auth and Booking Endpoints
  // -------------------------------------------------------------
  describe('3. Rate Limiting', () => {
    it('enforces 5 requests limit on /auth/login and blocks the 6th with HTTP 429', async () => {
      // Mock user not found for credential check
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Perform 5 login attempts
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'rate-limit-test@travel.com',
            password: 'wrong-password-123',
          });

        expect(res.headers['x-ratelimit-limit']).toBe('5');
        expect(res.headers['x-ratelimit-remaining']).toBe(String(5 - i));
        // Status should be 401 (credentials invalid) or 400, not 429
        expect(res.status).not.toBe(429);
      }

      // 6th attempt should be blocked by rate limiter
      const blockedRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'rate-limit-test@travel.com',
          password: 'wrong-password-123',
        });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(blockedRes.body.error.message).toContain('Too many login attempts');
      expect(blockedRes.headers['retry-after']).toBeDefined();
      expect(Number(blockedRes.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('enforces rate limiting on /auth/forgot-password (max 20 per window)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Fire 20 requests
      for (let i = 1; i <= 20; i++) {
        const res = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: 'forgot-test@travel.com' });
        expect(res.status).not.toBe(429);
      }

      // 21st attempt blocked
      const blocked = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'forgot-test@travel.com' });

      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    });

    it('allows bypassing rate limits in tests when x-skip-rate-limit is provided', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      for (let i = 1; i <= 8; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .set('x-skip-rate-limit', 'true')
          .send({
            email: 'bypass-test@travel.com',
            password: 'wrong-password',
          });

        expect(res.status).not.toBe(429);
      }
    });

    it('enforces booking rate limiting on /api/v1/storage/bookings (max 30)', async () => {
      const travelerToken = jwt.sign(
        { id: 'rate-limited-traveler-1', email: 'traveler@test.com', role: 'traveler' },
        env.JWT_ACCESS_SECRET
      );

      // Fire 30 booking requests
      for (let i = 1; i <= 30; i++) {
        const res = await request(app)
          .post('/api/v1/storage/bookings')
          .set('Authorization', `Bearer ${travelerToken}`)
          .set('Idempotency-Key', `idem-rate-test-${i}`)
          .send({
            location_id: 'e6b66a50-61f6-4927-9ec9-92cba564563a',
            bag_count: 1,
            drop_off_at: '2026-10-01T10:00:00.000Z',
            pick_up_at: '2026-10-01T18:00:00.000Z',
          });

        expect(res.status).not.toBe(429);
      }

      // 31st request should be rate limited
      const blockedRes = await request(app)
        .post('/api/v1/storage/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', 'idem-rate-test-31')
        .send({
          location_id: 'e6b66a50-61f6-4927-9ec9-92cba564563a',
          bag_count: 1,
          drop_off_at: '2026-10-01T10:00:00.000Z',
          pick_up_at: '2026-10-01T18:00:00.000Z',
        });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // 4. SQL Injection Protection
  // -------------------------------------------------------------
  describe('4. SQL Injection Protection', () => {
    it('safely handles SQL injection payloads in query parameters without syntax error or data leakage', async () => {
      vi.mocked(prisma.storageLocation.findMany).mockResolvedValue([]);

      const sqlPayloads = [
        "' OR 1=1 --",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "1' OR '1' = '1",
        "admin'--",
      ];

      for (const payload of sqlPayloads) {
        const res = await request(app)
          .get('/api/v1/storage/locations')
          .query({
            lat: 52.52,
            lng: 13.405,
            city: payload,
          });

        // The query succeeds safely (status 200) with Prisma parameterized search
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        // Verify prisma was called with the literal string in parameterized filter, not raw SQL
        expect(prisma.storageLocation.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              city: { equals: payload, mode: 'insensitive' },
            }),
          })
        );
      }
    });

    it('safely treats malicious SQL injection strings in route parameters', async () => {
      vi.mocked(prisma.storageLocation.findUnique).mockResolvedValue(null);

      const maliciousId = "1'; DROP TABLE storage_locations; --";
      const res = await request(app).get(`/api/v1/storage/locations/${encodeURIComponent(maliciousId)}`);

      // Handled safely without executing raw SQL, returns 404
      expect(res.status).toBe(404);
      expect(prisma.storageLocation.findUnique).toHaveBeenCalledWith({
        where: { id: maliciousId },
        include: expect.any(Object),
      });
    });

    it('safely treats SQL injection attempts in request bodies as literal values', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin.injected@test.com',
          password: "password'; DROP TABLE users; --",
        });

      // Handled safely without executing raw SQL, returns 401 invalid credentials
      expect(res.status).toBe(401);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'admin.injected@test.com', deleted_at: null },
      });
    });


  });

  // -------------------------------------------------------------
  // 5. Input Validation (Zod on Every Endpoint)
  // -------------------------------------------------------------
  describe('5. Input Validation via Zod', () => {
    it('rejects registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'validPassword123!',
          full_name: 'Test Traveler',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.path === 'email')).toBe(true);
    });

    it('rejects registration with password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'valid@travel.com',
          password: 'short',
          full_name: 'Test Traveler',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.path === 'password')).toBe(true);
    });

    it('rejects review creation with out-of-bounds rating (> 5)', async () => {
      const travelerToken = jwt.sign(
        { id: 'user-123', email: 'traveler@test.com', role: 'traveler' },
        env.JWT_ACCESS_SECRET
      );

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          bookingId: 'booking-uuid-123',
          rating: 7, // Invalid! Must be 1-5
          comment: 'Outstanding storage service!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.path === 'rating')).toBe(true);
    });

    it('rejects storage booking when drop_off_at is after pick_up_at', async () => {
      const travelerToken = jwt.sign(
        { id: 'user-123', email: 'traveler@test.com', role: 'traveler' },
        env.JWT_ACCESS_SECRET
      );

      const res = await request(app)
        .post('/api/v1/storage/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', 'idem-validation-1')
        .send({
          location_id: 'e6b66a50-61f6-4927-9ec9-92cba564563a',
          bag_count: 2,
          drop_off_at: '2026-10-05T18:00:00.000Z',
          pick_up_at: '2026-10-01T10:00:00.000Z', // Before drop_off!
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.path === 'pick_up_at')).toBe(true);
    });

    it('rejects geolocation search with invalid latitude (> 90)', async () => {
      const res = await request(app)
        .get('/api/v1/storage/locations')
        .query({
          lat: 120.5, // Invalid! Latitude cannot exceed 90
          lng: 13.4,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.path === 'lat')).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 6. Secrets & Environment Configuration Safety
  // -------------------------------------------------------------
  describe('6. Secrets & Environment Configuration', () => {
    it('loads required configuration and secrets with non-empty values', () => {
      expect(env.JWT_ACCESS_SECRET).toBeDefined();
      expect(typeof env.JWT_ACCESS_SECRET).toBe('string');
      expect(env.JWT_ACCESS_SECRET.length).toBeGreaterThanOrEqual(16);

      expect(env.JWT_REFRESH_SECRET).toBeDefined();
      expect(typeof env.JWT_REFRESH_SECRET).toBe('string');
      expect(env.JWT_REFRESH_SECRET.length).toBeGreaterThanOrEqual(16);

      expect(env.DATABASE_URL).toBeDefined();
      expect(env.REDIS_URL).toBeDefined();
      expect(Array.isArray(env.CORS_ALLOWED_ORIGIN_LIST)).toBe(true);
    });
  });
});

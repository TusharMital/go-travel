import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import {
  logger,
  enableLogCapture,
  disableLogCapture,
  getCapturedLogs,
  clearCapturedLogs,
  metricsRegistry,
} from '../src/observability/index.js';
import { resetRateLimits } from '../src/middlewares/rate-limit.middleware.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { StorageBookingStatus } from '@travel/shared';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    auditEvent: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    storageLocation: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    storageBooking: {
      findUnique: vi.fn(),
    },
  },
}));


describe('4.13 Observability Pass Test Suite', () => {
  let app: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    metricsRegistry.reset();
    clearCapturedLogs();
    enableLogCapture();
    app = createApp();
  });

  // -------------------------------------------------------------
  // 1. Structured JSON Logging with Correlation IDs
  // -------------------------------------------------------------
  describe('1. Structured JSON Logging & Correlation IDs', () => {
    it('threads correlation ID through request lifecycle and emits structured JSON logs', async () => {
      const customCorrelationId = 'c1f2e3d4-test-corr-id-999';

      const res = await request(app)
        .get('/health')
        .set('x-correlation-id', customCorrelationId);

      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBe(customCorrelationId);

      // Verify captured structured log
      const logs = getCapturedLogs();
      const completionLog = logs.find((l) => l.path === '/health');

      expect(completionLog).toBeDefined();
      expect(completionLog?.correlationId).toBe(customCorrelationId);
      expect(completionLog?.service).toBe('integrated-travel-platform-api');
      expect(completionLog?.level).toBe('INFO');
      expect(completionLog?.statusCode).toBe(200);
      expect(typeof completionLog?.durationMs).toBe('number');
      expect(completionLog?.timestamp).toBeDefined();
    });

    it('generates a new UUID correlation ID when none is provided in incoming headers', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      const generatedId = res.headers['x-correlation-id'];
      expect(generatedId).toBeDefined();
      expect(generatedId).toMatch(/^[0-9a-f-]{36}$/i);

      const logs = getCapturedLogs();
      const completionLog = logs.find((l) => l.path === '/health');
      expect(completionLog?.correlationId).toBe(generatedId);
    });

    it('logs client errors (4xx) with WARN level and status code', async () => {
      const res = await request(app)
        .get('/api/v1/storage/locations/invalid-route-target-not-found')
        .set('x-correlation-id', 'warn-level-correlation-id');

      expect(res.status).toBe(404);

      const logs = getCapturedLogs();
      const warnLog = logs.find((l) => l.statusCode === 404);

      expect(warnLog).toBeDefined();
      expect(warnLog?.level).toBe('WARN');
      expect(warnLog?.correlationId).toBe('warn-level-correlation-id');
      expect(warnLog?.statusCode).toBe(404);
    });

    it('allows application services to emit contextual structured logs inheriting request correlation ID', () => {
      const testCorrelationId = 'app-service-correlation-id-42';

      logger.runWithContext({ correlationId: testCorrelationId, path: '/checkout' }, () => {
        logger.info('Payment intent initialized', { amount: 45.0, currency: 'USD' });
        logger.error('Failed to communicate with mock provider', new Error('Connection timeout'));
      });

      const logs = getCapturedLogs();
      expect(logs.length).toBeGreaterThanOrEqual(2);

      const infoEntry = logs.find((l) => l.message === 'Payment intent initialized');
      expect(infoEntry).toBeDefined();
      expect(infoEntry?.correlationId).toBe(testCorrelationId);
      expect(infoEntry?.amount).toBe(45.0);

      const errorEntry = logs.find((l) => l.message === 'Failed to communicate with mock provider');
      expect(errorEntry).toBeDefined();
      expect(errorEntry?.correlationId).toBe(testCorrelationId);
      expect(errorEntry?.errorMessage).toBe('Connection timeout');
      expect(errorEntry?.stack).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // 2. Health Endpoint (/health)
  // -------------------------------------------------------------
  describe('2. /health Endpoint', () => {
    it('returns 200 with service health, uptime, memory, and metrics summary', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('integrated-travel-platform-api');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.timestamp).toBeDefined();
      expect(typeof res.body.uptimeSeconds).toBe('number');

      // Checks object
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.database).toBe('up');
      expect(res.body.checks.memory).toBeDefined();
      expect(typeof res.body.checks.memory.heapUsedMB).toBe('number');
      expect(typeof res.body.checks.memory.heapTotalMB).toBe('number');

      // Metrics summary
      expect(res.body.metricsSummary).toBeDefined();
      expect(typeof res.body.metricsSummary.totalRequests).toBe('number');
      expect(typeof res.body.metricsSummary.errorRate).toBe('number');
    });

    it('aliases /api/v1/health to the primary health check', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // -------------------------------------------------------------
  // 3. Request-Duration and Error-Rate Metrics (/metrics)
  // -------------------------------------------------------------
  describe('3. /metrics Endpoint (Prometheus & JSON formats)', () => {
    it('exposes Prometheus text format metrics at /metrics', async () => {
      // Generate some requests to record metrics
      await request(app).get('/health');
      await request(app).get('/non-existent-endpoint'); // 404 error

      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');

      const body = res.text;

      // 1. Total Requests Counter
      expect(body).toContain('# HELP http_requests_total');
      expect(body).toContain('# TYPE http_requests_total counter');
      expect(body).toContain('http_requests_total{');

      // 2. Request Duration Metrics
      expect(body).toContain('# HELP http_request_duration_ms');
      expect(body).toContain('# TYPE http_request_duration_ms summary');
      expect(body).toContain('http_request_duration_ms_count');
      expect(body).toContain('http_request_duration_ms_sum');
      expect(body).toContain('http_request_duration_ms_avg');

      // 3. Duration Histogram
      expect(body).toContain('# HELP http_request_duration_seconds');
      expect(body).toContain('# TYPE http_request_duration_seconds histogram');
      expect(body).toContain('http_request_duration_seconds_bucket{');

      // 4. Error Metrics & Rates
      expect(body).toContain('# HELP http_errors_total');
      expect(body).toContain('# TYPE http_errors_total counter');
      expect(body).toContain('# HELP http_error_rate');
      expect(body).toContain('# TYPE http_error_rate gauge');
      expect(body).toContain('http_error_rate');

      // 5. System metrics
      expect(body).toContain('process_uptime_seconds');
      expect(body).toContain('nodejs_memory_bytes');
    });

    it('exposes JSON format metrics when requested via format=json or Accept header', async () => {
      await request(app).get('/health');

      const res = await request(app)
        .get('/metrics')
        .query({ format: 'json' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');

      expect(res.body.requests).toBeDefined();
      expect(typeof res.body.requests.total).toBe('number');
      expect(typeof res.body.requests.errorRate).toBe('number');

      expect(res.body.duration).toBeDefined();
      expect(typeof res.body.duration.avgMs).toBe('number');
      expect(typeof res.body.duration.count).toBe('number');

      expect(res.body.system).toBeDefined();
      expect(typeof res.body.system.uptimeSeconds).toBe('number');
      expect(typeof res.body.system.memory.heapUsedBytes).toBe('number');
    });

    it('dynamically computes error-rate ratio from recorded client and server errors', async () => {
      // 1 success + 1 error -> error rate should be 0.5 (50%)
      await request(app).get('/health');
      await request(app).get('/invalid-path-for-error-rate');

      const res = await request(app).get('/metrics?format=json');

      expect(res.status).toBe(200);
      expect(res.body.requests.total).toBeGreaterThanOrEqual(2);
      expect(res.body.requests.errors4xx).toBeGreaterThanOrEqual(1);
      expect(res.body.requests.errorRate).toBeGreaterThan(0);
    });

    it('aliases /api/v1/metrics to /metrics', async () => {
      const res = await request(app).get('/api/v1/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
    });
  });

  // -------------------------------------------------------------
  // 4. AuditEvent Queryable by Entity ID for Support Use
  // -------------------------------------------------------------
  describe('4. AuditEvent Queryable by Entity ID', () => {
    it('allows support staff to query complete chronological audit trail by entityId', async () => {
      const supportToken = jwt.sign(
        { id: 'support-agent-001', email: 'agent@support.travel.com', role: 'support' },
        env.JWT_ACCESS_SECRET
      );

      const targetEntityId = 'storage-booking-uuid-777';
      const mockAuditEvents = [
        {
          id: 'audit-1',
          action: 'STORAGE_BOOKING_CREATED',
          entity_type: 'StorageBooking',
          entity_id: targetEntityId,
          actor_user_id: 'traveler-user-1',
          actor: { id: 'traveler-user-1', full_name: 'Jane Doe', email: 'jane@travel.com', role: 'traveler' },
          before_state: null,
          after_state: { status: StorageBookingStatus.CONFIRMED, bag_count: 2 },
          correlation_id: 'corr-step-1',
          created_at: new Date('2026-09-27T08:00:00Z'),
        },
        {
          id: 'audit-2',
          action: 'STORAGE_CHECK_IN',
          entity_type: 'StorageBooking',
          entity_id: targetEntityId,
          actor_user_id: 'partner-staff-1',
          actor: { id: 'partner-staff-1', full_name: 'Locker Staff', email: 'staff@berlinlockers.com', role: 'partner_storage' },
          before_state: { status: StorageBookingStatus.CONFIRMED },
          after_state: { status: StorageBookingStatus.CHECKED_IN },
          correlation_id: 'corr-step-2',
          created_at: new Date('2026-09-27T10:00:00Z'),
        },
      ];

      vi.mocked(prisma.auditEvent.findMany).mockResolvedValue(mockAuditEvents as any);

      // Support calls dedicated endpoint: GET /api/v1/admin/audit-logs/entity/:entityId
      const res = await request(app)
        .get(`/api/v1/admin/audit-logs/entity/${targetEntityId}`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.entityId).toBe(targetEntityId);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.events).toHaveLength(2);

      // Verify event fields
      const firstEvent = res.body.data.events[0];
      expect(firstEvent.action).toBe('STORAGE_BOOKING_CREATED');
      expect(firstEvent.correlationId).toBe('corr-step-1');
      expect(firstEvent.actor.email).toBe('jane@travel.com');

      // Verify prisma was queried by entity_id
      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith({
        where: { entity_id: targetEntityId },
        orderBy: { created_at: 'desc' },
        include: expect.any(Object),
      });
    });

    it('allows admin role to query audit logs by entityId', async () => {
      const adminToken = jwt.sign(
        { id: 'admin-001', email: 'admin@travel.com', role: 'admin' },
        env.JWT_ACCESS_SECRET
      );

      vi.mocked(prisma.auditEvent.findMany).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/admin/audit-logs/entity/partner-account-uuid-999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.entityId).toBe('partner-account-uuid-999');
    });

    it('rejects unauthenticated requests to entity audit log endpoint', async () => {
      const res = await request(app).get('/api/v1/admin/audit-logs/entity/booking-123');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects traveler role from accessing support entity audit logs', async () => {
      const travelerToken = jwt.sign(
        { id: 'traveler-001', email: 'traveler@travel.com', role: 'traveler' },
        env.JWT_ACCESS_SECRET
      );

      const res = await request(app)
        .get('/api/v1/admin/audit-logs/entity/booking-123')
        .set('Authorization', `Bearer ${travelerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('supports entityId filtering via general audit query endpoint (?entityId=...)', async () => {
      const supportToken = jwt.sign(
        { id: 'support-001', email: 'support@travel.com', role: 'support' },
        env.JWT_ACCESS_SECRET
      );

      vi.mocked(prisma.auditEvent.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditEvent.count).mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${supportToken}`)
        .query({ entityId: 'target-entity-abc' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entity_id: { contains: 'target-entity-abc', mode: 'insensitive' },
          }),
        })
      );
    });
  });
});

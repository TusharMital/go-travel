import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { correlationIdMiddleware } from './middlewares/audit.middleware.js';
import { env } from './config/env.js';
import { AppError, errorHandler } from './middlewares/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { tripsRouter } from './modules/trips/trips.routes.js';
import { locationRouter } from './modules/location/location.routes.js';
import { storageRouter } from './modules/storage/storage.routes.js';
import { transportRouter } from './modules/transport/transport.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { partnersRouter } from './modules/partners/partners.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { reviewsRouter } from './modules/reviews/reviews.routes.js';
import { initBookingOrchestrator } from './modules/orchestration/booking-orchestrator.js';
import { initNotificationOrchestrator } from './modules/notifications/notification-orchestrator.js';
import { pickupReminderScheduler } from './modules/notifications/pickup-reminder.scheduler.js';
import { prisma } from './prisma.js';
import {
  metricsMiddleware,
  metricsRegistry,
  requestLoggingMiddleware,
} from './observability/index.js';

export function createApp(): Application {

  // Initialize domain event orchestrators
  initBookingOrchestrator();
  initNotificationOrchestrator();

  if (process.env.NODE_ENV !== 'test') {
    pickupReminderScheduler.startScheduler();
  }

  const app = express();

  // 1. Strict Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...env.CORS_ALLOWED_ORIGIN_LIST],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
      noSniff: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    })
  );

  // 2. Locked CORS Configuration
  const allowedOrigins = new Set(env.CORS_ALLOWED_ORIGIN_LIST);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests without Origin header (curl, Postman, server-to-server, non-browser)
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        return callback(
          new AppError(`Origin '${origin}' is not allowed by CORS policy.`, 403, 'CORS_FORBIDDEN')
        );
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Idempotency-Key',
        'x-correlation-id',
        'x-skip-rate-limit',
      ],
      exposedHeaders: [
        'x-correlation-id',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Retry-After',
      ],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Observability: Prometheus Request-Duration/Error Metrics, Correlation ID, and Structured JSON Logging
  app.use(metricsMiddleware);
  app.use(correlationIdMiddleware);
  app.use(requestLoggingMiddleware);

  // Health check endpoint (checks service, dependencies, memory, and metrics summary)
  const handleHealth = async (_req: Request, res: Response) => {
    let dbStatus = 'up';
    try {
      if (process.env.NODE_ENV !== 'test') {
        await prisma.$queryRaw`SELECT 1`;
      }
    } catch {
      dbStatus = 'down';
    }

    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());
    const overallStatus = dbStatus === 'up' ? 'ok' : 'degraded';
    const statusCode = overallStatus === 'ok' ? 200 : 503;

    res.status(statusCode).json({
      status: overallStatus,
      service: 'integrated-travel-platform-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      checks: {
        database: dbStatus,
        memory: {
          heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
          rssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        },
      },
      metricsSummary: metricsRegistry.getSummary(),
    });
  };

  app.get('/health', handleHealth);

  // Prometheus Metrics endpoint (exposes request-duration, error-rate, and counts in Prometheus format or JSON)
  const handleMetrics = (req: Request, res: Response) => {
    const format = req.query.format as string;
    if (format === 'json' || req.headers.accept?.includes('application/json')) {
      res.setHeader('Content-Type', 'application/json');
      res.json(metricsRegistry.getJsonMetrics());
      return;
    }

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsRegistry.getPrometheusMetrics());
  };

  app.get('/metrics', handleMetrics);

  // Base API v1 Routes
  const apiV1Router = express.Router();
  apiV1Router.get('/health', handleHealth);
  apiV1Router.get('/metrics', handleMetrics);
  apiV1Router.use('/auth', authRouter);
  apiV1Router.use('/trips', tripsRouter);
  apiV1Router.use('/location', locationRouter);
  apiV1Router.use('/storage', storageRouter);
  apiV1Router.use('/transport', transportRouter);
  apiV1Router.use('/payments', paymentsRouter);
  apiV1Router.use('/notifications', notificationsRouter);
  apiV1Router.use('/partners', partnersRouter);
  apiV1Router.use('/admin', adminRouter);
  apiV1Router.use('/reviews', reviewsRouter);

  app.use('/api/v1', apiV1Router);


  // Root route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'Integrated Travel Support Platform API',
      docs: '/api/v1',
      version: '1.0.0',
    });
  });

  // Central error handling
  app.use(errorHandler);

  return app;
}

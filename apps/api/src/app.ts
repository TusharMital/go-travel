import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { correlationIdMiddleware } from './middlewares/audit.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { tripsRouter } from './modules/trips/trips.routes.js';
import { locationRouter } from './modules/location/location.routes.js';
import { storageRouter } from './modules/storage/storage.routes.js';
import { transportRouter } from './modules/transport/transport.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { partnersRouter } from './modules/partners/partners.routes.js';
import { initBookingOrchestrator } from './modules/orchestration/booking-orchestrator.js';
import { initNotificationOrchestrator } from './modules/notifications/notification-orchestrator.js';
import { pickupReminderScheduler } from './modules/notifications/pickup-reminder.scheduler.js';

export function createApp(): Application {
  // Initialize domain event orchestrators
  initBookingOrchestrator();
  initNotificationOrchestrator();

  if (process.env.NODE_ENV !== 'test') {
    pickupReminderScheduler.startScheduler();
  }

  const app = express();

  // Basic security and parsing
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Attach correlation ID to every incoming request and outgoing response
  app.use(correlationIdMiddleware);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'integrated-travel-platform-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Base API v1 Routes
  const apiV1Router = express.Router();
  apiV1Router.use('/auth', authRouter);
  apiV1Router.use('/trips', tripsRouter);
  apiV1Router.use('/location', locationRouter);
  apiV1Router.use('/storage', storageRouter);
  apiV1Router.use('/transport', transportRouter);
  apiV1Router.use('/payments', paymentsRouter);
  apiV1Router.use('/notifications', notificationsRouter);
  apiV1Router.use('/partners', partnersRouter);

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

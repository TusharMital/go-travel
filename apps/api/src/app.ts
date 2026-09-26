import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { correlationIdMiddleware } from './middlewares/audit.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { tripsRouter } from './modules/trips/trips.routes.js';

export function createApp(): Application {
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

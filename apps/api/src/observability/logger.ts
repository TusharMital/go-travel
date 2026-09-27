import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  method?: string;
  path?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogEntry {
  timestamp: string;
  level: string;
  service: string;
  correlationId: string;
  message: string;
  [key: string]: unknown;
}

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

// Buffer for test environment assertions
const logBuffer: StructuredLogEntry[] = [];
let isCapturing = false;

export function enableLogCapture(): void {
  isCapturing = true;
  logBuffer.length = 0;
}

export function disableLogCapture(): void {
  isCapturing = false;
  logBuffer.length = 0;
}

export function getCapturedLogs(): StructuredLogEntry[] {
  return [...logBuffer];
}

export function clearCapturedLogs(): void {
  logBuffer.length = 0;
}

function formatError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
      ...(err as any).code ? { errorCode: (err as any).code } : {},
      ...(err as any).statusCode ? { statusCode: (err as any).statusCode } : {},
    };
  }
  return { errorMessage: String(err) };
}

function outputLog(level: LogLevel, message: string, meta: Record<string, unknown> = {}): void {
  const store = asyncLocalStorage.getStore();
  const correlationId = (meta.correlationId as string) || store?.correlationId || 'system';

  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    service: 'integrated-travel-platform-api',
    correlationId,
    message,
    ...(store?.userId ? { userId: store.userId } : {}),
    ...(store?.path ? { path: store.path } : {}),
    ...(store?.method ? { method: store.method } : {}),
    ...meta,
  };

  if (isCapturing || process.env.NODE_ENV === 'test') {
    logBuffer.push(entry);
  }

  // Print structured JSON line in production and development (suppress in test unless explicit)
  if (process.env.NODE_ENV !== 'test') {
    const jsonStr = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(`${jsonStr}\n`);
    } else {
      process.stdout.write(`${jsonStr}\n`);
    }
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    outputLog('debug', message, meta);
  },

  info(message: string, meta?: Record<string, unknown>): void {
    outputLog('info', message, meta);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    outputLog('warn', message, meta);
  },

  error(message: string, errorOrMeta?: unknown, meta?: Record<string, unknown>): void {
    let combinedMeta: Record<string, unknown> = { ...meta };
    if (errorOrMeta instanceof Error) {
      combinedMeta = { ...combinedMeta, ...formatError(errorOrMeta) };
    } else if (typeof errorOrMeta === 'object' && errorOrMeta !== null) {
      combinedMeta = { ...combinedMeta, ...(errorOrMeta as Record<string, unknown>) };
    } else if (errorOrMeta !== undefined) {
      combinedMeta.errorMessage = String(errorOrMeta);
    }
    outputLog('error', message, combinedMeta);
  },

  runWithContext<T>(context: LogContext, fn: () => T): T {
    return asyncLocalStorage.run(context, fn);
  },

  getContext(): LogContext | undefined {
    return asyncLocalStorage.getStore();
  },

  getCorrelationId(): string {
    return asyncLocalStorage.getStore()?.correlationId || 'system';
  },
};

/**
 * Express middleware for structured HTTP request/response logging
 * Automatically threads correlation ID and records response time in ms.
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.correlationId || req.headers['x-correlation-id'] || 'unknown') as string;
  const startTime = performance.now();

  const context: LogContext = {
    correlationId,
    method: req.method,
    path: req.originalUrl || req.url,
    userId: (req as any).user?.id,
  };

  logger.runWithContext(context, () => {
    // Intercept finish event to log structured JSON summary
    res.on('finish', () => {
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      const statusCode = res.statusCode;
      const meta = {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode,
        durationMs,
        ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
        userId: (req as any).user?.id || context.userId,
      };

      if (statusCode >= 500) {
        logger.error(`HTTP ${req.method} ${req.originalUrl || req.url} failed with status ${statusCode}`, meta);
      } else if (statusCode >= 400) {
        logger.warn(`HTTP ${req.method} ${req.originalUrl || req.url} client error ${statusCode}`, meta);
      } else {
        logger.info(`HTTP ${req.method} ${req.originalUrl || req.url} completed`, meta);
      }
    });

    next();
  });
}

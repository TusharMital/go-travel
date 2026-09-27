import { Request, Response, NextFunction } from 'express';

export interface RouteMetricKey {
  method: string;
  route: string;
  status: number;
}

export class MetricsRegistry {
  private requestsByRouteStatus = new Map<string, number>();
  private totalRequests = 0;
  private totalErrors4xx = 0;
  private totalErrors5xx = 0;
  private durationSumMs = 0;
  private durationCount = 0;
  private durationMinMs = Number.MAX_VALUE;
  private durationMaxMs = 0;

  // Buckets in seconds for Prometheus histogram: 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s
  private readonly durationBucketsSeconds = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0];
  private bucketCounts = new Map<number, number>();

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.requestsByRouteStatus.clear();
    this.totalRequests = 0;
    this.totalErrors4xx = 0;
    this.totalErrors5xx = 0;
    this.durationSumMs = 0;
    this.durationCount = 0;
    this.durationMinMs = Number.MAX_VALUE;
    this.durationMaxMs = 0;
    this.bucketCounts.clear();
    for (const b of this.durationBucketsSeconds) {
      this.bucketCounts.set(b, 0);
    }
  }

  /**
   * Normalizes URLs to route templates to avoid high-cardinality label explosions
   * e.g. /api/v1/storage/locations/e6b66a50-61f6-4927-9ec9-92cba564563a -> /api/v1/storage/locations/:id
   */
  public normalizeRoute(url: string): string {
    const [pathOnly] = url.split('?');
    return pathOnly
      // Replace UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      // Replace mongo/cuid/hex IDs
      .replace(/\b[0-9a-f]{24}\b/gi, ':id')
      // Replace numeric IDs at path endings or segments
      .replace(/\/\d+(?=\/|$)/g, '/:id');
  }

  /**
   * Record a completed HTTP request
   */
  public recordRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    this.totalRequests += 1;
    this.durationSumMs += durationMs;
    this.durationCount += 1;

    if (durationMs < this.durationMinMs) this.durationMinMs = durationMs;
    if (durationMs > this.durationMaxMs) this.durationMaxMs = durationMs;

    const normalized = this.normalizeRoute(route);
    const key = `${method.toUpperCase()}|${normalized}|${statusCode}`;
    const current = this.requestsByRouteStatus.get(key) || 0;
    this.requestsByRouteStatus.set(key, current + 1);

    if (statusCode >= 400 && statusCode < 500) {
      this.totalErrors4xx += 1;
    } else if (statusCode >= 500) {
      this.totalErrors5xx += 1;
    }

    // Histogram bucket accumulation (duration in seconds)
    const durationSec = durationMs / 1000;
    for (const bucket of this.durationBucketsSeconds) {
      if (durationSec <= bucket) {
        const count = this.bucketCounts.get(bucket) || 0;
        this.bucketCounts.set(bucket, count + 1);
      }
    }
  }

  public getSummary() {
    const avgDurationMs =
      this.durationCount > 0 ? Math.round((this.durationSumMs / this.durationCount) * 100) / 100 : 0;
    const totalErrors = this.totalErrors4xx + this.totalErrors5xx;
    const errorRate =
      this.totalRequests > 0 ? Math.round((totalErrors / this.totalRequests) * 10000) / 10000 : 0;

    return {
      totalRequests: this.totalRequests,
      totalErrors,
      errorRate,
      avgDurationMs,
      minDurationMs: this.durationMinMs === Number.MAX_VALUE ? 0 : this.durationMinMs,
      maxDurationMs: this.durationMaxMs,
    };
  }

  public getJsonMetrics() {
    const summary = this.getSummary();
    const memory = process.memoryUsage();

    return {
      requests: {
        total: this.totalRequests,
        errors4xx: this.totalErrors4xx,
        errors5xx: this.totalErrors5xx,
        totalErrors: summary.totalErrors,
        errorRate: summary.errorRate,
      },
      duration: {
        count: this.durationCount,
        sumMs: Math.round(this.durationSumMs * 100) / 100,
        avgMs: summary.avgDurationMs,
        minMs: summary.minDurationMs,
        maxMs: summary.maxDurationMs,
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          heapUsedBytes: memory.heapUsed,
          heapTotalBytes: memory.heapTotal,
          rssBytes: memory.rss,
        },
      },
      breakdown: Array.from(this.requestsByRouteStatus.entries()).map(([key, count]) => {
        const [method, route, status] = key.split('|');
        return { method, route, status: Number(status), count };
      }),
    };
  }

  public getPrometheusMetrics(): string {
    const lines: string[] = [];
    const summary = this.getSummary();
    const memory = process.memoryUsage();
    const uptimeSec = process.uptime().toFixed(2);

    // 1. Total Requests Counter
    lines.push('# HELP http_requests_total Total number of HTTP requests processed');
    lines.push('# TYPE http_requests_total counter');
    if (this.requestsByRouteStatus.size === 0) {
      lines.push('http_requests_total{method="ALL",route="ALL",status="ALL"} 0');
    } else {
      for (const [key, count] of this.requestsByRouteStatus.entries()) {
        const [method, route, status] = key.split('|');
        lines.push(`http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
      }
    }

    // 2. Request Duration Summary & Histogram
    lines.push('');
    lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
    lines.push('# TYPE http_request_duration_ms summary');
    lines.push(`http_request_duration_ms_sum ${this.durationSumMs.toFixed(2)}`);
    lines.push(`http_request_duration_ms_count ${this.durationCount}`);
    lines.push(`http_request_duration_ms_avg ${summary.avgDurationMs.toFixed(2)}`);

    lines.push('');
    lines.push('# HELP http_request_duration_seconds HTTP request duration histogram');
    lines.push('# TYPE http_request_duration_seconds histogram');
    for (const bucket of this.durationBucketsSeconds) {
      const count = this.bucketCounts.get(bucket) || 0;
      lines.push(`http_request_duration_seconds_bucket{le="${bucket}"} ${count}`);
    }
    lines.push(`http_request_duration_seconds_bucket{le="+Inf"} ${this.durationCount}`);
    lines.push(`http_request_duration_seconds_sum ${(this.durationSumMs / 1000).toFixed(4)}`);
    lines.push(`http_request_duration_seconds_count ${this.durationCount}`);

    // 3. Error Counters & Rates
    lines.push('');
    lines.push('# HELP http_errors_total Total number of HTTP error responses');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total{status_class="4xx"} ${this.totalErrors4xx}`);
    lines.push(`http_errors_total{status_class="5xx"} ${this.totalErrors5xx}`);

    lines.push('');
    lines.push('# HELP http_error_rate Ratio of HTTP errors to total requests');
    lines.push('# TYPE http_error_rate gauge');
    lines.push(`http_error_rate ${summary.errorRate.toFixed(4)}`);

    // 4. Process & Runtime Metrics
    lines.push('');
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${uptimeSec}`);

    lines.push('');
    lines.push('# HELP nodejs_memory_bytes Node.js memory metrics');
    lines.push('# TYPE nodejs_memory_bytes gauge');
    lines.push(`nodejs_memory_bytes{type="heap_used"} ${memory.heapUsed}`);
    lines.push(`nodejs_memory_bytes{type="heap_total"} ${memory.heapTotal}`);
    lines.push(`nodejs_memory_bytes{type="rss"} ${memory.rss}`);

    return lines.join('\n') + '\n';
  }
}

export const metricsRegistry = new MetricsRegistry();

/**
 * Express middleware to record request duration and error metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();

  res.on('finish', () => {
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    metricsRegistry.recordRequest(req.method, route || req.url, res.statusCode, durationMs);
  });

  next();
}

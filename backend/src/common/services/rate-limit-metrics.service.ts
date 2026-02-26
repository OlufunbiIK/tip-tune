import { Injectable, Logger } from '@nestjs/common';

/**
 * Service for tracking rate limit metrics and statistics
 */
@Injectable()
export class RateLimitMetricsService {
  private readonly logger = new Logger(RateLimitMetricsService.name);
  
  // In-memory metrics (consider using Redis or a metrics service in production)
  private metrics = {
    totalRequests: 0,
    rateLimitedRequests: 0,
    byEndpoint: new Map<string, { total: number; limited: number }>(),
    byIp: new Map<string, { total: number; limited: number }>(),
  };

  /**
   * Record a request
   */
  recordRequest(endpoint: string, ip: string, wasLimited: boolean): void {
    this.metrics.totalRequests++;
    
    if (wasLimited) {
      this.metrics.rateLimitedRequests++;
    }

    // Track by endpoint
    const endpointStats = this.metrics.byEndpoint.get(endpoint) || { total: 0, limited: 0 };
    endpointStats.total++;
    if (wasLimited) {
      endpointStats.limited++;
    }
    this.metrics.byEndpoint.set(endpoint, endpointStats);

    // Track by IP
    const ipStats = this.metrics.byIp.get(ip) || { total: 0, limited: 0 };
    ipStats.total++;
    if (wasLimited) {
      ipStats.limited++;
    }
    this.metrics.byIp.set(ip, ipStats);

    // Log if rate limited
    if (wasLimited) {
      this.logger.warn(`Rate limit exceeded - Endpoint: ${endpoint}, IP: ${ip}`);
    }
  }

  /**
   * Get overall metrics
   */
  getMetrics() {
    return {
      total: this.metrics.totalRequests,
      rateLimited: this.metrics.rateLimitedRequests,
      rateLimitedPercentage: this.metrics.totalRequests > 0
        ? ((this.metrics.rateLimitedRequests / this.metrics.totalRequests) * 100).toFixed(2)
        : '0.00',
    };
  }

  /**
   * Get metrics by endpoint
   */
  getEndpointMetrics(endpoint?: string) {
    if (endpoint) {
      const stats = this.metrics.byEndpoint.get(endpoint);
      return stats ? {
        endpoint,
        total: stats.total,
        limited: stats.limited,
        limitedPercentage: ((stats.limited / stats.total) * 100).toFixed(2),
      } : null;
    }

    return Array.from(this.metrics.byEndpoint.entries()).map(([endpoint, stats]) => ({
      endpoint,
      total: stats.total,
      limited: stats.limited,
      limitedPercentage: ((stats.limited / stats.total) * 100).toFixed(2),
    }));
  }

  /**
   * Get top rate-limited IPs
   */
  getTopRateLimitedIps(limit: number = 10) {
    return Array.from(this.metrics.byIp.entries())
      .map(([ip, stats]) => ({
        ip,
        total: stats.total,
        limited: stats.limited,
        limitedPercentage: ((stats.limited / stats.total) * 100).toFixed(2),
      }))
      .sort((a, b) => b.limited - a.limited)
      .slice(0, limit);
  }

  /**
   * Get IPs that are frequently rate limited (potential abusers)
   */
  getSuspiciousIps(threshold: number = 0.5) {
    return Array.from(this.metrics.byIp.entries())
      .filter(([_, stats]) => {
        const percentage = stats.limited / stats.total;
        return percentage >= threshold && stats.total >= 10; // At least 10 requests
      })
      .map(([ip, stats]) => ({
        ip,
        total: stats.total,
        limited: stats.limited,
        limitedPercentage: ((stats.limited / stats.total) * 100).toFixed(2),
      }))
      .sort((a, b) => b.limited - a.limited);
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      rateLimitedRequests: 0,
      byEndpoint: new Map(),
      byIp: new Map(),
    };
    this.logger.log('Rate limit metrics reset');
  }

  /**
   * Get metrics summary for logging
   */
  getMetricsSummary(): string {
    const overall = this.getMetrics();
    const topEndpoints = Array.from(this.metrics.byEndpoint.entries())
      .sort((a, b) => b[1].limited - a[1].limited)
      .slice(0, 5);

    let summary = `Rate Limit Metrics:\n`;
    summary += `  Total Requests: ${overall.total}\n`;
    summary += `  Rate Limited: ${overall.rateLimited} (${overall.rateLimitedPercentage}%)\n`;
    
    if (topEndpoints.length > 0) {
      summary += `  Top Rate Limited Endpoints:\n`;
      topEndpoints.forEach(([endpoint, stats]) => {
        const percentage = ((stats.limited / stats.total) * 100).toFixed(2);
        summary += `    ${endpoint}: ${stats.limited}/${stats.total} (${percentage}%)\n`;
      });
    }

    return summary;
  }

  /**
   * Log metrics summary
   */
  logMetricsSummary(): void {
    this.logger.log(this.getMetricsSummary());
  }
}

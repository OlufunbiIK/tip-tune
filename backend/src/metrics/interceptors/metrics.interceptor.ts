import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrometheusService } from '../services/prometheus.service';
import { LoggingService } from '../services/logging.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly loggingService: LoggingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, route } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = response.statusCode;
          const routePath = route?.path || url;

          // Record Prometheus metrics
          this.prometheusService.httpRequestDuration.observe(
            { method, route: routePath, status_code: statusCode },
            duration,
          );
          this.prometheusService.httpRequestTotal.inc({
            method,
            route: routePath,
            status_code: statusCode,
          });

          // Log request
          this.loggingService.logRequest(method, url, statusCode, duration, request.user?.id);
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const routePath = route?.path || url;
          const statusCode = error.status || 500;

          // Record error metrics
          this.prometheusService.httpRequestErrors.inc({
            method,
            route: routePath,
            error_type: error.name || 'UnknownError',
          });
          this.prometheusService.httpRequestTotal.inc({
            method,
            route: routePath,
            status_code: statusCode,
          });

          // Log error
          this.loggingService.error(
            `Request failed: ${error.message}`,
            error.stack,
            'MetricsInterceptor',
          );
        },
      }),
    );
  }
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiErrorEnvelope } from '../dto/api-error-envelope.dto';
import { v4 as uuidv4 } from 'uuid';

export interface ApiExceptionResponse extends ApiErrorEnvelope {
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isDevelopment: boolean;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate unique error ID for tracking
    const errorId = `err_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorName = 'Internal Server Error';
    let message = 'An unexpected error occurred';
    let details: any = undefined;
    let stack: string | undefined = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorName = HttpStatus[statusCode] || 'Unknown Error';
      const exceptionResponse = exception.getResponse();

      // Handle different response formats from HttpException
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (Array.isArray(exceptionResponse)) {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        // Extract message from standard NestJS exception response
        const resp = exceptionResponse as any;
        message = resp.message || message;
        errorName = resp.error || errorName;
        
        // Include validation errors or additional context
        if (resp.errors) {
          details = resp.errors;
        } else {
          // Remove message and error to avoid duplication in details
          const { message: _, error: __, ...remaining } = resp;
          if (Object.keys(remaining).length > 0) {
            details = remaining;
          }
        }
      }

      // Log stack trace for server errors
      if (statusCode >= 500) {
        stack = exception.stack;
        this.logger.error(
          `HTTP Exception: ${exception.message}`,
          exception.stack,
        );
      } else {
        this.logger.warn(
          `HTTP ${statusCode}: ${message} - ${request.method} ${request.url}`,
        );
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
      errorName = exception.name;
      
      this.logger.error(
        `Unhandled Error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unknown Exception: ${JSON.stringify(exception)}`);
    }

    // Build error envelope
    const errorResponse: ApiExceptionResponse = {
      statusCode,
      error: errorName,
      message,
      errorId,
      timestamp,
      path: request.path,
    };

    // Add details only in development mode
    if (this.isDevelopment) {
      if (details) {
        errorResponse.details = details;
      }
      if (stack) {
        errorResponse.stack = stack;
      }
    }

    // Ensure proper headers are set
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('X-Error-ID', errorId);
    response.setHeader('X-Timestamp', timestamp);

    // Send response
    response.status(statusCode).json(errorResponse);
  }
}

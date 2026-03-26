import { HttpException, HttpStatus } from '@nestjs/common';

export interface ApiErrorOptions {
  message?: string | string[];
  statusCode?: number;
  error?: string;
  details?: any;
  cause?: Error;
}

/**
 * Base exception class for all API errors.
 * All custom exceptions should extend this class.
 */
export class ApiException extends HttpException {
  public readonly details?: any;
  public readonly errorId: string;
  public readonly timestamp: string;

  constructor(
    message: string | string[],
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    options?: ApiErrorOptions,
  ) {
    const response: any = {
      message: message || 'An error occurred',
      error: options?.error || HttpStatus[statusCode] || 'Unknown Error',
    };

    if (options?.details) {
      response.details = options.details;
    }

    super(response, statusCode, {
      cause: options?.cause,
    });

    this.details = options?.details;
    this.errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.timestamp = new Date().toISOString();
  }

  getResponse(): any {
    const response = super.getResponse() as any;
    return {
      ...response,
      details: this.details,
      errorId: this.errorId,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Exception thrown when a resource is not found.
 * HTTP 404 Not Found
 */
export class ResourceNotFoundException extends ApiException {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    super(message, HttpStatus.NOT_FOUND, {
      error: 'Not Found',
      details: { resource, id },
    });
  }
}

/**
 * Exception thrown when request validation fails.
 * HTTP 400 Bad Request
 */
export class ValidationException extends ApiException {
  constructor(
    message: string | string[],
    details?: Record<string, string[]>,
  ) {
    super(message, HttpStatus.BAD_REQUEST, {
      error: 'Bad Request',
      details,
    });
  }
}

/**
 * Exception thrown when authentication fails.
 * HTTP 401 Unauthorized
 */
export class AuthenticationException extends ApiException {
  constructor(message = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED, {
      error: 'Unauthorized',
    });
  }
}

/**
 * Exception thrown when user lacks permission.
 * HTTP 403 Forbidden
 */
export class AuthorizationException extends ApiException {
  constructor(message = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN, {
      error: 'Forbidden',
    });
  }
}

/**
 * Exception thrown when a conflict occurs (e.g., duplicate entry).
 * HTTP 409 Conflict
 */
export class ConflictException extends ApiException {
  constructor(resource: string, field?: string) {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(message, HttpStatus.CONFLICT, {
      error: 'Conflict',
      details: { resource, field },
    });
  }
}

/**
 * Exception thrown when a resource has been deleted.
 * HTTP 410 Gone
 */
export class ResourceGoneException extends ApiException {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID ${id} has been deleted`
      : `${resource} has been deleted`;
    super(message, HttpStatus.GONE, {
      error: 'Gone',
      details: { resource, id },
    });
  }
}

/**
 * Exception thrown when rate limit is exceeded.
 * HTTP 429 Too Many Requests
 */
export class RateLimitException extends ApiException {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, {
      error: 'Too Many Requests',
      details: retryAfter ? { retryAfter } : undefined,
    });
  }
}

/**
 * Exception thrown when an external service fails.
 * HTTP 502 Bad Gateway
 */
export class ExternalServiceException extends ApiException {
  constructor(service: string, message?: string, cause?: Error) {
    super(
      message || `Failed to communicate with ${service}`,
      HttpStatus.BAD_GATEWAY,
      {
        error: 'Bad Gateway',
        details: { service },
        cause,
      },
    );
  }
}

/**
 * Exception thrown when a database operation fails.
 * HTTP 500 Internal Server Error
 */
export class DatabaseException extends ApiException {
  constructor(operation: string, message?: string, cause?: Error) {
    super(
      message || `Database operation '${operation}' failed`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        error: 'Internal Server Error',
        details: { operation },
        cause,
      },
    );
  }
}

/**
 * Exception thrown when file upload/processing fails.
 * HTTP 400 Bad Request or 413 Payload Too Large
 */
export class FileUploadException extends ApiException {
  constructor(
    reason: string,
    filename?: string,
    statusCode: number = HttpStatus.BAD_REQUEST,
  ) {
    let message = `File upload failed: ${reason}`;
    if (filename) {
      message = `File '${filename}': ${reason}`;
    }

    super(message, statusCode, {
      error: HttpStatus[statusCode],
      details: { reason, filename },
    });
  }
}

/**
 * Typed application errors. Throw these from services/controllers and the
 * central error handler turns them into clean JSON responses with the right
 * status code — instead of leaking stack traces to clients.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const BadRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details);

export const NotFound = (message = 'Resource not found') =>
  new AppError(404, 'NOT_FOUND', message);

export const Conflict = (message: string) => new AppError(409, 'CONFLICT', message);

export const ServiceUnavailable = (message: string, details?: unknown) =>
  new AppError(503, 'SERVICE_UNAVAILABLE', message, details);

export const Internal = (message = 'Internal server error', details?: unknown) =>
  new AppError(500, 'INTERNAL', message, details);

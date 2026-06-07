/**
 * Typed application errors. Thrown from services/handlers and converted to a
 * clean JSON response by `handle()` in lib/http.ts.
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
  }
}

export const BadRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details);
export const Unauthorized = (message = 'Authentication required', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);
export const Forbidden = (message: string, code = 'FORBIDDEN', details?: unknown) =>
  new AppError(403, code, message, details);
export const NotFound = (message = 'Resource not found') =>
  new AppError(404, 'NOT_FOUND', message);
export const Conflict = (message: string) => new AppError(409, 'CONFLICT', message);

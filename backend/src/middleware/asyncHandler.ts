import type { NextFunction, Request, Response } from 'express';

/**
 * Wrap an async route handler so rejected promises are forwarded to the
 * central error handler instead of crashing as unhandled rejections.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { BadRequest } from '../lib/errors.js';

type Schemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

/**
 * Validate request parts against zod schemas. On success the parsed (and
 * coerced) values replace the originals, so handlers get typed, clean input.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
      if (schemas.query) {
        // req.query is read-only in Express 5; stash parsed copy instead.
        (req as Request & { validatedQuery?: unknown }).validatedQuery = schemas.query.parse(
          req.query,
        );
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(BadRequest('Validation failed', err.flatten().fieldErrors));
      } else {
        next(err);
      }
    }
  };
}

/** Typed accessor for the parsed query stashed by `validate`. */
export function getQuery<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return (req as Request & { validatedQuery: z.infer<T> }).validatedQuery;
}

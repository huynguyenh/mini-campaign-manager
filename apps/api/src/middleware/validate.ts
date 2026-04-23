import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

type Source = 'body' | 'query' | 'params';

export function validate<Schema extends ZodTypeAny>(schema: Schema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Replace the parsed (coerced, defaulted) payload
    (req as unknown as Record<Source, z.infer<Schema>>)[source] = result.data;
    next();
  };
}

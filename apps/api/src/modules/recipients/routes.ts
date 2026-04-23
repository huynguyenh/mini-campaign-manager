import { Router } from 'express';
import { createRecipientSchema, paginationQuerySchema } from '@mcm/shared';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as service from './service.js';

export const recipientsRouter: Router = Router();

recipientsRouter.use(requireAuth);

recipientsRouter.get(
  '/',
  validate(paginationQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
      const result = await service.list(page, pageSize);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

recipientsRouter.post('/', validate(createRecipientSchema), async (req, res, next) => {
  try {
    const recipient = await service.createOrGet(req.body);
    res.status(201).json(recipient);
  } catch (err) {
    next(err);
  }
});

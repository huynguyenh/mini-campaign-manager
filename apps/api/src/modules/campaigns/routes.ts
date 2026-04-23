import { Router } from 'express';
import {
  createCampaignSchema,
  paginationQuerySchema,
  scheduleCampaignSchema,
  updateCampaignSchema,
} from '@mcm/shared';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as service from './service.js';
import { triggerSend } from './send.js';
import { AppError } from '../../errors/AppError.js';

export const campaignsRouter: Router = Router();

campaignsRouter.use(requireAuth);

campaignsRouter.get(
  '/',
  validate(paginationQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
      const result = await service.list(req.user!.sub, page, pageSize);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

campaignsRouter.post('/', validate(createCampaignSchema), async (req, res, next) => {
  try {
    const campaign = await service.create(req.user!.sub, req.body);
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

campaignsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) throw AppError.notFound('Campaign not found');
    const detail = await service.getDetail(req.user!.sub, id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

campaignsRouter.patch('/:id', validate(updateCampaignSchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) throw AppError.notFound('Campaign not found');
    const campaign = await service.update(req.user!.sub, id, req.body);
    res.json(campaign);
  } catch (err) {
    next(err);
  }
});

campaignsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) throw AppError.notFound('Campaign not found');
    await service.remove(req.user!.sub, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

campaignsRouter.post(
  '/:id/schedule',
  validate(scheduleCampaignSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) throw AppError.notFound('Campaign not found');
      const campaign = await service.schedule(req.user!.sub, id, req.body);
      res.json(campaign);
    } catch (err) {
      next(err);
    }
  },
);

campaignsRouter.get('/:id/stats', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) throw AppError.notFound('Campaign not found');
    const stats = await service.getStats(req.user!.sub, id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

campaignsRouter.post('/:id/send', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) throw AppError.notFound('Campaign not found');
    const campaign = await triggerSend(req.user!.sub, id);
    res.status(202).json(campaign);
  } catch (err) {
    next(err);
  }
});

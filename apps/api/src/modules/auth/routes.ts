import { Router } from 'express';
import { loginSchema, registerSchema } from '@mcm/shared';
import { validate } from '../../middleware/validate.js';
import * as service from './service.js';

export const authRouter: Router = Router();

authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await service.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

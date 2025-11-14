import { Router } from 'express';
import { container } from 'tsyringe';
import { LeadController } from '../controllers';
import { validate, tenantContext } from '../middlewares';
import {
  createLeadSchema,
  updateLeadSchema,
  listLeadsQuerySchema,
  idParamSchema,
  qualifyLeadSchema,
} from '../validators';

/**
 * Lead routes configuration
 * All routes require tenant context middleware
 */
export const createLeadRoutes = (): Router => {
  const router = Router();
  const controller = container.resolve(LeadController);

  // Apply tenant context to all routes
  router.use(tenantContext);

  // POST /leads - Create lead
  router.post(
    '/',
    validate(createLeadSchema, 'body'),
    (req, res) => void controller.create(req, res)
  );

  // GET /leads - List leads
  router.get(
    '/',
    validate(listLeadsQuerySchema, 'query'),
    (req, res) => void controller.list(req, res)
  );

  // GET /leads/:id - Get lead
  router.get(
    '/:id',
    validate(idParamSchema, 'params'),
    (req, res) => void controller.getById(req, res)
  );

  // PUT /leads/:id - Update lead
  router.put(
    '/:id',
    validate(idParamSchema, 'params'),
    validate(updateLeadSchema, 'body'),
    (req, res) => void controller.update(req, res)
  );

  // POST /leads/:id/qualify - Qualify lead
  router.post(
    '/:id/qualify',
    validate(idParamSchema, 'params'),
    validate(qualifyLeadSchema, 'body'),
    (req, res) => void controller.qualify(req, res)
  );

  return router;
};

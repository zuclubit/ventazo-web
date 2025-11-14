import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import {
  CreateLeadUseCase,
  GetLeadUseCase,
  ListLeadsUseCase,
  UpdateLeadUseCase,
  QualifyLeadUseCase,
} from '../../application/use-cases';
import { CreateLeadDTO, UpdateLeadDTO } from '../../application/dtos';
import { FindLeadsQuery } from '../../domain/repositories';

/**
 * Lead Controller
 * Handles HTTP requests for lead operations
 */
@injectable()
export class LeadController {
  constructor(
    private readonly createLeadUseCase: CreateLeadUseCase,
    private readonly getLeadUseCase: GetLeadUseCase,
    private readonly listLeadsUseCase: ListLeadsUseCase,
    private readonly updateLeadUseCase: UpdateLeadUseCase,
    private readonly qualifyLeadUseCase: QualifyLeadUseCase
  ) {}

  /**
   * POST /leads
   * Create a new lead
   */
  async create(req: Request, res: Response): Promise<void> {
    const tenantId = (req as Request & { tenantId: string }).tenantId;

    const dto: CreateLeadDTO = {
      ...req.body,
      tenantId,
    };

    const result = await this.createLeadUseCase.execute(dto);

    if (result.isFailure) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.getValue());
  }

  /**
   * GET /leads/:id
   * Get lead by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const tenantId = (req as Request & { tenantId: string }).tenantId;

    const result = await this.getLeadUseCase.execute(id, tenantId);

    if (result.isFailure) {
      res.status(500).json({ error: result.error });
      return;
    }

    const lead = result.getValue();
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json(lead);
  }

  /**
   * GET /leads
   * List leads with filtering and pagination
   */
  async list(req: Request, res: Response): Promise<void> {
    const tenantId = (req as Request & { tenantId: string }).tenantId;

    const query: FindLeadsQuery = {
      ...req.query,
      tenantId,
    } as FindLeadsQuery;

    const result = await this.listLeadsUseCase.execute(query);

    if (result.isFailure) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.getValue());
  }

  /**
   * PUT /leads/:id
   * Update lead
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const tenantId = (req as Request & { tenantId: string }).tenantId;
    const dto: UpdateLeadDTO = req.body;

    const result = await this.updateLeadUseCase.execute(id, tenantId, dto);

    if (result.isFailure) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.getValue());
  }

  /**
   * POST /leads/:id/qualify
   * Qualify lead
   */
  async qualify(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const tenantId = (req as Request & { tenantId: string }).tenantId;
    const { qualifiedBy } = req.body;

    const result = await this.qualifyLeadUseCase.execute(id, tenantId, qualifiedBy);

    if (result.isFailure) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.getValue());
  }
}

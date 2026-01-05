/**
 * Pipeline Service Tests
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PipelineService } from './pipeline.service';
import {
  StageType,
  PipelineStage,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_PIPELINE_SETTINGS,
} from './types';
import { Result } from '@zuclubit/domain';

// Mock the database pool
const createMockPool = () => ({
  query: vi.fn(),
});

describe('PipelineService', () => {
  let pipelineService: PipelineService;
  let mockPool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockPool = createMockPool();
    pipelineService = new PipelineService(mockPool as never);
  });

  describe('ensureDefaultPipeline', () => {
    it('should return existing default pipeline if one exists', async () => {
      const tenantId = 'tenant-123';
      const existingPipelineId = 'pipeline-123';

      // Mock query for checking existence
      mockPool.query
        .mockResolvedValueOnce(
          Result.ok({ rows: [{ id: existingPipelineId }] })
        )
        // Mock query for getting the pipeline
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: existingPipelineId,
                tenant_id: tenantId,
                name: 'Pipeline Principal',
                description: 'Default pipeline',
                stages: JSON.stringify(DEFAULT_PIPELINE_STAGES.map((s, i) => ({ ...s, id: `stage-${i}` }))),
                transitions: JSON.stringify([]),
                settings: JSON.stringify(DEFAULT_PIPELINE_SETTINGS),
                is_default: true,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        );

      const result = await pipelineService.ensureDefaultPipeline(tenantId);

      expect(result.id).toBe(existingPipelineId);
      expect(result.isDefault).toBe(true);
    });

    it('should create default pipeline if none exists', async () => {
      const tenantId = 'tenant-123';

      // Mock query - no existing pipeline
      mockPool.query
        .mockResolvedValueOnce(Result.ok({ rows: [] }))
        // Mock insert
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: 'new-pipeline-123',
                tenant_id: tenantId,
                name: 'Pipeline Principal',
                description: 'Pipeline de ventas predeterminado',
                stages: JSON.stringify([]),
                transitions: JSON.stringify([]),
                settings: JSON.stringify(DEFAULT_PIPELINE_SETTINGS),
                is_default: true,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        );

      const result = await pipelineService.ensureDefaultPipeline(tenantId);

      expect(result.name).toBe('Pipeline Principal');
      expect(result.isDefault).toBe(true);
    });
  });

  describe('createPipeline', () => {
    it('should create a pipeline with default stages when copyFromDefault is not false', async () => {
      const tenantId = 'tenant-123';

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'new-pipeline-123',
              tenant_id: tenantId,
              name: 'Custom Pipeline',
              description: null,
              stages: JSON.stringify(DEFAULT_PIPELINE_STAGES.map((s, i) => ({ ...s, id: `stage-${i}` }))),
              transitions: JSON.stringify([]),
              settings: JSON.stringify(DEFAULT_PIPELINE_SETTINGS),
              is_default: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })
      );

      const result = await pipelineService.createPipeline({
        tenantId,
        name: 'Custom Pipeline',
      });

      expect(result.name).toBe('Custom Pipeline');
      expect(result.stages.length).toBeGreaterThan(0);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should create a pipeline with custom stages', async () => {
      const tenantId = 'tenant-123';
      const customStages: Omit<PipelineStage, 'id'>[] = [
        { name: 'Nuevo', type: StageType.OPEN, order: 1, isActive: true },
        { name: 'En Proceso', type: StageType.OPEN, order: 2, isActive: true },
        { name: 'Cerrado', type: StageType.WON, order: 3, isActive: true },
      ];

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'new-pipeline-123',
              tenant_id: tenantId,
              name: 'Minimal Pipeline',
              description: 'A minimal pipeline',
              stages: JSON.stringify(customStages.map((s, i) => ({ ...s, id: `stage-${i}` }))),
              transitions: JSON.stringify([]),
              settings: JSON.stringify(DEFAULT_PIPELINE_SETTINGS),
              is_default: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })
      );

      const result = await pipelineService.createPipeline({
        tenantId,
        name: 'Minimal Pipeline',
        description: 'A minimal pipeline',
        stages: customStages,
      });

      expect(result.name).toBe('Minimal Pipeline');
      expect(result.stages.length).toBe(3);
    });
  });

  describe('canTransition', () => {
    it('should return true for valid sequential transition', async () => {
      const stages = [
        { id: 'stage-1', name: 'Nuevo', slug: 'new', type: StageType.OPEN, order: 1 },
        { id: 'stage-2', name: 'Contactado', slug: 'contacted', type: StageType.OPEN, order: 2 },
        { id: 'stage-3', name: 'Ganado', slug: 'won', type: StageType.WON, order: 3 },
      ];

      const transitions = [
        { id: 't-1', fromStageId: 'stage-1', toStageId: 'stage-2', isAllowed: true },
        { id: 't-2', fromStageId: 'stage-2', toStageId: 'stage-3', isAllowed: true },
        { id: 't-3', fromStageId: 'stage-1', toStageId: 'stage-3', isAllowed: true },
      ];

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              stages: JSON.stringify(stages),
              transitions: JSON.stringify(transitions),
              settings: JSON.stringify({ allowSkipStages: false }),
            },
          ],
        })
      );

      const result = await pipelineService.canTransition('pipeline-1', 'new', 'contacted');

      expect(result).toBe(true);
    });

    it('should return false for transition from terminal state', async () => {
      const stages = [
        { id: 'stage-1', name: 'Nuevo', slug: 'new', type: StageType.OPEN, order: 1 },
        { id: 'stage-2', name: 'Ganado', slug: 'won', type: StageType.WON, order: 2 },
      ];

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              stages: JSON.stringify(stages),
              transitions: JSON.stringify([]),
              settings: JSON.stringify({ allowSkipStages: false }),
            },
          ],
        })
      );

      const result = await pipelineService.canTransition('pipeline-1', 'won', 'new');

      expect(result).toBe(false);
    });

    it('should allow any transition when allowSkipStages is true', async () => {
      const stages = [
        { id: 'stage-1', name: 'Nuevo', slug: 'new', type: StageType.OPEN, order: 1 },
        { id: 'stage-2', name: 'Contactado', slug: 'contacted', type: StageType.OPEN, order: 2 },
        { id: 'stage-3', name: 'Calificado', slug: 'qualified', type: StageType.OPEN, order: 3 },
      ];

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              stages: JSON.stringify(stages),
              transitions: JSON.stringify([]),
              settings: JSON.stringify({ allowSkipStages: true }),
            },
          ],
        })
      );

      // Skip directly from 'new' to 'qualified'
      const result = await pipelineService.canTransition('pipeline-1', 'new', 'qualified');

      expect(result).toBe(true);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available stages for transition', async () => {
      const stages = [
        { id: 'stage-1', name: 'Nuevo', slug: 'new', type: StageType.OPEN, order: 1, isActive: true },
        { id: 'stage-2', name: 'Contactado', slug: 'contacted', type: StageType.OPEN, order: 2, isActive: true },
        { id: 'stage-3', name: 'Perdido', slug: 'lost', type: StageType.LOST, order: 3, isActive: true },
      ];

      const transitions = [
        { id: 't-1', fromStageId: 'stage-1', toStageId: 'stage-2', isAllowed: true },
        { id: 't-2', fromStageId: 'stage-1', toStageId: 'stage-3', isAllowed: true },
      ];

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              stages: JSON.stringify(stages),
              transitions: JSON.stringify(transitions),
              settings: JSON.stringify({ allowSkipStages: false }),
            },
          ],
        })
      );

      const result = await pipelineService.getAvailableTransitions('pipeline-1', 'new');

      expect(result.length).toBe(2);
      expect(result.map((s) => s.slug)).toContain('contacted');
      expect(result.map((s) => s.slug)).toContain('lost');
    });

    it('should return empty array for terminal stages', async () => {
      const stages = [
        { id: 'stage-1', name: 'Nuevo', slug: 'new', type: StageType.OPEN, order: 1, isActive: true },
        { id: 'stage-2', name: 'Ganado', slug: 'won', type: StageType.WON, order: 2, isActive: true },
      ];

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              stages: JSON.stringify(stages),
              transitions: JSON.stringify([]),
              settings: JSON.stringify({ allowSkipStages: false }),
            },
          ],
        })
      );

      const result = await pipelineService.getAvailableTransitions('pipeline-1', 'won');

      expect(result.length).toBe(0);
    });
  });

  describe('updatePipeline', () => {
    it('should update pipeline name and description', async () => {
      const tenantId = 'tenant-123';
      const pipelineId = 'pipeline-123';

      // Mock getPipeline
      mockPool.query
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: pipelineId,
                tenant_id: tenantId,
                name: 'Old Name',
                description: 'Old description',
                stages: JSON.stringify([]),
                transitions: JSON.stringify([]),
                settings: JSON.stringify(DEFAULT_PIPELINE_SETTINGS),
                is_default: false,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        )
        // Mock update
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: pipelineId,
                tenant_id: tenantId,
                name: 'New Name',
                description: 'New description',
                stages: JSON.stringify([]),
                transitions: JSON.stringify([]),
                settings: JSON.stringify(DEFAULT_PIPELINE_SETTINGS),
                is_default: false,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        );

      const result = await pipelineService.updatePipeline(pipelineId, tenantId, {
        name: 'New Name',
        description: 'New description',
      });

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New description');
    });

    it('should throw error when pipeline not found', async () => {
      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: [] }));

      await expect(
        pipelineService.updatePipeline('nonexistent', 'tenant-123', { name: 'New Name' })
      ).rejects.toThrow('Pipeline not found');
    });
  });

  describe('deletePipeline', () => {
    it('should throw error when trying to delete default pipeline', async () => {
      const tenantId = 'tenant-123';
      const pipelineId = 'pipeline-123';

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: pipelineId,
              tenant_id: tenantId,
              name: 'Default Pipeline',
              is_default: true,
              is_active: true,
              stages: JSON.stringify([]),
              transitions: JSON.stringify([]),
              settings: JSON.stringify({}),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })
      );

      await expect(pipelineService.deletePipeline(pipelineId, tenantId)).rejects.toThrow(
        'Cannot delete default pipeline'
      );
    });

    it('should throw error when pipeline has leads', async () => {
      const tenantId = 'tenant-123';
      const pipelineId = 'pipeline-123';

      mockPool.query
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: pipelineId,
                tenant_id: tenantId,
                name: 'Custom Pipeline',
                is_default: false,
                is_active: true,
                stages: JSON.stringify([]),
                transitions: JSON.stringify([]),
                settings: JSON.stringify({}),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        )
        // Mock leads count check
        .mockResolvedValueOnce(Result.ok({ rows: [{ count: '5' }] }));

      await expect(pipelineService.deletePipeline(pipelineId, tenantId)).rejects.toThrow(
        'Cannot delete pipeline: 5 leads are using it'
      );
    });
  });

  describe('addStage', () => {
    it('should add a new stage to the pipeline', async () => {
      const tenantId = 'tenant-123';
      const pipelineId = 'pipeline-123';
      const existingStages = [
        { id: 'stage-1', name: 'Nuevo', slug: 'new', type: StageType.OPEN, order: 1 },
      ];

      mockPool.query
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: pipelineId,
                tenant_id: tenantId,
                name: 'Pipeline',
                stages: JSON.stringify(existingStages),
                transitions: JSON.stringify([]),
                settings: JSON.stringify({}),
                is_default: false,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        )
        .mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await pipelineService.addStage(pipelineId, tenantId, {
        name: 'Contactado',
        type: StageType.OPEN,
        order: 2,
        color: '#3B82F6',
      });

      expect(result.name).toBe('Contactado');
      expect(result.type).toBe(StageType.OPEN);
      expect(result.color).toBe('#3B82F6');
      expect(result.id).toBeDefined();
    });

    it('should throw error when pipeline not found', async () => {
      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: [] }));

      await expect(
        pipelineService.addStage('nonexistent', 'tenant-123', {
          name: 'Stage',
          type: StageType.OPEN,
          order: 1,
        })
      ).rejects.toThrow('Pipeline not found');
    });
  });

  describe('removeStage', () => {
    it('should throw error when trying to remove terminal stage', async () => {
      const tenantId = 'tenant-123';
      const pipelineId = 'pipeline-123';
      const stages = [
        { id: 'stage-1', name: 'Nuevo', slug: 'new', type: StageType.OPEN, order: 1 },
        { id: 'stage-2', name: 'Ganado', slug: 'won', type: StageType.WON, order: 2 },
      ];

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: pipelineId,
              tenant_id: tenantId,
              name: 'Pipeline',
              stages: JSON.stringify(stages),
              transitions: JSON.stringify([]),
              settings: JSON.stringify({}),
              is_default: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })
      );

      await expect(pipelineService.removeStage(pipelineId, tenantId, 'stage-2')).rejects.toThrow(
        'Cannot remove terminal stages (won/lost)'
      );
    });

    it('should throw error when stage has leads', async () => {
      const tenantId = 'tenant-123';
      const pipelineId = 'pipeline-123';
      const stages = [
        { id: 'stage-1', name: 'Nuevo', slug: 'new', type: StageType.OPEN, order: 1 },
        { id: 'stage-2', name: 'Contactado', slug: 'contacted', type: StageType.OPEN, order: 2 },
      ];

      mockPool.query
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: pipelineId,
                tenant_id: tenantId,
                name: 'Pipeline',
                stages: JSON.stringify(stages),
                transitions: JSON.stringify([]),
                settings: JSON.stringify({}),
                is_default: false,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        )
        // Mock leads count in stage
        .mockResolvedValueOnce(Result.ok({ rows: [{ count: '3' }] }));

      await expect(pipelineService.removeStage(pipelineId, tenantId, 'stage-2')).rejects.toThrow(
        'Cannot remove stage: 3 leads are in this stage'
      );
    });
  });

  describe('reorderStages', () => {
    it('should reorder stages based on provided order', async () => {
      const tenantId = 'tenant-123';
      const pipelineId = 'pipeline-123';
      const stages = [
        { id: 'stage-1', name: 'Nuevo', slug: 'new', type: StageType.OPEN, order: 1 },
        { id: 'stage-2', name: 'Contactado', slug: 'contacted', type: StageType.OPEN, order: 2 },
        { id: 'stage-3', name: 'Calificado', slug: 'qualified', type: StageType.OPEN, order: 3 },
      ];

      mockPool.query
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: pipelineId,
                tenant_id: tenantId,
                name: 'Pipeline',
                stages: JSON.stringify(stages),
                transitions: JSON.stringify([]),
                settings: JSON.stringify({}),
                is_default: false,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        )
        .mockResolvedValueOnce(Result.ok({ rows: [] }));

      // Reverse order
      await pipelineService.reorderStages(pipelineId, tenantId, ['stage-3', 'stage-2', 'stage-1']);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * Pipeline Service Implementation
 * Manages configurable sales pipelines per tenant
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { v4 as uuidv4 } from 'uuid';
import {
  PipelineConfig,
  PipelineStage,
  StageTransition,
  PipelineSettings,
  CreatePipelineInput,
  UpdatePipelineInput,
  UpsertStageInput,
  IPipelineService,
  StageType,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_PIPELINE_SETTINGS,
} from './types';

/**
 * Pipeline Service
 * Handles pipeline configuration CRUD and transition validation
 */
@injectable()
export class PipelineService implements IPipelineService {
  constructor(
    @inject(DatabasePool) private readonly pool: DatabasePool
  ) {}

  /**
   * Create a new pipeline for a tenant
   */
  async createPipeline(input: CreatePipelineInput): Promise<PipelineConfig> {
    const id = uuidv4();
    const now = new Date();

    // Build stages from input or default
    const stages = input.stages || (input.copyFromDefault !== false ? DEFAULT_PIPELINE_STAGES : []);
    const stagesWithIds: PipelineStage[] = stages.map((stage, index) => ({
      ...stage,
      id: uuidv4(),
      order: stage.order ?? index + 1,
      isActive: stage.isActive ?? true,
    }));

    // Generate default transitions (sequential flow + to terminal states)
    const transitions = this.generateDefaultTransitions(stagesWithIds);

    const settings: PipelineSettings = {
      ...DEFAULT_PIPELINE_SETTINGS,
      ...input.settings,
    };

    const sql = `
      INSERT INTO pipelines (
        id, tenant_id, name, description, stages, transitions,
        settings, is_default, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
    `;

    const values = [
      id,
      input.tenantId,
      input.name,
      input.description || null,
      JSON.stringify(stagesWithIds),
      JSON.stringify(transitions),
      JSON.stringify(settings),
      false, // Not default by creation
      true,
      now,
      now,
    ];

    const result = await this.pool.query(sql, values);

    if (result.isFailure) {
      throw new Error(`Failed to create pipeline: ${result.error}`);
    }

    return this.mapRowToPipeline(result.getValue().rows[0]);
  }

  /**
   * Get a specific pipeline by ID
   */
  async getPipeline(pipelineId: string, tenantId: string): Promise<PipelineConfig | null> {
    const sql = `
      SELECT * FROM pipelines
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await this.pool.query(sql, [pipelineId, tenantId]);

    if (result.isFailure || result.getValue().rows.length === 0) {
      return null;
    }

    return this.mapRowToPipeline(result.getValue().rows[0]);
  }

  /**
   * Get the default pipeline for a tenant
   */
  async getDefaultPipeline(tenantId: string): Promise<PipelineConfig> {
    const sql = `
      SELECT * FROM pipelines
      WHERE tenant_id = $1 AND is_default = true AND is_active = true
      LIMIT 1
    `;

    const result = await this.pool.query(sql, [tenantId]);

    if (result.isFailure || result.getValue().rows.length === 0) {
      // Create default if not exists
      return this.ensureDefaultPipeline(tenantId);
    }

    return this.mapRowToPipeline(result.getValue().rows[0]);
  }

  /**
   * Ensure a default pipeline exists for the tenant
   */
  async ensureDefaultPipeline(tenantId: string): Promise<PipelineConfig> {
    // Check if any pipeline exists
    const existsResult = await this.pool.query(
      'SELECT id FROM pipelines WHERE tenant_id = $1 AND is_default = true LIMIT 1',
      [tenantId]
    );

    if (existsResult.isSuccess && existsResult.getValue().rows.length > 0) {
      const pipeline = await this.getPipeline(existsResult.getValue().rows[0].id, tenantId);
      if (pipeline) return pipeline;
    }

    // Create default pipeline
    const id = uuidv4();
    const now = new Date();

    const stagesWithIds: PipelineStage[] = DEFAULT_PIPELINE_STAGES.map((stage, index) => ({
      ...stage,
      id: uuidv4(),
      order: stage.order ?? index + 1,
      isActive: stage.isActive ?? true,
    }));

    const transitions = this.generateDefaultTransitions(stagesWithIds);

    const sql = `
      INSERT INTO pipelines (
        id, tenant_id, name, description, stages, transitions,
        settings, is_default, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
    `;

    const values = [
      id,
      tenantId,
      'Pipeline Principal',
      'Pipeline de ventas predeterminado',
      JSON.stringify(stagesWithIds),
      JSON.stringify(transitions),
      JSON.stringify(DEFAULT_PIPELINE_SETTINGS),
      true, // Is default
      true,
      now,
      now,
    ];

    const result = await this.pool.query(sql, values);

    if (result.isFailure) {
      throw new Error(`Failed to create default pipeline: ${result.error}`);
    }

    return this.mapRowToPipeline(result.getValue().rows[0]);
  }

  /**
   * Update a pipeline
   */
  async updatePipeline(
    pipelineId: string,
    tenantId: string,
    input: UpdatePipelineInput
  ): Promise<PipelineConfig> {
    const existing = await this.getPipeline(pipelineId, tenantId);
    if (!existing) {
      throw new Error('Pipeline not found');
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }

    if (input.settings !== undefined) {
      const mergedSettings = { ...existing.settings, ...input.settings };
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(mergedSettings));
    }

    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(pipelineId);
    values.push(tenantId);

    const sql = `
      UPDATE pipelines
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(sql, values);

    if (result.isFailure || result.getValue().rows.length === 0) {
      throw new Error('Failed to update pipeline');
    }

    return this.mapRowToPipeline(result.getValue().rows[0]);
  }

  /**
   * Delete a pipeline (cannot delete default)
   */
  async deletePipeline(pipelineId: string, tenantId: string): Promise<void> {
    const existing = await this.getPipeline(pipelineId, tenantId);
    if (!existing) {
      throw new Error('Pipeline not found');
    }

    if (existing.isDefault) {
      throw new Error('Cannot delete default pipeline');
    }

    // Check if any leads use this pipeline
    const leadsResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1 AND pipeline_id = $2',
      [tenantId, pipelineId]
    );

    if (leadsResult.isSuccess) {
      const count = parseInt(leadsResult.getValue().rows[0]?.count || '0', 10);
      if (count > 0) {
        throw new Error(`Cannot delete pipeline: ${count} leads are using it`);
      }
    }

    const deleteResult = await this.pool.query(
      'DELETE FROM pipelines WHERE id = $1 AND tenant_id = $2',
      [pipelineId, tenantId]
    );

    if (deleteResult.isFailure) {
      throw new Error('Failed to delete pipeline');
    }
  }

  /**
   * List all pipelines for a tenant
   */
  async listPipelines(tenantId: string): Promise<PipelineConfig[]> {
    const sql = `
      SELECT * FROM pipelines
      WHERE tenant_id = $1
      ORDER BY is_default DESC, created_at ASC
    `;

    const result = await this.pool.query(sql, [tenantId]);

    if (result.isFailure) {
      return [];
    }

    return result.getValue().rows.map((row: Record<string, unknown>) => this.mapRowToPipeline(row));
  }

  /**
   * Add a stage to a pipeline
   */
  async addStage(
    pipelineId: string,
    tenantId: string,
    stage: UpsertStageInput
  ): Promise<PipelineStage> {
    const pipeline = await this.getPipeline(pipelineId, tenantId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const newStage: PipelineStage = {
      id: uuidv4(),
      name: stage.name,
      slug: stage.slug || this.slugify(stage.name),
      type: stage.type,
      order: stage.order,
      color: stage.color,
      description: stage.description,
      probability: stage.probability,
      autoActions: stage.autoActions,
      isDefault: stage.isDefault,
      isActive: stage.isActive ?? true,
    };

    const updatedStages = [...pipeline.stages, newStage];
    const updatedTransitions = this.generateDefaultTransitions(updatedStages);

    const sql = `
      UPDATE pipelines
      SET stages = $1, transitions = $2, updated_at = $3
      WHERE id = $4 AND tenant_id = $5
    `;

    const result = await this.pool.query(sql, [
      JSON.stringify(updatedStages),
      JSON.stringify(updatedTransitions),
      new Date(),
      pipelineId,
      tenantId,
    ]);

    if (result.isFailure) {
      throw new Error('Failed to add stage');
    }

    return newStage;
  }

  /**
   * Update a stage
   */
  async updateStage(
    pipelineId: string,
    tenantId: string,
    stageId: string,
    updates: Partial<UpsertStageInput>
  ): Promise<PipelineStage> {
    const pipeline = await this.getPipeline(pipelineId, tenantId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const stageIndex = pipeline.stages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      throw new Error('Stage not found');
    }

    const updatedStage: PipelineStage = {
      ...pipeline.stages[stageIndex],
      ...updates,
      slug: updates.slug || (updates.name ? this.slugify(updates.name) : pipeline.stages[stageIndex].slug),
    };

    const updatedStages = [...pipeline.stages];
    updatedStages[stageIndex] = updatedStage;

    const sql = `
      UPDATE pipelines
      SET stages = $1, updated_at = $2
      WHERE id = $3 AND tenant_id = $4
    `;

    const result = await this.pool.query(sql, [
      JSON.stringify(updatedStages),
      new Date(),
      pipelineId,
      tenantId,
    ]);

    if (result.isFailure) {
      throw new Error('Failed to update stage');
    }

    return updatedStage;
  }

  /**
   * Remove a stage
   */
  async removeStage(pipelineId: string, tenantId: string, stageId: string): Promise<void> {
    const pipeline = await this.getPipeline(pipelineId, tenantId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const stage = pipeline.stages.find((s) => s.id === stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }

    // Cannot remove terminal stages
    if (stage.type === StageType.WON || stage.type === StageType.LOST) {
      throw new Error('Cannot remove terminal stages (won/lost)');
    }

    // Check if leads are in this stage
    const leadsResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1 AND status = $2',
      [tenantId, stage.slug]
    );

    if (leadsResult.isSuccess) {
      const count = parseInt(leadsResult.getValue().rows[0]?.count || '0', 10);
      if (count > 0) {
        throw new Error(`Cannot remove stage: ${count} leads are in this stage`);
      }
    }

    const updatedStages = pipeline.stages.filter((s) => s.id !== stageId);
    const updatedTransitions = this.generateDefaultTransitions(updatedStages);

    const sql = `
      UPDATE pipelines
      SET stages = $1, transitions = $2, updated_at = $3
      WHERE id = $4 AND tenant_id = $5
    `;

    const result = await this.pool.query(sql, [
      JSON.stringify(updatedStages),
      JSON.stringify(updatedTransitions),
      new Date(),
      pipelineId,
      tenantId,
    ]);

    if (result.isFailure) {
      throw new Error('Failed to remove stage');
    }
  }

  /**
   * Reorder stages
   */
  async reorderStages(pipelineId: string, tenantId: string, stageIds: string[]): Promise<void> {
    const pipeline = await this.getPipeline(pipelineId, tenantId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const stageMap = new Map(pipeline.stages.map((s) => [s.id, s]));

    const reorderedStages: PipelineStage[] = stageIds
      .map((id, index) => {
        const stage = stageMap.get(id);
        if (!stage) return null;
        return { ...stage, order: index + 1 };
      })
      .filter((s): s is PipelineStage => s !== null);

    // Add any stages not in the list at the end
    const includedIds = new Set(stageIds);
    const remainingStages = pipeline.stages
      .filter((s) => !includedIds.has(s.id))
      .map((s, i) => ({ ...s, order: reorderedStages.length + i + 1 }));

    const allStages = [...reorderedStages, ...remainingStages];
    const updatedTransitions = this.generateDefaultTransitions(allStages);

    const sql = `
      UPDATE pipelines
      SET stages = $1, transitions = $2, updated_at = $3
      WHERE id = $4 AND tenant_id = $5
    `;

    const result = await this.pool.query(sql, [
      JSON.stringify(allStages),
      JSON.stringify(updatedTransitions),
      new Date(),
      pipelineId,
      tenantId,
    ]);

    if (result.isFailure) {
      throw new Error('Failed to reorder stages');
    }
  }

  /**
   * Check if a transition is allowed
   */
  async canTransition(
    pipelineId: string,
    fromStageSlug: string,
    toStageSlug: string
  ): Promise<boolean> {
    const sql = `SELECT stages, transitions, settings FROM pipelines WHERE id = $1`;
    const result = await this.pool.query(sql, [pipelineId]);

    if (result.isFailure || result.getValue().rows.length === 0) {
      return false;
    }

    const row = result.getValue().rows[0];
    const stages: PipelineStage[] = typeof row.stages === 'string'
      ? JSON.parse(row.stages)
      : row.stages;
    const transitions: StageTransition[] = typeof row.transitions === 'string'
      ? JSON.parse(row.transitions)
      : row.transitions;
    const settings: PipelineSettings = typeof row.settings === 'string'
      ? JSON.parse(row.settings)
      : row.settings;

    const fromStage = stages.find((s) => s.slug === fromStageSlug);
    const toStage = stages.find((s) => s.slug === toStageSlug);

    if (!fromStage || !toStage) {
      return false;
    }

    // Cannot transition from terminal states
    if (fromStage.type === StageType.WON || fromStage.type === StageType.LOST) {
      return false;
    }

    // Allow skip stages if enabled
    if (settings.allowSkipStages) {
      return true;
    }

    // Check if explicit transition exists
    const transition = transitions.find(
      (t) => t.fromStageId === fromStage.id && t.toStageId === toStage.id
    );

    return transition?.isAllowed ?? false;
  }

  /**
   * Get available transitions from current stage
   */
  async getAvailableTransitions(
    pipelineId: string,
    currentStageSlug: string
  ): Promise<PipelineStage[]> {
    const sql = `SELECT stages, transitions, settings FROM pipelines WHERE id = $1`;
    const result = await this.pool.query(sql, [pipelineId]);

    if (result.isFailure || result.getValue().rows.length === 0) {
      return [];
    }

    const row = result.getValue().rows[0];
    const stages: PipelineStage[] = typeof row.stages === 'string'
      ? JSON.parse(row.stages)
      : row.stages;
    const transitions: StageTransition[] = typeof row.transitions === 'string'
      ? JSON.parse(row.transitions)
      : row.transitions;
    const settings: PipelineSettings = typeof row.settings === 'string'
      ? JSON.parse(row.settings)
      : row.settings;

    const currentStage = stages.find((s) => s.slug === currentStageSlug);
    if (!currentStage) {
      return [];
    }

    // Terminal stages have no transitions
    if (currentStage.type === StageType.WON || currentStage.type === StageType.LOST) {
      return [];
    }

    // If skip stages is allowed, return all active stages except current
    if (settings.allowSkipStages) {
      return stages.filter((s) => s.id !== currentStage.id && s.isActive);
    }

    // Return stages with allowed transitions
    const allowedTransitions = transitions.filter(
      (t) => t.fromStageId === currentStage.id && t.isAllowed
    );

    const targetStageIds = new Set(allowedTransitions.map((t) => t.toStageId));

    return stages.filter((s) => targetStageIds.has(s.id) && s.isActive);
  }

  /**
   * Get stage by slug
   */
  async getStageBySlug(pipelineId: string, slug: string): Promise<PipelineStage | null> {
    const sql = `SELECT stages FROM pipelines WHERE id = $1`;
    const result = await this.pool.query(sql, [pipelineId]);

    if (result.isFailure || result.getValue().rows.length === 0) {
      return null;
    }

    const stages: PipelineStage[] = typeof result.getValue().rows[0].stages === 'string'
      ? JSON.parse(result.getValue().rows[0].stages)
      : result.getValue().rows[0].stages;

    return stages.find((s) => s.slug === slug) || null;
  }

  /**
   * Generate default transitions for stages
   */
  private generateDefaultTransitions(stages: PipelineStage[]): StageTransition[] {
    const transitions: StageTransition[] = [];

    // Sort by order
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    // Get open stages only
    const openStages = sortedStages.filter((s) => s.type === StageType.OPEN);
    const terminalStages = sortedStages.filter(
      (s) => s.type === StageType.WON || s.type === StageType.LOST || s.type === StageType.DISQUALIFIED
    );

    // Sequential transitions between open stages
    for (let i = 0; i < openStages.length - 1; i++) {
      transitions.push({
        id: uuidv4(),
        fromStageId: openStages[i].id,
        toStageId: openStages[i + 1].id,
        isAllowed: true,
      });
    }

    // Allow transition to terminal stages from any open stage
    for (const openStage of openStages) {
      for (const terminalStage of terminalStages) {
        transitions.push({
          id: uuidv4(),
          fromStageId: openStage.id,
          toStageId: terminalStage.id,
          isAllowed: true,
        });
      }
    }

    return transitions;
  }

  /**
   * Convert string to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Map database row to PipelineConfig
   */
  private mapRowToPipeline(row: Record<string, unknown>): PipelineConfig {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      stages: typeof row.stages === 'string'
        ? JSON.parse(row.stages)
        : row.stages as PipelineStage[],
      transitions: typeof row.transitions === 'string'
        ? JSON.parse(row.transitions)
        : row.transitions as StageTransition[],
      settings: typeof row.settings === 'string'
        ? JSON.parse(row.settings)
        : row.settings as PipelineSettings,
      isDefault: row.is_default as boolean,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

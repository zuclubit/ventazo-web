// ============================================
// FASE 6.2 — AI Actions Engine
// Core engine for executing AI-powered workflow actions
// ============================================

import {
  classifyLead,
  enrichLead,
  generateInsights,
  generateLeadSummary,
  predictConversion,
  predictStageChange,
  scoreLead,
} from '@/lib/ai/engine';
import { logAIOperation, sanitizeInput, validateInput } from '@/lib/ai/security';

import type {
  AIActionParams,
  AIActionResult,
  AISuggestion,
  AIWorkflowAction,
  AIWorkflowAuditEntry,
} from './types';

// ============================================
// Types
// ============================================

interface ExecutionContext {
  tenantId: string;
  userId?: string;
  workflowId?: string;
  executionId?: string;
  entityType: string;
  entityId: string;
  entityData: Record<string, unknown>;
}

interface ActionExecutor {
  execute: (context: ExecutionContext, params: AIActionParams) => Promise<AIActionResult>;
  validate: (params: AIActionParams) => { valid: boolean; errors: string[] };
  requiresApproval: (params: AIActionParams, confidence: number) => boolean;
}

// ============================================
// Audit Log Storage (In-memory for now)
// ============================================

const auditLog: AIWorkflowAuditEntry[] = [];
const MAX_AUDIT_LOG_SIZE = 5000;

export function logAIWorkflowAction(entry: Omit<AIWorkflowAuditEntry, 'id'>): string {
  const id = `ai_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fullEntry: AIWorkflowAuditEntry = { id, ...entry };

  auditLog.push(fullEntry);

  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_LOG_SIZE);
  }

  return id;
}

export function getAIWorkflowAuditLog(filters?: {
  tenantId?: string;
  workflowId?: string;
  action?: AIWorkflowAction;
  entityId?: string;
  status?: string;
  limit?: number;
}): AIWorkflowAuditEntry[] {
  let filtered = [...auditLog];

  if (filters?.tenantId) {
    filtered = filtered.filter(e => e.tenantId === filters.tenantId);
  }
  if (filters?.workflowId) {
    filtered = filtered.filter(e => e.workflowId === filters.workflowId);
  }
  if (filters?.action) {
    filtered = filtered.filter(e => e.action === filters.action);
  }
  if (filters?.entityId) {
    filtered = filtered.filter(e => e.entityId === filters.entityId);
  }
  if (filters?.status) {
    filtered = filtered.filter(e => e.status === filters.status);
  }

  return filtered.slice(-(filters?.limit ?? 100));
}

// ============================================
// Helper Functions
// ============================================

function createExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createResult(
  action: AIWorkflowAction,
  context: ExecutionContext,
  success: boolean,
  data?: Record<string, unknown>,
  error?: { code: string; message: string; retryable: boolean },
  metadata?: Partial<AIActionResult['metadata']>,
  audit?: Partial<AIActionResult['audit']>
): AIActionResult {
  return {
    success,
    action,
    entityType: context.entityType,
    entityId: context.entityId,
    data,
    error,
    metadata: {
      executionId: context.executionId || createExecutionId(),
      workflowId: context.workflowId,
      latencyMs: 0,
      ...metadata,
    },
    audit: {
      decision: success ? 'executed' : 'failed',
      timestamp: new Date().toISOString(),
      ...audit,
    },
  };
}

// ============================================
// Action Executors
// ============================================

const executors: Record<AIWorkflowAction, ActionExecutor> = {
  // AI Create Note
  ai_create_note: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      try {
        // Validate input
        const inputValidation = validateInput(JSON.stringify(context.entityData));
        if (!inputValidation.valid) {
          return createResult('ai_create_note', context, false, undefined, {
            code: 'VALIDATION_ERROR',
            message: inputValidation.reason || 'Input validation failed',
            retryable: false,
          });
        }

        // Generate summary
        const summaryResult = await generateLeadSummary(
          JSON.stringify(context.entityData),
          context.entityId
        );

        if (!summaryResult.success || !summaryResult.data) {
          return createResult('ai_create_note', context, false, undefined, {
            code: 'AI_ERROR',
            message: summaryResult.error?.message || 'Failed to generate summary',
            retryable: summaryResult.error?.retryable ?? true,
          });
        }

        const summary = summaryResult.data;
        const confidence = summary.confidence;

        // Check confidence threshold
        const threshold = params.confidence_threshold ?? 0.7;
        if (confidence < threshold) {
          return createResult('ai_create_note', context, false, undefined, {
            code: 'LOW_CONFIDENCE',
            message: `Confidence ${confidence.toFixed(2)} below threshold ${threshold}`,
            retryable: false,
          }, {
            confidence,
            requiresApproval: true,
          });
        }

        // Build note content
        let noteContent = `## AI-Generated Note\n\n${summary.summary}\n\n`;

        if (params.include_sentiment !== false) {
          noteContent += `**Sentiment:** ${summary.sentiment}\n`;
          noteContent += `**Urgency:** ${summary.urgency}\n\n`;
        }

        if (summary.keyPoints.length > 0) {
          noteContent += `### Key Points\n`;
          summary.keyPoints.forEach(point => {
            noteContent += `- ${point}\n`;
          });
          noteContent += '\n';
        }

        if (params.include_next_actions !== false && summary.nextActions.length > 0) {
          noteContent += `### Recommended Actions\n`;
          summary.nextActions.forEach(action => {
            noteContent += `- **${action.action}** (${action.priority}): ${action.reasoning}\n`;
          });
        }

        noteContent += `\n---\n*Generated by AI with ${(confidence * 100).toFixed(0)}% confidence*`;

        // Log the operation
        logAIOperation({
          tenantId: context.tenantId,
          userId: context.userId || 'system',
          operation: 'ai_create_note',
          provider: summaryResult.metadata.provider,
          model: summaryResult.metadata.model,
          inputTokens: summaryResult.metadata.tokensUsed.prompt,
          outputTokens: summaryResult.metadata.tokensUsed.completion,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        return createResult('ai_create_note', context, true, {
          noteContent,
          noteType: params.note_type || 'summary',
          summary: summary.summary,
          sentiment: summary.sentiment,
          urgency: summary.urgency,
          keyPoints: summary.keyPoints,
          nextActions: summary.nextActions,
        }, undefined, {
          executionId,
          provider: summaryResult.metadata.provider,
          model: summaryResult.metadata.model,
          tokensUsed: summaryResult.metadata.tokensUsed.total,
          latencyMs: Date.now() - startTime,
          confidence,
        }, {
          decision: 'note_created',
          reasoning: `Generated ${params.note_type || 'summary'} note with ${(confidence * 100).toFixed(0)}% confidence`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createResult('ai_create_note', context, false, undefined, {
          code: 'EXECUTION_ERROR',
          message,
          retryable: true,
        });
      }
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.confidence_threshold !== undefined && (params.confidence_threshold < 0 || params.confidence_threshold > 1)) {
        errors.push('Confidence threshold must be between 0 and 1');
      }
      return { valid: errors.length === 0, errors };
    },
    requiresApproval: (params, confidence) => {
      return params.require_approval === true || confidence < (params.confidence_threshold ?? 0.7);
    },
  },

  // AI Classify Lead
  ai_classify_lead: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      try {
        const sanitizedData = sanitizeInput(JSON.stringify(context.entityData));
        const classifyResult = await classifyLead(sanitizedData);

        if (!classifyResult.success || !classifyResult.data) {
          return createResult('ai_classify_lead', context, false, undefined, {
            code: 'AI_ERROR',
            message: classifyResult.error?.message || 'Failed to classify lead',
            retryable: classifyResult.error?.retryable ?? true,
          });
        }

        const classification = classifyResult.data;
        const confidence = classification.confidence;

        const threshold = params.confidence_threshold ?? 0.75;
        if (confidence < threshold) {
          return createResult('ai_classify_lead', context, false, undefined, {
            code: 'LOW_CONFIDENCE',
            message: `Confidence ${confidence.toFixed(2)} below threshold ${threshold}`,
            retryable: false,
          }, { confidence, requiresApproval: true });
        }

        const updates: Record<string, unknown> = {};

        if (params.apply_temperature !== false) {
          const temp = classification.intentLevel === 'high' ? 'hot' :
                       classification.intentLevel === 'medium' ? 'warm' : 'cold';
          updates['temperature'] = temp;
        }

        if (params.update_fields?.includes('industry') || !params.update_fields) {
          updates['industry'] = classification.industry;
        }
        if (params.update_fields?.includes('company_size') || !params.update_fields) {
          updates['company_size'] = classification.companySize;
        }
        if (params.update_fields?.includes('buyer_persona') || !params.update_fields) {
          updates['buyer_persona'] = classification.buyerPersona;
        }
        if (params.update_fields?.includes('intent_level') || !params.update_fields) {
          updates['intent_level'] = classification.intentLevel;
        }

        if (params.apply_tags !== false) {
          updates['tags'] = classification.interests;
        }

        logAIOperation({
          tenantId: context.tenantId,
          userId: context.userId || 'system',
          operation: 'ai_classify_lead',
          provider: classifyResult.metadata.provider,
          model: classifyResult.metadata.model,
          inputTokens: classifyResult.metadata.tokensUsed.prompt,
          outputTokens: classifyResult.metadata.tokensUsed.completion,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        return createResult('ai_classify_lead', context, true, {
          classification,
          updates,
          primaryLabel: classification.primaryLabel,
        }, undefined, {
          executionId,
          provider: classifyResult.metadata.provider,
          model: classifyResult.metadata.model,
          tokensUsed: classifyResult.metadata.tokensUsed.total,
          latencyMs: Date.now() - startTime,
          confidence,
        }, {
          decision: 'lead_classified',
          reasoning: `Classified as ${classification.primaryLabel} with ${classification.intentLevel} intent`,
          appliedChanges: updates,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createResult('ai_classify_lead', context, false, undefined, {
          code: 'EXECUTION_ERROR',
          message,
          retryable: true,
        });
      }
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.confidence_threshold !== undefined && (params.confidence_threshold < 0 || params.confidence_threshold > 1)) {
        errors.push('Confidence threshold must be between 0 and 1');
      }
      return { valid: errors.length === 0, errors };
    },
    requiresApproval: (params, confidence) => {
      return params.require_approval === true || confidence < (params.confidence_threshold ?? 0.75);
    },
  },

  // AI Score Lead
  ai_score_lead: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      try {
        const scoreResult = await scoreLead(context.entityData as { id: string; [key: string]: unknown });

        if (!scoreResult.success || !scoreResult.data) {
          return createResult('ai_score_lead', context, false, undefined, {
            code: 'AI_ERROR',
            message: scoreResult.error?.message || 'Failed to score lead',
            retryable: scoreResult.error?.retryable ?? true,
          });
        }

        const score = scoreResult.data;

        logAIOperation({
          tenantId: context.tenantId,
          userId: context.userId || 'system',
          operation: 'ai_score_lead',
          provider: scoreResult.metadata.provider,
          model: scoreResult.metadata.model,
          inputTokens: scoreResult.metadata.tokensUsed.prompt,
          outputTokens: scoreResult.metadata.tokensUsed.completion,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        return createResult('ai_score_lead', context, true, {
          score: score.score,
          grade: score.grade,
          recommendation: score.recommendation,
          factors: params.save_factors !== false ? score.factors : undefined,
          explanations: score.explanations,
        }, undefined, {
          executionId,
          provider: scoreResult.metadata.provider,
          model: scoreResult.metadata.model,
          tokensUsed: scoreResult.metadata.tokensUsed.total,
          latencyMs: Date.now() - startTime,
          confidence: score.confidence,
        }, {
          decision: 'score_calculated',
          reasoning: `Score: ${score.score} (${score.grade}), Recommendation: ${score.recommendation}`,
          appliedChanges: { score: score.score, grade: score.grade },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createResult('ai_score_lead', context, false, undefined, {
          code: 'EXECUTION_ERROR',
          message,
          retryable: true,
        });
      }
    },
    validate: () => ({ valid: true, errors: [] }),
    requiresApproval: () => false,
  },

  // AI Generate Follow-up
  ai_generate_followup: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      try {
        const summaryResult = await generateLeadSummary(
          JSON.stringify(context.entityData),
          context.entityId
        );

        if (!summaryResult.success || !summaryResult.data) {
          return createResult('ai_generate_followup', context, false, undefined, {
            code: 'AI_ERROR',
            message: summaryResult.error?.message || 'Failed to generate followup',
            retryable: summaryResult.error?.retryable ?? true,
          });
        }

        const summary = summaryResult.data;
        const nextAction = summary.nextActions[0];

        const followupTask = {
          type: params.followup_type || 'task',
          title: nextAction?.action || `Follow up with ${(context.entityData as { firstName?: string }).firstName || 'Lead'}`,
          description: nextAction?.reasoning || summary.summary,
          priority: params.followup_priority || nextAction?.priority || 'medium',
          dueInDays: params.due_days ?? nextAction?.dueWithinDays ?? 3,
        };

        logAIOperation({
          tenantId: context.tenantId,
          userId: context.userId || 'system',
          operation: 'ai_generate_followup',
          provider: summaryResult.metadata.provider,
          model: summaryResult.metadata.model,
          inputTokens: summaryResult.metadata.tokensUsed.prompt,
          outputTokens: summaryResult.metadata.tokensUsed.completion,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        return createResult('ai_generate_followup', context, true, {
          followupTask,
          originalSuggestion: nextAction,
          requiresApproval: params.require_approval ?? true,
        }, undefined, {
          executionId,
          provider: summaryResult.metadata.provider,
          model: summaryResult.metadata.model,
          tokensUsed: summaryResult.metadata.tokensUsed.total,
          latencyMs: Date.now() - startTime,
          confidence: summary.confidence,
          requiresApproval: params.require_approval ?? true,
        }, {
          decision: params.require_approval ? 'pending_approval' : 'followup_created',
          reasoning: `Generated ${followupTask.type} followup: ${followupTask.title}`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createResult('ai_generate_followup', context, false, undefined, {
          code: 'EXECUTION_ERROR',
          message,
          retryable: true,
        });
      }
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.due_days !== undefined && params.due_days < 1) {
        errors.push('Due days must be at least 1');
      }
      return { valid: errors.length === 0, errors };
    },
    requiresApproval: (params) => params.require_approval ?? true,
  },

  // AI Enrich Lead
  ai_enrich_lead: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      try {
        const enrichResult = await enrichLead(context.entityData as { id: string; [key: string]: unknown });

        if (!enrichResult.success || !enrichResult.data) {
          return createResult('ai_enrich_lead', context, false, undefined, {
            code: 'AI_ERROR',
            message: enrichResult.error?.message || 'Failed to enrich lead',
            retryable: enrichResult.error?.retryable ?? true,
          });
        }

        const enrichment = enrichResult.data;
        const threshold = params.confidence_threshold ?? 0.8;

        if (enrichment.confidence < threshold) {
          return createResult('ai_enrich_lead', context, false, undefined, {
            code: 'LOW_CONFIDENCE',
            message: `Confidence ${enrichment.confidence.toFixed(2)} below threshold ${threshold}`,
            retryable: false,
          }, { confidence: enrichment.confidence, requiresApproval: true });
        }

        const updates: Record<string, unknown> = {};
        const fieldsToEnrich = params.enrich_fields || ['industry', 'persona', 'intent', 'contact_reason', 'company_size'];

        enrichment.enrichedFields.forEach(field => {
          if (fieldsToEnrich.includes(field.fieldName as 'industry' | 'persona' | 'intent' | 'contact_reason' | 'company_size')) {
            updates[field.fieldName] = field.enrichedValue;
          }
        });

        logAIOperation({
          tenantId: context.tenantId,
          userId: context.userId || 'system',
          operation: 'ai_enrich_lead',
          provider: enrichResult.metadata.provider,
          model: enrichResult.metadata.model,
          inputTokens: enrichResult.metadata.tokensUsed.prompt,
          outputTokens: enrichResult.metadata.tokensUsed.completion,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        return createResult('ai_enrich_lead', context, true, {
          enrichedFields: enrichment.enrichedFields,
          suggestedFields: enrichment.suggestedFields,
          updates,
          sources: enrichment.sources,
        }, undefined, {
          executionId,
          provider: enrichResult.metadata.provider,
          model: enrichResult.metadata.model,
          tokensUsed: enrichResult.metadata.tokensUsed.total,
          latencyMs: Date.now() - startTime,
          confidence: enrichment.confidence,
        }, {
          decision: 'lead_enriched',
          reasoning: `Enriched ${Object.keys(updates).length} fields from ${enrichment.sources.join(', ')}`,
          appliedChanges: updates,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createResult('ai_enrich_lead', context, false, undefined, {
          code: 'EXECUTION_ERROR',
          message,
          retryable: true,
        });
      }
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.confidence_threshold !== undefined && (params.confidence_threshold < 0 || params.confidence_threshold > 1)) {
        errors.push('Confidence threshold must be between 0 and 1');
      }
      return { valid: errors.length === 0, errors };
    },
    requiresApproval: (params, confidence) => confidence < (params.confidence_threshold ?? 0.8),
  },

  // AI Auto Stage
  ai_auto_stage: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      try {
        const predictionResult = await predictStageChange(context.entityData as { id: string; status?: string; [key: string]: unknown });

        if (!predictionResult.success || !predictionResult.data) {
          return createResult('ai_auto_stage', context, false, undefined, {
            code: 'AI_ERROR',
            message: predictionResult.error?.message || 'Failed to predict stage',
            retryable: predictionResult.error?.retryable ?? true,
          });
        }

        const prediction = predictionResult.data.prediction;
        const minProb = params.min_probability ?? 0.7;

        if (prediction.probability < minProb) {
          return createResult('ai_auto_stage', context, false, undefined, {
            code: 'LOW_PROBABILITY',
            message: `Probability ${prediction.probability.toFixed(2)} below minimum ${minProb}`,
            retryable: false,
          }, { confidence: prediction.probability, requiresApproval: true });
        }

        logAIOperation({
          tenantId: context.tenantId,
          userId: context.userId || 'system',
          operation: 'ai_auto_stage',
          provider: predictionResult.metadata.provider,
          model: predictionResult.metadata.model,
          inputTokens: predictionResult.metadata.tokensUsed.prompt,
          outputTokens: predictionResult.metadata.tokensUsed.completion,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        return createResult('ai_auto_stage', context, true, {
          currentStage: prediction.currentStage,
          predictedStage: prediction.predictedStage,
          probability: prediction.probability,
          estimatedDays: prediction.estimatedDays,
          factors: prediction.factors,
          requiresApproval: params.require_approval ?? true,
        }, undefined, {
          executionId,
          provider: predictionResult.metadata.provider,
          model: predictionResult.metadata.model,
          tokensUsed: predictionResult.metadata.tokensUsed.total,
          latencyMs: Date.now() - startTime,
          confidence: prediction.probability,
          requiresApproval: params.require_approval ?? true,
        }, {
          decision: params.require_approval ? 'pending_approval' : 'stage_updated',
          reasoning: `Predicted stage change: ${prediction.currentStage} → ${prediction.predictedStage} (${(prediction.probability * 100).toFixed(0)}%)`,
          appliedChanges: params.require_approval ? undefined : { stage: prediction.predictedStage },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createResult('ai_auto_stage', context, false, undefined, {
          code: 'EXECUTION_ERROR',
          message,
          retryable: true,
        });
      }
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.min_probability !== undefined && (params.min_probability < 0 || params.min_probability > 1)) {
        errors.push('Minimum probability must be between 0 and 1');
      }
      return { valid: errors.length === 0, errors };
    },
    requiresApproval: (params) => params.require_approval ?? true,
  },

  // AI Auto Assign
  ai_auto_assign: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      // For auto-assign, we simulate the assignment logic
      // In production, this would integrate with user availability, workload, and performance data
      const strategy = params.assign_strategy || 'round_robin';

      // Simulated assignment result
      const assignmentResult = {
        assignedUserId: 'user_' + Math.random().toString(36).substr(2, 9),
        strategy,
        reasoning: `Assigned using ${strategy} strategy`,
        confidence: 0.85,
      };

      logAIOperation({
        tenantId: context.tenantId,
        userId: context.userId || 'system',
        operation: 'ai_auto_assign',
        provider: 'local' as const,
        model: 'assignment-engine',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        success: true,
      });

      return createResult('ai_auto_assign', context, true, {
        assignedUserId: assignmentResult.assignedUserId,
        strategy: assignmentResult.strategy,
        reasoning: assignmentResult.reasoning,
      }, undefined, {
        executionId,
        provider: 'internal',
        model: 'assignment-engine',
        latencyMs: Date.now() - startTime,
        confidence: assignmentResult.confidence,
      }, {
        decision: 'user_assigned',
        reasoning: assignmentResult.reasoning,
        appliedChanges: { assigned_to: assignmentResult.assignedUserId },
      });
    },
    validate: (params) => {
      const errors: string[] = [];
      const validStrategies = ['round_robin', 'least_loaded', 'best_match', 'performance_based'];
      if (params.assign_strategy && !validStrategies.includes(params.assign_strategy)) {
        errors.push(`Invalid strategy. Must be one of: ${validStrategies.join(', ')}`);
      }
      return { valid: errors.length === 0, errors };
    },
    requiresApproval: () => false,
  },

  // AI Generate Summary
  ai_generate_summary: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      try {
        const summaryResult = await generateLeadSummary(
          JSON.stringify(context.entityData),
          context.entityId
        );

        if (!summaryResult.success || !summaryResult.data) {
          return createResult('ai_generate_summary', context, false, undefined, {
            code: 'AI_ERROR',
            message: summaryResult.error?.message || 'Failed to generate summary',
            retryable: summaryResult.error?.retryable ?? true,
          });
        }

        const summary = summaryResult.data;

        logAIOperation({
          tenantId: context.tenantId,
          userId: context.userId || 'system',
          operation: 'ai_generate_summary',
          provider: summaryResult.metadata.provider,
          model: summaryResult.metadata.model,
          inputTokens: summaryResult.metadata.tokensUsed.prompt,
          outputTokens: summaryResult.metadata.tokensUsed.completion,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        return createResult('ai_generate_summary', context, true, {
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          sentiment: params.include_sentiment !== false ? summary.sentiment : undefined,
          urgency: summary.urgency,
          nextActions: params.include_next_actions !== false ? summary.nextActions : undefined,
        }, undefined, {
          executionId,
          provider: summaryResult.metadata.provider,
          model: summaryResult.metadata.model,
          tokensUsed: summaryResult.metadata.tokensUsed.total,
          latencyMs: Date.now() - startTime,
          confidence: summary.confidence,
        }, {
          decision: 'summary_generated',
          reasoning: `Generated summary with ${(summary.confidence * 100).toFixed(0)}% confidence`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createResult('ai_generate_summary', context, false, undefined, {
          code: 'EXECUTION_ERROR',
          message,
          retryable: true,
        });
      }
    },
    validate: () => ({ valid: true, errors: [] }),
    requiresApproval: () => false,
  },

  // AI Predict Conversion
  ai_predict_conversion: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      try {
        const predictionResult = await predictConversion(context.entityData as { id: string; [key: string]: unknown });

        if (!predictionResult.success || !predictionResult.data) {
          return createResult('ai_predict_conversion', context, false, undefined, {
            code: 'AI_ERROR',
            message: predictionResult.error?.message || 'Failed to predict conversion',
            retryable: predictionResult.error?.retryable ?? true,
          });
        }

        const prediction = predictionResult.data.prediction;

        logAIOperation({
          tenantId: context.tenantId,
          userId: context.userId || 'system',
          operation: 'ai_predict_conversion',
          provider: predictionResult.metadata.provider,
          model: predictionResult.metadata.model,
          inputTokens: predictionResult.metadata.tokensUsed.prompt,
          outputTokens: predictionResult.metadata.tokensUsed.completion,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        return createResult('ai_predict_conversion', context, true, {
          willConvert: prediction.willConvert,
          probability: prediction.probability,
          timeframeDays: prediction.timeframeDays,
          potentialValue: prediction.potentialValue,
          riskFactors: prediction.riskFactors,
          positiveIndicators: prediction.positiveIndicators,
        }, undefined, {
          executionId,
          provider: predictionResult.metadata.provider,
          model: predictionResult.metadata.model,
          tokensUsed: predictionResult.metadata.tokensUsed.total,
          latencyMs: Date.now() - startTime,
          confidence: predictionResult.data.confidence,
        }, {
          decision: 'conversion_predicted',
          reasoning: `Predicted ${prediction.willConvert ? 'will convert' : 'unlikely to convert'} with ${(prediction.probability * 100).toFixed(0)}% probability`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createResult('ai_predict_conversion', context, false, undefined, {
          code: 'EXECUTION_ERROR',
          message,
          retryable: true,
        });
      }
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.confidence_threshold !== undefined && (params.confidence_threshold < 0 || params.confidence_threshold > 1)) {
        errors.push('Confidence threshold must be between 0 and 1');
      }
      return { valid: errors.length === 0, errors };
    },
    requiresApproval: () => false,
  },

  // AI Detect Intent
  ai_detect_intent: {
    execute: async (context, params) => {
      const startTime = Date.now();
      const executionId = context.executionId || createExecutionId();

      try {
        const classifyResult = await classifyLead(JSON.stringify(context.entityData));

        if (!classifyResult.success || !classifyResult.data) {
          return createResult('ai_detect_intent', context, false, undefined, {
            code: 'AI_ERROR',
            message: classifyResult.error?.message || 'Failed to detect intent',
            retryable: classifyResult.error?.retryable ?? true,
          });
        }

        const classification = classifyResult.data;
        const threshold = params.confidence_threshold ?? 0.7;

        if (classification.confidence < threshold) {
          return createResult('ai_detect_intent', context, false, undefined, {
            code: 'LOW_CONFIDENCE',
            message: `Confidence ${classification.confidence.toFixed(2)} below threshold ${threshold}`,
            retryable: false,
          }, { confidence: classification.confidence });
        }

        logAIOperation({
          tenantId: context.tenantId,
          userId: context.userId || 'system',
          operation: 'ai_detect_intent',
          provider: classifyResult.metadata.provider,
          model: classifyResult.metadata.model,
          inputTokens: classifyResult.metadata.tokensUsed.prompt,
          outputTokens: classifyResult.metadata.tokensUsed.completion,
          latencyMs: Date.now() - startTime,
          success: true,
        });

        return createResult('ai_detect_intent', context, true, {
          intentLevel: classification.intentLevel,
          interests: classification.interests,
          buyerPersona: classification.buyerPersona,
        }, undefined, {
          executionId,
          provider: classifyResult.metadata.provider,
          model: classifyResult.metadata.model,
          tokensUsed: classifyResult.metadata.tokensUsed.total,
          latencyMs: Date.now() - startTime,
          confidence: classification.confidence,
        }, {
          decision: 'intent_detected',
          reasoning: `Detected ${classification.intentLevel} intent with interests: ${classification.interests.join(', ')}`,
          appliedChanges: { intent_level: classification.intentLevel, interests: classification.interests },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createResult('ai_detect_intent', context, false, undefined, {
          code: 'EXECUTION_ERROR',
          message,
          retryable: true,
        });
      }
    },
    validate: (params) => {
      const errors: string[] = [];
      if (params.confidence_threshold !== undefined && (params.confidence_threshold < 0 || params.confidence_threshold > 1)) {
        errors.push('Confidence threshold must be between 0 and 1');
      }
      return { valid: errors.length === 0, errors };
    },
    requiresApproval: () => false,
  },
};

// ============================================
// Main Engine Functions
// ============================================

export async function executeAIAction(
  action: AIWorkflowAction,
  context: ExecutionContext,
  params: AIActionParams = {}
): Promise<AIActionResult> {
  const executor = executors[action];

  if (!executor) {
    return createResult(action, context, false, undefined, {
      code: 'UNKNOWN_ACTION',
      message: `Unknown AI action: ${action}`,
      retryable: false,
    });
  }

  // Validate parameters
  const validation = executor.validate(params);
  if (!validation.valid) {
    return createResult(action, context, false, undefined, {
      code: 'VALIDATION_ERROR',
      message: validation.errors.join(', '),
      retryable: false,
    });
  }

  // Log audit entry at start
  const auditId = logAIWorkflowAction({
    tenantId: context.tenantId,
    workflowId: context.workflowId,
    executionId: context.executionId,
    action,
    entityType: context.entityType,
    entityId: context.entityId,
    userId: context.userId,
    status: 'processing',
    input: { params, context: { entityType: context.entityType } },
    aiDetails: {},
    timing: { startedAt: new Date().toISOString() },
  });

  // Execute the action
  const result = await executor.execute(context, params);

  // Update audit entry with result
  const auditEntry = auditLog.find(e => e.id === auditId);
  if (auditEntry) {
    auditEntry.status = result.success ? 'completed' : 'failed';
    auditEntry.output = { result, error: result.error?.message };
    auditEntry.aiDetails = {
      provider: result.metadata.provider,
      model: result.metadata.model,
      confidence: result.metadata.confidence,
      tokensUsed: result.metadata.tokensUsed,
      decision: result.audit.decision,
      reasoning: result.audit.reasoning,
    };
    auditEntry.appliedChanges = result.audit.appliedChanges ? {
      before: context.entityData,
      after: result.audit.appliedChanges,
    } : undefined;
    auditEntry.timing.completedAt = new Date().toISOString();
    auditEntry.timing.durationMs = result.metadata.latencyMs;
  }

  return result;
}

export function validateAIActionParams(
  action: AIWorkflowAction,
  params: AIActionParams
): { valid: boolean; errors: string[] } {
  const executor = executors[action];
  if (!executor) {
    return { valid: false, errors: [`Unknown AI action: ${action}`] };
  }
  return executor.validate(params);
}

export function checkRequiresApproval(
  action: AIWorkflowAction,
  params: AIActionParams,
  confidence: number
): boolean {
  const executor = executors[action];
  if (!executor) return true;
  return executor.requiresApproval(params, confidence);
}

// ============================================
// Suggestion Generation
// ============================================

export async function generateAISuggestions(
  context: ExecutionContext
): Promise<AISuggestion[]> {
  const suggestions: AISuggestion[] = [];
  const startTime = Date.now();

  try {
    // Generate insights for the entity
    const insightsResult = await generateInsights({
      tenantId: context.tenantId,
      userId: context.userId || 'system',
      entityType: context.entityType as 'lead' | 'opportunity' | 'customer' | 'task',
      entityId: context.entityId,
    });

    if (insightsResult.success && insightsResult.data) {
      insightsResult.data.forEach((insight, index) => {
        const suggestion: AISuggestion = {
          id: `sug_${Date.now()}_${index}`,
          entityType: context.entityType as 'lead' | 'opportunity' | 'customer',
          entityId: context.entityId,
          action: mapInsightToAction(insight.type),
          title: insight.title,
          description: insight.description,
          reasoning: insight.suggestedActions[0]?.reasoning || 'Based on AI analysis',
          confidence: insight.confidence,
          priority: insight.impact,
          impact: insight.impact,
          createdAt: new Date().toISOString(),
          status: 'pending',
        };
        suggestions.push(suggestion);
      });
    }
  } catch {
    console.error('Failed to generate AI suggestions');
  }

  // Log total time
  console.log(`Generated ${suggestions.length} suggestions in ${Date.now() - startTime}ms`);

  return suggestions;
}

function mapInsightToAction(insightType: string): AIWorkflowAction {
  switch (insightType) {
    case 'opportunity':
      return 'ai_score_lead';
    case 'risk':
      return 'ai_generate_followup';
    case 'recommendation':
      return 'ai_generate_summary';
    case 'pattern':
      return 'ai_classify_lead';
    case 'anomaly':
      return 'ai_detect_intent';
    default:
      return 'ai_generate_summary';
  }
}

// ============================================
// Exports
// ============================================

export type { ExecutionContext, ActionExecutor };

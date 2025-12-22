/**
 * Contract Management Service
 *
 * Comprehensive contract lifecycle management:
 * - Contract CRUD operations
 * - Version control
 * - Approval workflows
 * - E-signature integration
 * - Renewal management
 * - Obligation tracking
 * - Analytics and reporting
 */

import { injectable, inject } from 'tsyringe';
import { eq, and, desc, gte, lte, sql, asc, or, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@zuclubit/domain';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../messaging';
import {
  contracts,
  contractVersions,
  contractTemplates,
  contractApprovalWorkflows,
  contractApprovals,
  signatureRequests,
  contractRenewals,
  contractObligations,
  contractEvents,
  contractClauses,
  ContractRow,
  ContractVersionRow,
  ContractTemplateRow,
  ContractApprovalWorkflowRow,
  ContractApprovalRow,
  SignatureRequestRow,
  ContractRenewalRow,
  ContractObligationRow,
  ContractEventRow,
  ContractClauseRow,
} from '../database/schema';
import type {
  ContractStatus,
  ContractType,
  ApprovalStatus,
  SignatureStatus,
  RenewalStatus,
  Contract,
  ContractVersion,
  ContractTemplate,
  ApprovalWorkflow,
  ApprovalStep,
  ContractApproval,
  ApprovalDecision,
  SignatureRequest,
  Signatory,
  ContractRenewal,
  ContractObligation,
  ContractEvent,
  ContractEventType,
  ContractAnalytics,
  ContractDashboard,
  ContractSearchFilters,
  RenewalForecast,
} from './types';

@injectable()
export class ContractService {
  private db: any;
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(@inject('Database') db: any) {
    this.db = db;
    this.initializeEmailProvider();
  }

  private async initializeEmailProvider(): Promise<void> {
    if (this.emailInitialized) return;
    const config = getResendConfig();
    if (config.isEnabled) {
      this.emailProvider = new ResendProvider();
      const result = await this.emailProvider.initialize({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
      if (result.isSuccess) {
        this.emailInitialized = true;
      }
    }
  }

  // ============================================================================
  // CONTRACT CRUD
  // ============================================================================

  /**
   * Create a new contract
   */
  async createContract(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      type: ContractType;
      customerName: string;
      customerId?: string;
      totalValue: number;
      effectiveDate: Date;
      expirationDate: Date;
      description?: string;
      vendorName?: string;
      vendorId?: string;
      currency?: string;
      recurringValue?: number;
      billingFrequency?: string;
      paymentTerms?: string;
      autoRenew?: boolean;
      renewalTermMonths?: number;
      noticePeriodDays?: number;
      terminationClause?: string;
      templateId?: string;
      opportunityId?: string;
      parentContractId?: string;
      ownerId: string;
      ownerName: string;
      tags?: string[];
      customFields?: Record<string, unknown>;
    }
  ): Promise<Result<ContractRow>> {
    try {
      // Generate contract number
      const contractNumber = await this.generateContractNumber(tenantId, input.type);

      const [contract] = await this.db.insert(contracts)
        .values({
          id: uuidv4(),
          tenantId,
          contractNumber,
          name: input.name,
          type: input.type,
          status: 'draft',
          description: input.description,
          customerId: input.customerId,
          customerName: input.customerName,
          vendorId: input.vendorId,
          vendorName: input.vendorName,
          totalValue: input.totalValue,
          currency: input.currency || 'USD',
          recurringValue: input.recurringValue,
          billingFrequency: input.billingFrequency,
          paymentTerms: input.paymentTerms,
          effectiveDate: input.effectiveDate,
          expirationDate: input.expirationDate,
          autoRenew: input.autoRenew || false,
          renewalTermMonths: input.renewalTermMonths,
          noticePeriodDays: input.noticePeriodDays,
          terminationClause: input.terminationClause,
          templateId: input.templateId,
          opportunityId: input.opportunityId,
          parentContractId: input.parentContractId,
          ownerId: input.ownerId,
          ownerName: input.ownerName,
          tags: input.tags || [],
          customFields: input.customFields || {},
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Log event
      await this.logEvent(contract.id, tenantId, 'created', 'Contract created', userId, input.ownerName);

      return Result.ok(contract);
    } catch (error) {
      return Result.fail(`Failed to create contract: ${error}`);
    }
  }

  /**
   * Get contract by ID
   */
  async getContract(contractId: string, tenantId: string): Promise<Result<ContractRow | null>> {
    try {
      const [contract] = await this.db.select()
        .from(contracts)
        .where(and(
          eq(contracts.id, contractId),
          eq(contracts.tenantId, tenantId)
        ))
        .limit(1);

      return Result.ok(contract || null);
    } catch (error) {
      return Result.fail(`Failed to get contract: ${error}`);
    }
  }

  /**
   * Update contract
   */
  async updateContract(
    contractId: string,
    tenantId: string,
    userId: string,
    userName: string,
    updates: Partial<{
      name: string;
      description: string;
      totalValue: number;
      recurringValue: number;
      effectiveDate: Date;
      expirationDate: Date;
      autoRenew: boolean;
      renewalTermMonths: number;
      noticePeriodDays: number;
      terminationClause: string;
      paymentTerms: string;
      billingFrequency: string;
      tags: string[];
      customFields: Record<string, unknown>;
    }>
  ): Promise<Result<ContractRow>> {
    try {
      const [updated] = await this.db.update(contracts)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(
          eq(contracts.id, contractId),
          eq(contracts.tenantId, tenantId)
        ))
        .returning();

      if (!updated) {
        return Result.fail('Contract not found');
      }

      await this.logEvent(contractId, tenantId, 'updated', 'Contract updated', userId, userName);

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to update contract: ${error}`);
    }
  }

  /**
   * Change contract status
   */
  async changeStatus(
    contractId: string,
    tenantId: string,
    newStatus: ContractStatus,
    userId: string,
    userName: string
  ): Promise<Result<ContractRow>> {
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: new Date(),
      };

      // Set appropriate dates based on status
      if (newStatus === 'active') {
        updateData.signedDate = new Date();
      } else if (newStatus === 'terminated') {
        updateData.terminatedDate = new Date();
      }

      const [updated] = await this.db.update(contracts)
        .set(updateData)
        .where(and(
          eq(contracts.id, contractId),
          eq(contracts.tenantId, tenantId)
        ))
        .returning();

      if (!updated) {
        return Result.fail('Contract not found');
      }

      await this.logEvent(
        contractId,
        tenantId,
        'status_changed',
        `Status changed to ${newStatus}`,
        userId,
        userName
      );

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to change status: ${error}`);
    }
  }

  /**
   * Search contracts
   */
  async searchContracts(
    tenantId: string,
    filters?: ContractSearchFilters,
    pagination?: { limit?: number; offset?: number }
  ): Promise<Result<{ contracts: ContractRow[]; total: number }>> {
    try {
      const conditions = [eq(contracts.tenantId, tenantId)];

      if (filters?.status?.length) {
        conditions.push(inArray(contracts.status, filters.status));
      }
      if (filters?.type?.length) {
        conditions.push(inArray(contracts.type, filters.type));
      }
      if (filters?.customerId) {
        conditions.push(eq(contracts.customerId, filters.customerId));
      }
      if (filters?.ownerId) {
        conditions.push(eq(contracts.ownerId, filters.ownerId));
      }
      if (filters?.expiringBefore) {
        conditions.push(lte(contracts.expirationDate, filters.expiringBefore));
      }
      if (filters?.expiringAfter) {
        conditions.push(gte(contracts.expirationDate, filters.expiringAfter));
      }
      if (filters?.minValue !== undefined) {
        conditions.push(gte(contracts.totalValue, filters.minValue));
      }
      if (filters?.maxValue !== undefined) {
        conditions.push(lte(contracts.totalValue, filters.maxValue));
      }

      const query = this.db.select()
        .from(contracts)
        .where(and(...conditions))
        .orderBy(desc(contracts.createdAt));

      if (pagination?.limit) {
        query.limit(pagination.limit);
      }
      if (pagination?.offset) {
        query.offset(pagination.offset);
      }

      const results = await query;

      const [{ count }] = await this.db.select({ count: sql<number>`count(*)` })
        .from(contracts)
        .where(and(...conditions));

      return Result.ok({ contracts: results, total: Number(count) });
    } catch (error) {
      return Result.fail(`Failed to search contracts: ${error}`);
    }
  }

  // ============================================================================
  // VERSION CONTROL
  // ============================================================================

  /**
   * Upload new contract version
   */
  async uploadVersion(
    contractId: string,
    tenantId: string,
    userId: string,
    input: {
      documentUrl: string;
      documentHash?: string;
      fileSize?: number;
      mimeType?: string;
      changes?: string;
    }
  ): Promise<Result<ContractVersionRow>> {
    try {
      // Get current version number
      const [latestVersion] = await this.db.select()
        .from(contractVersions)
        .where(eq(contractVersions.contractId, contractId))
        .orderBy(desc(contractVersions.versionNumber))
        .limit(1);

      const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

      const [version] = await this.db.insert(contractVersions)
        .values({
          id: uuidv4(),
          contractId,
          tenantId,
          versionNumber: newVersionNumber,
          documentUrl: input.documentUrl,
          documentHash: input.documentHash,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          changes: input.changes,
          previousVersionId: latestVersion?.id,
          createdBy: userId,
          createdAt: new Date(),
        })
        .returning();

      // Update contract with current version
      await this.db.update(contracts)
        .set({
          currentVersionId: version.id,
          documentUrl: input.documentUrl,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contractId));

      await this.logEvent(contractId, tenantId, 'version_uploaded', `Version ${newVersionNumber} uploaded`, userId);

      return Result.ok(version);
    } catch (error) {
      return Result.fail(`Failed to upload version: ${error}`);
    }
  }

  /**
   * Get version history
   */
  async getVersionHistory(contractId: string, tenantId: string): Promise<Result<ContractVersionRow[]>> {
    try {
      const versions = await this.db.select()
        .from(contractVersions)
        .where(and(
          eq(contractVersions.contractId, contractId),
          eq(contractVersions.tenantId, tenantId)
        ))
        .orderBy(desc(contractVersions.versionNumber));

      return Result.ok(versions);
    } catch (error) {
      return Result.fail(`Failed to get version history: ${error}`);
    }
  }

  // ============================================================================
  // APPROVAL WORKFLOWS
  // ============================================================================

  /**
   * Create approval workflow
   */
  async createApprovalWorkflow(
    tenantId: string,
    input: {
      name: string;
      description?: string;
      triggerType: 'contract_value' | 'contract_type' | 'manual' | 'always';
      triggerConditions?: Array<{ field: string; operator: string; value: unknown }>;
      steps: ApprovalStep[];
      requireAllApprovers?: boolean;
      allowSkip?: boolean;
    }
  ): Promise<Result<ContractApprovalWorkflowRow>> {
    try {
      const [workflow] = await this.db.insert(contractApprovalWorkflows)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          description: input.description,
          triggerType: input.triggerType,
          triggerConditions: input.triggerConditions || [],
          steps: input.steps,
          requireAllApprovers: input.requireAllApprovers ?? true,
          allowSkip: input.allowSkip ?? false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(workflow);
    } catch (error) {
      return Result.fail(`Failed to create workflow: ${error}`);
    }
  }

  /**
   * Submit contract for approval
   */
  async submitForApproval(
    contractId: string,
    tenantId: string,
    workflowId: string,
    userId: string
  ): Promise<Result<ContractApprovalRow>> {
    try {
      // Get workflow
      const [workflow] = await this.db.select()
        .from(contractApprovalWorkflows)
        .where(and(
          eq(contractApprovalWorkflows.id, workflowId),
          eq(contractApprovalWorkflows.tenantId, tenantId)
        ))
        .limit(1);

      if (!workflow) {
        return Result.fail('Workflow not found');
      }

      const steps = workflow.steps as ApprovalStep[];
      const firstStep = steps.find((s: ApprovalStep) => s.order === 1);

      // Create initial approval decisions
      const approvals: ApprovalDecision[] = firstStep?.approvers.map((approver, idx) => ({
        stepOrder: 1,
        approverId: approver.userId || '',
        approverName: '',
        status: 'pending' as ApprovalStatus,
        dueAt: new Date(Date.now() + (firstStep.dueInHours * 60 * 60 * 1000)),
      })) || [];

      const [approval] = await this.db.insert(contractApprovals)
        .values({
          id: uuidv4(),
          contractId,
          tenantId,
          workflowId,
          currentStepOrder: 1,
          status: 'pending',
          approvals,
          requestedBy: userId,
          requestedAt: new Date(),
          createdAt: new Date(),
        })
        .returning();

      // Update contract status
      await this.db.update(contracts)
        .set({ status: 'pending_approval', updatedAt: new Date() })
        .where(eq(contracts.id, contractId));

      await this.logEvent(contractId, tenantId, 'approval_requested', 'Submitted for approval', userId);

      // Send email to approvers
      if (this.emailProvider && firstStep) {
        try {
          const appConfig = getAppConfig();
          const [contract] = await this.db.select()
            .from(contracts)
            .where(eq(contracts.id, contractId))
            .limit(1);

          for (const approver of firstStep.approvers) {
            if (approver.email) {
              await this.emailProvider.send({
                to: approver.email,
                subject: `Aprobación requerida: Contrato ${contract?.contractNumber || ''}`,
                template: EmailTemplate.CONTRACT_APPROVAL_REQUEST,
                variables: {
                  approverName: approver.name || 'Aprobador',
                  contractName: contract?.name || '',
                  contractNumber: contract?.contractNumber || '',
                  contractValue: contract?.totalValue ? `$${(contract.totalValue / 100).toLocaleString()}` : '',
                  customerName: contract?.customerName || '',
                  requestedBy: userId,
                  actionUrl: `${appConfig.appUrl}/contracts/${contractId}/approve`,
                  dueDate: new Date(Date.now() + (firstStep.dueInHours * 60 * 60 * 1000)).toLocaleDateString('es-ES'),
                },
                tags: [
                  { name: 'type', value: 'contract-approval-request' },
                  { name: 'contractId', value: contractId },
                ],
              });
            }
          }
          console.log(`[ContractService] Approval request emails sent for contract ${contractId}`);

          // Send SMS to approvers with phone
          for (const approver of firstStep.approvers) {
            if (approver.phone) {
              try {
                const messagingService = getMessagingService();
                if (messagingService.isSmsAvailable()) {
                  await messagingService.sendTemplate(
                    approver.phone,
                    MessageTemplate.CONTRACT_APPROVAL,
                    {
                      contractName: contract?.name || 'Contrato',
                      contractNumber: contract?.contractNumber || '',
                    },
                    'sms',
                    { entityType: 'contract', entityId: contractId }
                  );
                  console.log(`[ContractService] Approval request SMS sent to ${approver.phone}`);
                }
              } catch (smsError) {
                console.error('[ContractService] Failed to send approval SMS:', smsError);
              }
            }
          }
        } catch (emailError) {
          console.error('[ContractService] Failed to send approval request emails:', emailError);
        }
      }

      return Result.ok(approval);
    } catch (error) {
      return Result.fail(`Failed to submit for approval: ${error}`);
    }
  }

  /**
   * Process approval decision
   */
  async processApprovalDecision(
    approvalId: string,
    tenantId: string,
    approverId: string,
    approverName: string,
    decision: 'approved' | 'rejected',
    comments?: string
  ): Promise<Result<ContractApprovalRow>> {
    try {
      const [approval] = await this.db.select()
        .from(contractApprovals)
        .where(and(
          eq(contractApprovals.id, approvalId),
          eq(contractApprovals.tenantId, tenantId)
        ))
        .limit(1);

      if (!approval) {
        return Result.fail('Approval not found');
      }

      // Update the approvals array
      const approvals = approval.approvals as ApprovalDecision[];
      const approverDecision = approvals.find(
        (a: ApprovalDecision) => a.stepOrder === approval.currentStepOrder && a.status === 'pending'
      );

      if (approverDecision) {
        approverDecision.status = decision === 'approved' ? 'approved' : 'rejected';
        approverDecision.decision = decision;
        approverDecision.comments = comments;
        approverDecision.decidedAt = new Date();
        approverDecision.approverId = approverId;
        approverDecision.approverName = approverName;
      }

      // Determine overall status
      let newStatus: 'pending' | 'approved' | 'rejected' = 'pending';
      if (decision === 'rejected') {
        newStatus = 'rejected';
      } else {
        // Check if all approvers for current step have approved
        const currentStepApprovals = approvals.filter((a: ApprovalDecision) => a.stepOrder === approval.currentStepOrder);
        const allApproved = currentStepApprovals.every((a: ApprovalDecision) => a.status === 'approved');

        if (allApproved) {
          // Get workflow to check if there are more steps
          const [workflow] = await this.db.select()
            .from(contractApprovalWorkflows)
            .where(eq(contractApprovalWorkflows.id, approval.workflowId))
            .limit(1);

          const steps = workflow?.steps as ApprovalStep[] || [];
          const nextStep = steps.find((s: ApprovalStep) => s.order === approval.currentStepOrder + 1);

          if (nextStep) {
            // Move to next step
            // Add approvals for next step
            nextStep.approvers.forEach(approver => {
              approvals.push({
                stepOrder: nextStep.order,
                approverId: approver.userId || '',
                approverName: '',
                status: 'pending',
                dueAt: new Date(Date.now() + (nextStep.dueInHours * 60 * 60 * 1000)),
              });
            });
          } else {
            // All steps complete
            newStatus = 'approved';
          }
        }
      }

      const [updated] = await this.db.update(contractApprovals)
        .set({
          approvals,
          status: newStatus,
          currentStepOrder: newStatus === 'pending' && decision === 'approved'
            ? approval.currentStepOrder + 1
            : approval.currentStepOrder,
          completedAt: newStatus !== 'pending' ? new Date() : null,
        })
        .where(eq(contractApprovals.id, approvalId))
        .returning();

      // Update contract status if fully approved/rejected
      if (newStatus === 'approved') {
        await this.db.update(contracts)
          .set({ status: 'approved', updatedAt: new Date() })
          .where(eq(contracts.id, approval.contractId));
        await this.logEvent(approval.contractId, tenantId, 'approval_approved', 'Contract approved', approverId, approverName);
      } else if (newStatus === 'rejected') {
        await this.db.update(contracts)
          .set({ status: 'draft', updatedAt: new Date() })
          .where(eq(contracts.id, approval.contractId));
        await this.logEvent(approval.contractId, tenantId, 'approval_rejected', `Contract rejected: ${comments}`, approverId, approverName);
      }

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to process approval: ${error}`);
    }
  }

  // ============================================================================
  // SIGNATURE MANAGEMENT
  // ============================================================================

  /**
   * Create signature request
   */
  async createSignatureRequest(
    contractId: string,
    tenantId: string,
    userId: string,
    input: {
      documentUrl: string;
      signatories: Array<{
        name: string;
        email: string;
        role: 'signer' | 'cc' | 'witness';
        order: number;
      }>;
      message?: string;
      expiresAt?: Date;
      externalProvider?: string;
    }
  ): Promise<Result<SignatureRequestRow>> {
    try {
      const signatories: Signatory[] = input.signatories.map(s => ({
        id: uuidv4(),
        name: s.name,
        email: s.email,
        role: s.role,
        order: s.order,
        status: 'pending' as SignatureStatus,
      }));

      const [request] = await this.db.insert(signatureRequests)
        .values({
          id: uuidv4(),
          contractId,
          tenantId,
          documentUrl: input.documentUrl,
          signatories,
          status: 'draft',
          message: input.message,
          expiresAt: input.expiresAt,
          externalProvider: input.externalProvider,
          reminderConfig: {
            enabled: true,
            frequency: 'weekly',
            maxReminders: 3,
            remindersSent: 0,
          },
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(request);
    } catch (error) {
      return Result.fail(`Failed to create signature request: ${error}`);
    }
  }

  /**
   * Send signature request
   */
  async sendSignatureRequest(
    requestId: string,
    tenantId: string,
    userId: string
  ): Promise<Result<SignatureRequestRow>> {
    try {
      const [updated] = await this.db.update(signatureRequests)
        .set({
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(signatureRequests.id, requestId),
          eq(signatureRequests.tenantId, tenantId)
        ))
        .returning();

      if (!updated) {
        return Result.fail('Signature request not found');
      }

      // Update contract status
      await this.db.update(contracts)
        .set({ status: 'pending_signature', updatedAt: new Date() })
        .where(eq(contracts.id, updated.contractId));

      await this.logEvent(updated.contractId, tenantId, 'signature_sent', 'Signature request sent', userId);

      // Send signature request emails to signatories
      if (this.emailProvider) {
        try {
          const appConfig = getAppConfig();
          const [contract] = await this.db.select()
            .from(contracts)
            .where(eq(contracts.id, updated.contractId))
            .limit(1);

          const signatories = updated.signatories as Signatory[];
          for (const signatory of signatories) {
            if (signatory.email) {
              await this.emailProvider.send({
                to: signatory.email,
                subject: `Firma requerida: ${contract?.name || 'Contrato'}`,
                template: EmailTemplate.CONTRACT_SIGNATURE_REQUEST,
                variables: {
                  signatoryName: signatory.name || 'Firmante',
                  contractName: contract?.name || '',
                  contractNumber: contract?.contractNumber || '',
                  customerName: contract?.customerName || '',
                  signatoryRole: signatory.role || 'Firmante',
                  message: updated.message || '',
                  documentUrl: updated.documentUrl || `${appConfig.appUrl}/contracts/${updated.contractId}/sign`,
                  expiresAt: updated.expiresAt ? new Date(updated.expiresAt).toLocaleDateString('es-ES') : 'Sin fecha límite',
                  actionUrl: `${appConfig.appUrl}/contracts/sign/${requestId}?signatory=${signatory.id}`,
                },
                tags: [
                  { name: 'type', value: 'contract-signature-request' },
                  { name: 'contractId', value: updated.contractId },
                  { name: 'signatoryId', value: signatory.id },
                ],
              });
            }
          }
          console.log(`[ContractService] Signature request emails sent for contract ${updated.contractId}`);

          // Send SMS to signatories with phone
          for (const signatory of signatories) {
            if (signatory.phone) {
              try {
                const messagingService = getMessagingService();
                if (messagingService.isSmsAvailable()) {
                  await messagingService.sendTemplate(
                    signatory.phone,
                    MessageTemplate.CONTRACT_SIGNATURE_REQUEST,
                    {
                      contractName: contract?.name || 'Contrato',
                      signatoryName: signatory.name || 'Firmante',
                    },
                    'sms',
                    { entityType: 'contract', entityId: updated.contractId }
                  );
                  console.log(`[ContractService] Signature request SMS sent to ${signatory.phone}`);
                }
              } catch (smsError) {
                console.error('[ContractService] Failed to send signature SMS:', smsError);
              }
            }
          }
        } catch (emailError) {
          console.error('[ContractService] Failed to send signature request emails:', emailError);
        }
      }

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to send signature request: ${error}`);
    }
  }

  /**
   * Record signature (webhook from e-sign provider)
   */
  async recordSignature(
    requestId: string,
    tenantId: string,
    signatoryId: string,
    ipAddress?: string
  ): Promise<Result<SignatureRequestRow>> {
    try {
      const [request] = await this.db.select()
        .from(signatureRequests)
        .where(and(
          eq(signatureRequests.id, requestId),
          eq(signatureRequests.tenantId, tenantId)
        ))
        .limit(1);

      if (!request) {
        return Result.fail('Signature request not found');
      }

      const signatories = request.signatories as Signatory[];
      const signatory = signatories.find((s: Signatory) => s.id === signatoryId);

      if (signatory) {
        signatory.status = 'signed';
        signatory.signedAt = new Date();
        signatory.ipAddress = ipAddress;
      }

      // Check if all signed
      const allSigned = signatories
        .filter((s: Signatory) => s.role === 'signer')
        .every((s: Signatory) => s.status === 'signed');

      const newStatus = allSigned ? 'completed' : 'partially_signed';

      const [updated] = await this.db.update(signatureRequests)
        .set({
          signatories,
          status: newStatus,
          completedAt: allSigned ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(signatureRequests.id, requestId))
        .returning();

      // Update contract if fully signed
      if (allSigned) {
        await this.db.update(contracts)
          .set({ status: 'active', signedDate: new Date(), updatedAt: new Date() })
          .where(eq(contracts.id, request.contractId));
        await this.logEvent(request.contractId, tenantId, 'signature_signed', 'Contract fully executed');
      }

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to record signature: ${error}`);
    }
  }

  // ============================================================================
  // RENEWALS
  // ============================================================================

  /**
   * Create renewal record
   */
  async createRenewal(
    contractId: string,
    tenantId: string,
    input: {
      renewalDate: Date;
      proposedValue?: number;
      proposedTermMonths?: number;
      assignedTo?: string;
      churnRisk?: 'low' | 'medium' | 'high';
    }
  ): Promise<Result<ContractRenewalRow>> {
    try {
      // Get original contract
      const [contract] = await this.db.select()
        .from(contracts)
        .where(and(
          eq(contracts.id, contractId),
          eq(contracts.tenantId, tenantId)
        ))
        .limit(1);

      if (!contract) {
        return Result.fail('Contract not found');
      }

      const valueChange = input.proposedValue
        ? input.proposedValue - contract.totalValue
        : undefined;

      const [renewal] = await this.db.insert(contractRenewals)
        .values({
          id: uuidv4(),
          contractId,
          tenantId,
          status: 'upcoming',
          renewalDate: input.renewalDate,
          proposedValue: input.proposedValue,
          proposedTermMonths: input.proposedTermMonths,
          valueChange,
          assignedTo: input.assignedTo,
          churnRisk: input.churnRisk,
          createdAt: new Date(),
        })
        .returning();

      return Result.ok(renewal);
    } catch (error) {
      return Result.fail(`Failed to create renewal: ${error}`);
    }
  }

  /**
   * Get upcoming renewals
   */
  async getUpcomingRenewals(
    tenantId: string,
    daysAhead = 90
  ): Promise<Result<ContractRenewalRow[]>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const renewals = await this.db.select()
        .from(contractRenewals)
        .where(and(
          eq(contractRenewals.tenantId, tenantId),
          inArray(contractRenewals.status, ['upcoming', 'in_progress']),
          lte(contractRenewals.renewalDate, futureDate),
          gte(contractRenewals.renewalDate, new Date())
        ))
        .orderBy(asc(contractRenewals.renewalDate));

      return Result.ok(renewals);
    } catch (error) {
      return Result.fail(`Failed to get renewals: ${error}`);
    }
  }

  /**
   * Process renewal (create new contract)
   */
  async processRenewal(
    renewalId: string,
    tenantId: string,
    userId: string,
    input: {
      newValue: number;
      newTermMonths: number;
      newExpirationDate: Date;
    }
  ): Promise<Result<{ renewal: ContractRenewalRow; newContract: ContractRow }>> {
    try {
      const [renewal] = await this.db.select()
        .from(contractRenewals)
        .where(and(
          eq(contractRenewals.id, renewalId),
          eq(contractRenewals.tenantId, tenantId)
        ))
        .limit(1);

      if (!renewal) {
        return Result.fail('Renewal not found');
      }

      // Get original contract
      const [originalContract] = await this.db.select()
        .from(contracts)
        .where(eq(contracts.id, renewal.contractId))
        .limit(1);

      if (!originalContract) {
        return Result.fail('Original contract not found');
      }

      // Create new contract
      const newContractNumber = await this.generateContractNumber(tenantId, originalContract.type);
      const newEffectiveDate = originalContract.expirationDate;

      const [newContract] = await this.db.insert(contracts)
        .values({
          id: uuidv4(),
          tenantId,
          contractNumber: newContractNumber,
          name: `${originalContract.name} - Renewal`,
          type: 'renewal',
          status: 'draft',
          customerId: originalContract.customerId,
          customerName: originalContract.customerName,
          totalValue: input.newValue,
          currency: originalContract.currency,
          effectiveDate: newEffectiveDate,
          expirationDate: input.newExpirationDate,
          autoRenew: originalContract.autoRenew,
          renewalTermMonths: input.newTermMonths,
          parentContractId: originalContract.id,
          ownerId: originalContract.ownerId,
          ownerName: originalContract.ownerName,
          tags: originalContract.tags as string[],
          customFields: {},
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Update renewal status
      const [updatedRenewal] = await this.db.update(contractRenewals)
        .set({
          status: 'renewed',
          renewedContractId: newContract.id,
          valueChange: input.newValue - originalContract.totalValue,
          completedAt: new Date(),
        })
        .where(eq(contractRenewals.id, renewalId))
        .returning();

      // Update original contract
      await this.db.update(contracts)
        .set({ status: 'renewed', updatedAt: new Date() })
        .where(eq(contracts.id, originalContract.id));

      await this.logEvent(originalContract.id, tenantId, 'renewed', `Renewed to contract ${newContractNumber}`, userId);

      return Result.ok({ renewal: updatedRenewal, newContract });
    } catch (error) {
      return Result.fail(`Failed to process renewal: ${error}`);
    }
  }

  // ============================================================================
  // OBLIGATIONS
  // ============================================================================

  /**
   * Create obligation
   */
  async createObligation(
    contractId: string,
    tenantId: string,
    input: {
      type: 'payment' | 'delivery' | 'compliance' | 'reporting' | 'milestone' | 'other';
      title: string;
      description?: string;
      responsibleParty: 'customer' | 'vendor' | 'mutual';
      dueDate: Date;
      assignedTo?: string;
      recurringPattern?: string;
      reminderDays?: number[];
    }
  ): Promise<Result<ContractObligationRow>> {
    try {
      const [obligation] = await this.db.insert(contractObligations)
        .values({
          id: uuidv4(),
          contractId,
          tenantId,
          type: input.type,
          title: input.title,
          description: input.description,
          responsibleParty: input.responsibleParty,
          dueDate: input.dueDate,
          assignedTo: input.assignedTo,
          recurringPattern: input.recurringPattern,
          reminderDays: input.reminderDays || [7, 3, 1],
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(obligation);
    } catch (error) {
      return Result.fail(`Failed to create obligation: ${error}`);
    }
  }

  /**
   * Get overdue obligations
   */
  async getOverdueObligations(tenantId: string): Promise<Result<ContractObligationRow[]>> {
    try {
      const obligations = await this.db.select()
        .from(contractObligations)
        .where(and(
          eq(contractObligations.tenantId, tenantId),
          eq(contractObligations.status, 'pending'),
          lte(contractObligations.dueDate, new Date())
        ))
        .orderBy(asc(contractObligations.dueDate));

      // Update status to overdue
      if (obligations.length > 0) {
        await this.db.update(contractObligations)
          .set({ status: 'overdue', updatedAt: new Date() })
          .where(inArray(contractObligations.id, obligations.map((o: ContractObligationRow) => o.id)));
      }

      return Result.ok(obligations);
    } catch (error) {
      return Result.fail(`Failed to get overdue obligations: ${error}`);
    }
  }

  /**
   * Complete obligation
   */
  async completeObligation(
    obligationId: string,
    tenantId: string,
    userId: string
  ): Promise<Result<ContractObligationRow>> {
    try {
      const [updated] = await this.db.update(contractObligations)
        .set({
          status: 'completed',
          completedAt: new Date(),
          completedBy: userId,
          updatedAt: new Date(),
        })
        .where(and(
          eq(contractObligations.id, obligationId),
          eq(contractObligations.tenantId, tenantId)
        ))
        .returning();

      if (!updated) {
        return Result.fail('Obligation not found');
      }

      await this.logEvent(
        updated.contractId,
        tenantId,
        'obligation_completed',
        `Obligation completed: ${updated.title}`,
        userId
      );

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to complete obligation: ${error}`);
    }
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  /**
   * Create template
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      type: ContractType;
      category?: string;
      documentUrl: string;
      placeholders?: Array<{
        key: string;
        label: string;
        type: string;
        required: boolean;
        defaultValue?: string;
      }>;
      requiresApproval?: boolean;
      approvalWorkflowId?: string;
      defaultTermMonths?: number;
      defaultAutoRenew?: boolean;
    }
  ): Promise<Result<ContractTemplateRow>> {
    try {
      const [template] = await this.db.insert(contractTemplates)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          description: input.description,
          type: input.type,
          category: input.category,
          documentUrl: input.documentUrl,
          placeholders: input.placeholders || [],
          requiresApproval: input.requiresApproval ?? true,
          approvalWorkflowId: input.approvalWorkflowId,
          defaultTermMonths: input.defaultTermMonths || 12,
          defaultAutoRenew: input.defaultAutoRenew ?? true,
          useCount: 0,
          isActive: true,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(template);
    } catch (error) {
      return Result.fail(`Failed to create template: ${error}`);
    }
  }

  /**
   * Get templates
   */
  async getTemplates(
    tenantId: string,
    type?: ContractType
  ): Promise<Result<ContractTemplateRow[]>> {
    try {
      const conditions = [
        eq(contractTemplates.tenantId, tenantId),
        eq(contractTemplates.isActive, true),
      ];

      if (type) {
        conditions.push(eq(contractTemplates.type, type));
      }

      const templates = await this.db.select()
        .from(contractTemplates)
        .where(and(...conditions))
        .orderBy(desc(contractTemplates.useCount));

      return Result.ok(templates);
    } catch (error) {
      return Result.fail(`Failed to get templates: ${error}`);
    }
  }

  // ============================================================================
  // CLAUSES
  // ============================================================================

  /**
   * Create clause
   */
  async createClause(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      category: string;
      content: string;
      isStandard?: boolean;
      requiresReview?: boolean;
      riskLevel?: 'low' | 'medium' | 'high';
    }
  ): Promise<Result<ContractClauseRow>> {
    try {
      const [clause] = await this.db.insert(contractClauses)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          category: input.category,
          content: input.content,
          isStandard: input.isStandard ?? false,
          requiresReview: input.requiresReview ?? false,
          riskLevel: input.riskLevel || 'low',
          useCount: 0,
          version: 1,
          previousVersions: [],
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(clause);
    } catch (error) {
      return Result.fail(`Failed to create clause: ${error}`);
    }
  }

  /**
   * Get clauses by category
   */
  async getClauses(tenantId: string, category?: string): Promise<Result<ContractClauseRow[]>> {
    try {
      const conditions = [eq(contractClauses.tenantId, tenantId)];

      if (category) {
        conditions.push(eq(contractClauses.category, category));
      }

      const clauses = await this.db.select()
        .from(contractClauses)
        .where(and(...conditions))
        .orderBy(desc(contractClauses.useCount));

      return Result.ok(clauses);
    } catch (error) {
      return Result.fail(`Failed to get clauses: ${error}`);
    }
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get contract analytics
   */
  async getAnalytics(
    tenantId: string,
    period: 'month' | 'quarter' | 'year',
    startDate: Date,
    endDate: Date
  ): Promise<Result<ContractAnalytics>> {
    try {
      // Get all contracts
      const allContracts = await this.db.select()
        .from(contracts)
        .where(eq(contracts.tenantId, tenantId));

      // Filter by period
      const periodContracts = allContracts.filter((c: ContractRow) =>
        c.createdAt >= startDate && c.createdAt <= endDate
      );

      // Calculate metrics
      const totalContracts = allContracts.filter((c: ContractRow) => c.status === 'active').length;
      const newContracts = periodContracts.length;
      const renewedContracts = periodContracts.filter((c: ContractRow) => c.type === 'renewal').length;
      const expiredContracts = periodContracts.filter((c: ContractRow) => c.status === 'expired').length;
      const terminatedContracts = periodContracts.filter((c: ContractRow) => c.status === 'terminated').length;

      const totalContractValue = allContracts
        .filter((c: ContractRow) => c.status === 'active')
        .reduce((sum: number, c: ContractRow) => sum + c.totalValue, 0);

      const newContractValue = periodContracts.reduce((sum: number, c: ContractRow) => sum + c.totalValue, 0);

      // Status breakdown
      const statusBreakdown: Record<ContractStatus, number> = {
        draft: 0,
        pending_approval: 0,
        approved: 0,
        pending_signature: 0,
        active: 0,
        expired: 0,
        terminated: 0,
        renewed: 0,
      };

      allContracts.forEach((c: ContractRow) => {
        statusBreakdown[c.status as ContractStatus]++;
      });

      // Type breakdown
      const typeBreakdown: Record<ContractType, number> = {
        master_agreement: 0,
        service_agreement: 0,
        subscription: 0,
        license: 0,
        nda: 0,
        sow: 0,
        amendment: 0,
        renewal: 0,
        other: 0,
      };

      allContracts.forEach((c: ContractRow) => {
        typeBreakdown[c.type as ContractType]++;
      });

      // Expiring soon
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const expiringIn30Days = allContracts.filter((c: ContractRow) =>
        c.status === 'active' && c.expirationDate >= now && c.expirationDate <= in30Days
      ).length;

      const expiringIn60Days = allContracts.filter((c: ContractRow) =>
        c.status === 'active' && c.expirationDate >= now && c.expirationDate <= in60Days
      ).length;

      const expiringIn90Days = allContracts.filter((c: ContractRow) =>
        c.status === 'active' && c.expirationDate >= now && c.expirationDate <= in90Days
      ).length;

      // Get overdue obligations
      const overdueObligations = await this.db.select({ count: sql<number>`count(*)` })
        .from(contractObligations)
        .where(and(
          eq(contractObligations.tenantId, tenantId),
          eq(contractObligations.status, 'overdue')
        ));

      return Result.ok({
        tenantId,
        period,
        periodStart: startDate,
        periodEnd: endDate,
        totalContracts,
        newContracts,
        renewedContracts,
        expiredContracts,
        terminatedContracts,
        totalContractValue,
        newContractValue,
        renewalValue: periodContracts
          .filter((c: ContractRow) => c.type === 'renewal')
          .reduce((sum: number, c: ContractRow) => sum + c.totalValue, 0),
        churnValue: periodContracts
          .filter((c: ContractRow) => c.status === 'terminated')
          .reduce((sum: number, c: ContractRow) => sum + c.totalValue, 0),
        avgDaysToSign: 0, // Would calculate from signature dates
        avgApprovalTime: 0, // Would calculate from approval timestamps
        statusBreakdown,
        typeBreakdown,
        expiringIn30Days,
        expiringIn60Days,
        expiringIn90Days,
        overdueObligations: Number(overdueObligations[0]?.count || 0),
        renewalRate: totalContracts > 0 ? Math.round((renewedContracts / totalContracts) * 100) : 0,
        churnRate: totalContracts > 0 ? Math.round((terminatedContracts / totalContracts) * 100) : 0,
        avgContractValue: totalContracts > 0 ? Math.round(totalContractValue / totalContracts) : 0,
      });
    } catch (error) {
      return Result.fail(`Failed to get analytics: ${error}`);
    }
  }

  /**
   * Get contract dashboard
   */
  async getDashboard(tenantId: string): Promise<Result<ContractDashboard>> {
    try {
      // Get summary
      const activeContracts = await this.db.select()
        .from(contracts)
        .where(and(
          eq(contracts.tenantId, tenantId),
          eq(contracts.status, 'active')
        ));

      const totalActive = activeContracts.length;
      const totalValue = activeContracts.reduce((sum: number, c: ContractRow) => sum + c.totalValue, 0);
      const avgContractValue = totalActive > 0 ? Math.round(totalValue / totalActive) : 0;

      // Get expiring contracts (next 90 days)
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const expiringContracts = await this.db.select()
        .from(contracts)
        .where(and(
          eq(contracts.tenantId, tenantId),
          eq(contracts.status, 'active'),
          lte(contracts.expirationDate, ninetyDaysFromNow),
          gte(contracts.expirationDate, new Date())
        ))
        .orderBy(asc(contracts.expirationDate))
        .limit(10);

      const expiringContractSummaries = expiringContracts.map((c: ContractRow) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        name: c.name,
        customerName: c.customerName,
        totalValue: c.totalValue,
        expirationDate: c.expirationDate,
        daysUntilExpiration: Math.round((c.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        status: c.status as ContractStatus,
      }));

      // Get pending approvals
      const pendingApprovals = await this.db.select()
        .from(contractApprovals)
        .where(and(
          eq(contractApprovals.tenantId, tenantId),
          eq(contractApprovals.status, 'pending')
        ))
        .limit(10);

      // Get pending signatures
      const pendingSignatures = await this.db.select()
        .from(signatureRequests)
        .where(and(
          eq(signatureRequests.tenantId, tenantId),
          inArray(signatureRequests.status, ['sent', 'partially_signed'])
        ))
        .limit(10);

      // Get overdue obligations
      const overdueObligations = await this.db.select()
        .from(contractObligations)
        .where(and(
          eq(contractObligations.tenantId, tenantId),
          or(
            eq(contractObligations.status, 'overdue'),
            and(
              eq(contractObligations.status, 'pending'),
              lte(contractObligations.dueDate, new Date())
            )
          )
        ))
        .limit(10);

      // Status distribution
      const allContracts = await this.db.select()
        .from(contracts)
        .where(eq(contracts.tenantId, tenantId));

      const statusDistribution: { status: ContractStatus; count: number; value: number }[] = [];
      const statusGroups = new Map<string, { count: number; value: number }>();

      allContracts.forEach((c: ContractRow) => {
        const existing = statusGroups.get(c.status) || { count: 0, value: 0 };
        statusGroups.set(c.status, {
          count: existing.count + 1,
          value: existing.value + c.totalValue,
        });
      });

      statusGroups.forEach((value, status) => {
        statusDistribution.push({
          status: status as ContractStatus,
          count: value.count,
          value: value.value,
        });
      });

      return Result.ok({
        tenantId,
        summary: {
          totalActive,
          totalValue,
          avgContractValue,
          renewalRate: 0, // Would calculate
        },
        expiringContracts: expiringContractSummaries,
        pendingApprovals: pendingApprovals.map((a: ContractApprovalRow) => ({
          id: a.id,
          contractId: a.contractId,
          contractName: '',
          currentStep: `Step ${a.currentStepOrder}`,
          requestedAt: a.requestedAt,
          daysWaiting: Math.round((Date.now() - a.requestedAt.getTime()) / (1000 * 60 * 60 * 24)),
        })),
        pendingSignatures: pendingSignatures.map((s: SignatureRequestRow) => {
          const signatories = s.signatories as Signatory[];
          return {
            id: s.id,
            contractId: s.contractId,
            contractName: '',
            pendingSignatures: signatories.filter((sg: Signatory) => sg.status === 'pending').length,
            totalSignatures: signatories.filter((sg: Signatory) => sg.role === 'signer').length,
            sentAt: s.sentAt || s.createdAt,
          };
        }),
        overdueObligations: overdueObligations.map((o: ContractObligationRow) => ({
          id: o.id,
          contractId: o.contractId,
          contractName: '',
          title: o.title,
          dueDate: o.dueDate,
          daysOverdue: Math.round((Date.now() - o.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
        })),
        valueTrend: [],
        statusDistribution,
        typeDistribution: [],
      });
    } catch (error) {
      return Result.fail(`Failed to get dashboard: ${error}`);
    }
  }

  // ============================================================================
  // EVENTS
  // ============================================================================

  /**
   * Get contract events/activity log
   */
  async getEvents(
    contractId: string,
    tenantId: string,
    limit = 50
  ): Promise<Result<ContractEventRow[]>> {
    try {
      const events = await this.db.select()
        .from(contractEvents)
        .where(and(
          eq(contractEvents.contractId, contractId),
          eq(contractEvents.tenantId, tenantId)
        ))
        .orderBy(desc(contractEvents.occurredAt))
        .limit(limit);

      return Result.ok(events);
    } catch (error) {
      return Result.fail(`Failed to get events: ${error}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async generateContractNumber(tenantId: string, type: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type.substring(0, 3).toUpperCase();

    // Get count of contracts this year
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(and(
        eq(contracts.tenantId, tenantId),
        gte(contracts.createdAt, new Date(`${year}-01-01`))
      ));

    const sequence = String(Number(count) + 1).padStart(5, '0');
    return `${prefix}-${year}-${sequence}`;
  }

  private async logEvent(
    contractId: string,
    tenantId: string,
    type: ContractEventType,
    description: string,
    userId?: string,
    userName?: string,
    relatedType?: string,
    relatedId?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    await this.db.insert(contractEvents)
      .values({
        id: uuidv4(),
        contractId,
        tenantId,
        type,
        description,
        userId,
        userName,
        relatedType,
        relatedId,
        metadata,
        occurredAt: new Date(),
      });
  }
}

import { AggregateRoot, Result, Email } from '@zuclubit/domain';
import { LeadStatus, LeadStatusEnum, LeadScore } from '../value-objects';
import { LeadEvents } from '../events';

/**
 * Lead Aggregate Root
 * Represents a potential customer in the sales pipeline
 */
export class Lead extends AggregateRoot {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private companyName: string,
    private email: Email,
    private phone: string | null,
    private website: string | null,
    private industry: string | null,
    private employeeCount: number | null,
    private annualRevenue: number | null,
    private status: LeadStatus,
    private score: LeadScore,
    private source: string,
    private ownerId: string | null,
    private notes: string | null,
    private customFields: Record<string, unknown>,
    public readonly createdAt: Date,
    private updatedAt: Date,
    private lastActivityAt: Date | null,
    private nextFollowUpAt: Date | null
  ) {
    super();
  }

  /**
   * Factory method to create a new Lead
   */
  static create(props: {
    tenantId: string;
    companyName: string;
    email: string;
    phone?: string;
    website?: string;
    industry?: string;
    employeeCount?: number;
    annualRevenue?: number;
    source: string;
    ownerId?: string;
    notes?: string;
    customFields?: Record<string, unknown>;
  }): Result<Lead> {
    // Validation
    if (!props.companyName || props.companyName.trim().length === 0) {
      return Result.fail('Company name is required');
    }

    if (props.companyName.length > 255) {
      return Result.fail('Company name is too long (max 255 characters)');
    }

    const emailResult = Email.create(props.email);
    if (emailResult.isFailure) {
      return Result.fail(emailResult.error as string);
    }

    if (!props.source || props.source.trim().length === 0) {
      return Result.fail('Lead source is required');
    }

    // Create lead with default values
    const lead = new Lead(
      crypto.randomUUID(),
      props.tenantId,
      props.companyName.trim(),
      emailResult.getValue(),
      props.phone || null,
      props.website || null,
      props.industry || null,
      props.employeeCount || null,
      props.annualRevenue || null,
      LeadStatus.new(),
      LeadScore.default(),
      props.source.trim(),
      props.ownerId || null,
      props.notes || null,
      props.customFields || {},
      new Date(),
      new Date(),
      null,
      null
    );

    // Add domain event
    lead.addDomainEvent(
      LeadEvents.created({
        leadId: lead.id,
        tenantId: lead.tenantId,
        companyName: lead.companyName,
        email: lead.email.value,
        source: lead.source,
      })
    );

    return Result.ok(lead);
  }

  /**
   * Factory method to reconstitute Lead from persistence
   */
  static reconstitute(props: {
    id: string;
    tenantId: string;
    companyName: string;
    email: string;
    phone: string | null;
    website: string | null;
    industry: string | null;
    employeeCount: number | null;
    annualRevenue: number | null;
    status: string;
    score: number;
    source: string;
    ownerId: string | null;
    notes: string | null;
    customFields: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date | null;
    nextFollowUpAt: Date | null;
  }): Result<Lead> {
    const emailResult = Email.create(props.email);
    if (emailResult.isFailure) {
      return Result.fail(emailResult.error as string);
    }

    const statusResult = LeadStatus.create(props.status);
    if (statusResult.isFailure) {
      return Result.fail(statusResult.error as string);
    }

    const scoreResult = LeadScore.create(props.score);
    if (scoreResult.isFailure) {
      return Result.fail(scoreResult.error as string);
    }

    return Result.ok(
      new Lead(
        props.id,
        props.tenantId,
        props.companyName,
        emailResult.getValue(),
        props.phone,
        props.website,
        props.industry,
        props.employeeCount,
        props.annualRevenue,
        statusResult.getValue(),
        scoreResult.getValue(),
        props.source,
        props.ownerId,
        props.notes,
        props.customFields,
        props.createdAt,
        props.updatedAt,
        props.lastActivityAt,
        props.nextFollowUpAt
      )
    );
  }

  /**
   * Update lead information
   */
  update(props: {
    companyName?: string;
    email?: string;
    phone?: string;
    website?: string;
    industry?: string;
    employeeCount?: number;
    annualRevenue?: number;
    notes?: string;
  }): Result<void> {
    if (this.status.isClosed()) {
      return Result.fail('Cannot update closed lead');
    }

    if (props.companyName !== undefined) {
      if (!props.companyName || props.companyName.trim().length === 0) {
        return Result.fail('Company name cannot be empty');
      }
      this.companyName = props.companyName.trim();
    }

    if (props.email !== undefined) {
      const emailResult = Email.create(props.email);
      if (emailResult.isFailure) {
        return Result.fail(emailResult.error as string);
      }
      this.email = emailResult.getValue();
    }

    if (props.phone !== undefined) this.phone = props.phone || null;
    if (props.website !== undefined) this.website = props.website || null;
    if (props.industry !== undefined) this.industry = props.industry || null;
    if (props.employeeCount !== undefined) this.employeeCount = props.employeeCount || null;
    if (props.annualRevenue !== undefined) this.annualRevenue = props.annualRevenue || null;
    if (props.notes !== undefined) this.notes = props.notes || null;

    this.updatedAt = new Date();
    return Result.ok();
  }

  /**
   * Change lead status
   */
  changeStatus(newStatus: LeadStatusEnum, changedBy: string): Result<void> {
    const newStatusVO = LeadStatus.create(newStatus);
    if (newStatusVO.isFailure) {
      return Result.fail(newStatusVO.error as string);
    }

    const newStatusValue = newStatusVO.getValue();

    // Check if transition is valid
    if (!this.status.canTransitionTo(newStatusValue)) {
      return Result.fail(
        `Invalid status transition from ${this.status.value} to ${newStatus}`
      );
    }

    const oldStatus = this.status.value;
    this.status = newStatusValue;
    this.updatedAt = new Date();

    // Add domain event
    this.addDomainEvent(
      LeadEvents.statusChanged({
        leadId: this.id,
        tenantId: this.tenantId,
        oldStatus,
        newStatus,
        changedBy,
      })
    );

    return Result.ok();
  }

  /**
   * Qualify the lead
   */
  qualify(qualifiedBy: string): Result<void> {
    if (!this.score.isQualified()) {
      return Result.fail(`Lead score (${this.score.value}) is below qualification threshold`);
    }

    const result = this.changeStatus(LeadStatusEnum.QUALIFIED, qualifiedBy);
    if (result.isFailure) {
      return result;
    }

    this.addDomainEvent(
      LeadEvents.qualified({
        leadId: this.id,
        tenantId: this.tenantId,
        score: this.score.value,
        qualifiedBy,
      })
    );

    return Result.ok();
  }

  /**
   * Update lead score
   */
  updateScore(newScore: number, reason?: string): Result<void> {
    const scoreResult = LeadScore.create(newScore);
    if (scoreResult.isFailure) {
      return Result.fail(scoreResult.error as string);
    }

    const oldScore = this.score.value;
    this.score = scoreResult.getValue();
    this.updatedAt = new Date();

    this.addDomainEvent(
      LeadEvents.scoreChanged({
        leadId: this.id,
        tenantId: this.tenantId,
        oldScore,
        newScore,
        reason,
      })
    );

    return Result.ok();
  }

  /**
   * Assign lead to owner
   */
  assignTo(ownerId: string, assignedBy: string): Result<void> {
    if (this.status.isClosed()) {
      return Result.fail('Cannot assign closed lead');
    }

    this.ownerId = ownerId;
    this.updatedAt = new Date();

    this.addDomainEvent(
      LeadEvents.assigned({
        leadId: this.id,
        tenantId: this.tenantId,
        assignedTo: ownerId,
        assignedBy,
      })
    );

    return Result.ok();
  }

  /**
   * Mark lead as lost
   */
  markAsLost(reason: string, lostBy: string): Result<void> {
    if (this.status.isClosed()) {
      return Result.fail('Lead is already closed');
    }

    const result = this.changeStatus(LeadStatusEnum.LOST, lostBy);
    if (result.isFailure) {
      return result;
    }

    this.addDomainEvent(
      LeadEvents.lost({
        leadId: this.id,
        tenantId: this.tenantId,
        reason,
        lostBy,
      })
    );

    return Result.ok();
  }

  /**
   * Schedule next follow-up
   */
  scheduleFollowUp(date: Date): Result<void> {
    if (this.status.isClosed()) {
      return Result.fail('Cannot schedule follow-up for closed lead');
    }

    if (date < new Date()) {
      return Result.fail('Follow-up date must be in the future');
    }

    this.nextFollowUpAt = date;
    this.updatedAt = new Date();

    return Result.ok();
  }

  /**
   * Record activity
   */
  recordActivity(): void {
    this.lastActivityAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Getters
   */
  getCompanyName(): string {
    return this.companyName;
  }

  getEmail(): Email {
    return this.email;
  }

  getPhone(): string | null {
    return this.phone;
  }

  getWebsite(): string | null {
    return this.website;
  }

  getIndustry(): string | null {
    return this.industry;
  }

  getEmployeeCount(): number | null {
    return this.employeeCount;
  }

  getAnnualRevenue(): number | null {
    return this.annualRevenue;
  }

  getStatus(): LeadStatus {
    return this.status;
  }

  getScore(): LeadScore {
    return this.score;
  }

  getSource(): string {
    return this.source;
  }

  getOwnerId(): string | null {
    return this.ownerId;
  }

  getNotes(): string | null {
    return this.notes;
  }

  getCustomFields(): Record<string, unknown> {
    return { ...this.customFields };
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getLastActivityAt(): Date | null {
    return this.lastActivityAt;
  }

  getNextFollowUpAt(): Date | null {
    return this.nextFollowUpAt;
  }

  /**
   * Check if follow-up is overdue
   */
  isFollowUpOverdue(): boolean {
    if (!this.nextFollowUpAt) return false;
    return this.nextFollowUpAt < new Date();
  }
}

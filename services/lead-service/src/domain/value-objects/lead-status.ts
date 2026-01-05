import { ValueObject, Result } from '@zuclubit/domain';

/**
 * Lead Status Value Object
 *
 * Represents the current status in the sales pipeline.
 * Simplified to 6 core states that represent the lifecycle of a lead.
 *
 * Note: Visual pipeline stages (Kanban columns) are managed separately
 * via the pipeline_stages table, allowing per-tenant customization.
 * This enum represents the business logic state machine.
 */
export enum LeadStatusEnum {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  WON = 'won',
  LOST = 'lost',
}

interface LeadStatusProps {
  value: LeadStatusEnum;
}

export class LeadStatus extends ValueObject<LeadStatusProps> {
  private constructor(props: LeadStatusProps) {
    super(props);
  }

  static create(status: string): Result<LeadStatus> {
    const normalizedStatus = status.toLowerCase();

    if (!Object.values(LeadStatusEnum).includes(normalizedStatus as LeadStatusEnum)) {
      return Result.fail(`Invalid lead status: ${status}`);
    }

    return Result.ok(new LeadStatus({ value: normalizedStatus as LeadStatusEnum }));
  }

  static new(): LeadStatus {
    return new LeadStatus({ value: LeadStatusEnum.NEW });
  }

  get value(): LeadStatusEnum {
    return this.props.value;
  }

  isNew(): boolean {
    return this.props.value === LeadStatusEnum.NEW;
  }

  isQualified(): boolean {
    return this.props.value === LeadStatusEnum.QUALIFIED;
  }

  isWon(): boolean {
    return this.props.value === LeadStatusEnum.WON;
  }

  isLost(): boolean {
    return this.props.value === LeadStatusEnum.LOST;
  }

  isClosed(): boolean {
    return this.isWon() || this.isLost();
  }

  /**
   * Check if transition to new status is valid
   *
   * Simplified transition rules:
   * - NEW → CONTACTED, LOST
   * - CONTACTED → QUALIFIED, LOST
   * - QUALIFIED → PROPOSAL, LOST
   * - PROPOSAL → WON, LOST
   * - WON/LOST → (terminal, no transitions)
   */
  canTransitionTo(newStatus: LeadStatus): boolean {
    const currentStatus = this.props.value;
    const targetStatus = newStatus.value;

    // Cannot transition from closed states
    if (this.isClosed()) {
      return false;
    }

    // Define valid transitions (simplified linear pipeline)
    const validTransitions: Record<LeadStatusEnum, LeadStatusEnum[]> = {
      [LeadStatusEnum.NEW]: [
        LeadStatusEnum.CONTACTED,
        LeadStatusEnum.LOST,
      ],
      [LeadStatusEnum.CONTACTED]: [
        LeadStatusEnum.QUALIFIED,
        LeadStatusEnum.LOST,
      ],
      [LeadStatusEnum.QUALIFIED]: [
        LeadStatusEnum.PROPOSAL,
        LeadStatusEnum.LOST,
      ],
      [LeadStatusEnum.PROPOSAL]: [
        LeadStatusEnum.WON,
        LeadStatusEnum.LOST,
      ],
      [LeadStatusEnum.WON]: [],
      [LeadStatusEnum.LOST]: [],
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }

  toString(): string {
    return this.props.value;
  }
}

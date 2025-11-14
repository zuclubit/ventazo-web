import { ValueObject, Result } from '@zuclubit/domain';

/**
 * Lead Status Value Object
 * Represents the current status in the sales pipeline
 */
export enum LeadStatusEnum {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
  UNQUALIFIED = 'unqualified',
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
   */
  canTransitionTo(newStatus: LeadStatus): boolean {
    const currentStatus = this.props.value;
    const targetStatus = newStatus.value;

    // Cannot transition from closed states
    if (this.isClosed()) {
      return false;
    }

    // Define valid transitions
    const validTransitions: Record<LeadStatusEnum, LeadStatusEnum[]> = {
      [LeadStatusEnum.NEW]: [
        LeadStatusEnum.CONTACTED,
        LeadStatusEnum.UNQUALIFIED,
        LeadStatusEnum.LOST,
      ],
      [LeadStatusEnum.CONTACTED]: [
        LeadStatusEnum.QUALIFIED,
        LeadStatusEnum.UNQUALIFIED,
        LeadStatusEnum.LOST,
      ],
      [LeadStatusEnum.QUALIFIED]: [
        LeadStatusEnum.PROPOSAL,
        LeadStatusEnum.UNQUALIFIED,
        LeadStatusEnum.LOST,
      ],
      [LeadStatusEnum.PROPOSAL]: [
        LeadStatusEnum.NEGOTIATION,
        LeadStatusEnum.WON,
        LeadStatusEnum.LOST,
      ],
      [LeadStatusEnum.NEGOTIATION]: [LeadStatusEnum.WON, LeadStatusEnum.LOST],
      [LeadStatusEnum.WON]: [],
      [LeadStatusEnum.LOST]: [],
      [LeadStatusEnum.UNQUALIFIED]: [],
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }

  toString(): string {
    return this.props.value;
  }
}

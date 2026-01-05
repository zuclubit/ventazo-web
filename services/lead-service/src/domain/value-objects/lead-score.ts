import { ValueObject, Result } from '@zuclubit/domain';

/**
 * Lead Score Value Object
 * Represents a lead's qualification score (0-100)
 */
interface LeadScoreProps {
  value: number;
}

export class LeadScore extends ValueObject<LeadScoreProps> {
  private static readonly MIN_SCORE = 0;
  private static readonly MAX_SCORE = 100;
  private static readonly QUALIFIED_THRESHOLD = 60;

  private constructor(props: LeadScoreProps) {
    super(props);
  }

  static create(score: number): Result<LeadScore> {
    if (score < this.MIN_SCORE || score > this.MAX_SCORE) {
      return Result.fail(`Score must be between ${this.MIN_SCORE} and ${this.MAX_SCORE}`);
    }

    if (!Number.isInteger(score)) {
      return Result.fail('Score must be an integer');
    }

    return Result.ok(new LeadScore({ value: score }));
  }

  static default(): LeadScore {
    return new LeadScore({ value: 50 });
  }

  static fromPercentage(percentage: number): Result<LeadScore> {
    if (percentage < 0 || percentage > 1) {
      return Result.fail('Percentage must be between 0 and 1');
    }

    const score = Math.round(percentage * this.MAX_SCORE);
    return this.create(score);
  }

  get value(): number {
    return this.props.value;
  }

  /**
   * Check if lead meets qualification threshold
   */
  isQualified(): boolean {
    return this.props.value >= LeadScore.QUALIFIED_THRESHOLD;
  }

  /**
   * Get score category
   */
  getCategory(): 'hot' | 'warm' | 'cold' {
    if (this.props.value >= 80) return 'hot';
    if (this.props.value >= 50) return 'warm';
    return 'cold';
  }

  /**
   * Increase score by amount
   */
  increase(amount: number): Result<LeadScore> {
    const newScore = Math.min(this.props.value + amount, LeadScore.MAX_SCORE);
    return LeadScore.create(newScore);
  }

  /**
   * Decrease score by amount
   */
  decrease(amount: number): Result<LeadScore> {
    const newScore = Math.max(this.props.value - amount, LeadScore.MIN_SCORE);
    return LeadScore.create(newScore);
  }

  /**
   * Set exact score
   */
  setScore(newScore: number): Result<LeadScore> {
    return LeadScore.create(newScore);
  }

  toString(): string {
    return `${this.props.value}/100`;
  }

  toPercentage(): number {
    return this.props.value / LeadScore.MAX_SCORE;
  }
}

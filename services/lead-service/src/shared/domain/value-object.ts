import { Result } from './result';

/**
 * Base class for Value Objects
 * Value Objects are immutable and compared by value, not identity
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  /**
   * Check if two value objects are equal
   */
  equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * Get the underlying value
   */
  getValue(): T {
    return this.props;
  }
}

/**
 * Email Value Object
 */
interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(props: EmailProps) {
    super(props);
  }

  static create(email: string): Result<Email> {
    if (!email || email.trim().length === 0) {
      return Result.fail('Email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!this.EMAIL_REGEX.test(normalizedEmail)) {
      return Result.fail('Invalid email format');
    }

    if (normalizedEmail.length > 255) {
      return Result.fail('Email is too long (max 255 characters)');
    }

    return Result.ok(new Email({ value: normalizedEmail }));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Money Value Object
 */
interface MoneyProps {
  amount: number;
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static create(amount: number, currency: string = 'USD'): Result<Money> {
    if (isNaN(amount)) {
      return Result.fail('Amount must be a valid number');
    }

    if (!currency || currency.trim().length !== 3) {
      return Result.fail('Currency must be a 3-letter code');
    }

    return Result.ok(new Money({ amount, currency: currency.toUpperCase() }));
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  add(other: Money): Result<Money> {
    if (this.currency !== other.currency) {
      return Result.fail('Cannot add money with different currencies');
    }
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Result<Money> {
    if (this.currency !== other.currency) {
      return Result.fail('Cannot subtract money with different currencies');
    }
    return Money.create(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Result<Money> {
    return Money.create(this.amount * factor, this.currency);
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

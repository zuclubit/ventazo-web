import { Result } from '../result';
import { ValueObject } from './value-object';

interface MoneyProps {
  amount: number;
  currency: string;
}

/**
 * Money Value Object
 * Uses integer cents to avoid floating point errors
 */
export class Money extends ValueObject<MoneyProps> {
  private static readonly SUPPORTED_CURRENCIES = ['MXN', 'USD', 'EUR'];

  private constructor(props: MoneyProps) {
    super(props);
  }

  static create(amount: number, currency: string): Result<Money> {
    if (amount < 0) {
      return Result.fail('Amount cannot be negative');
    }

    if (!Number.isInteger(amount)) {
      return Result.fail('Amount must be in cents (integer)');
    }

    const upperCurrency = currency.toUpperCase();
    if (!this.SUPPORTED_CURRENCIES.includes(upperCurrency)) {
      return Result.fail(`Currency ${currency} is not supported`);
    }

    return Result.ok(new Money({ amount, currency: upperCurrency }));
  }

  static zero(currency = 'MXN'): Money {
    return new Money({ amount: 0, currency });
  }

  static fromDecimal(decimal: number, currency: string): Result<Money> {
    if (decimal < 0) {
      return Result.fail('Amount cannot be negative');
    }
    // Convert decimal to cents (e.g., 10.50 -> 1050)
    const cents = Math.round(decimal * 100);
    return this.create(cents, currency);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get decimal(): number {
    return this.props.amount / 100;
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
    if (this.amount < other.amount) {
      return Result.fail('Cannot subtract to negative amount');
    }
    return Money.create(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Result<Money> {
    if (factor < 0) {
      return Result.fail('Cannot multiply by negative factor');
    }
    const newAmount = Math.round(this.amount * factor);
    return Money.create(newAmount, this.currency);
  }

  toString(): string {
    return `${this.decimal.toFixed(2)} ${this.currency}`;
  }
}

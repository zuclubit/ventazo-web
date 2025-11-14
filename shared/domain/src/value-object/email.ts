import { Result } from '../result';
import { ValueObject } from './value-object';

interface EmailProps {
  value: string;
}

/**
 * Email Value Object
 */
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

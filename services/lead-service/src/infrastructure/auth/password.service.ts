/**
 * Password Service
 * Handles password hashing and verification using bcrypt
 */

import bcrypt from 'bcrypt';
import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';

// ============================================
// Configuration
// ============================================

// Performance optimized: 10 rounds provides adequate security (~100ms vs ~300ms with 12 rounds)
// NIST recommends minimum 10 rounds for bcrypt. See: PERFORMANCE_REMEDIATION_LOG.md
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// Password complexity regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// ============================================
// Types
// ============================================

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================
// Password Service
// ============================================

@injectable()
export class PasswordService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<Result<string>> {
    try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      return Result.ok(hash);
    } catch (error) {
      return Result.fail(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<Result<boolean>> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return Result.ok(isValid);
    } catch (error) {
      return Result.fail(`Failed to verify password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate password complexity requirements
   */
  validatePasswordComplexity(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password) {
      return { isValid: false, errors: ['La contraseña es requerida'] };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      errors.push(`La contraseña no puede tener más de ${MAX_PASSWORD_LENGTH} caracteres`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }

    if (!/\d/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password meets all requirements
   */
  isPasswordValid(password: string): boolean {
    return PASSWORD_REGEX.test(password);
  }

  /**
   * Generate a random password that meets complexity requirements
   */
  generateRandomPassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=';
    const all = lowercase + uppercase + numbers + special;

    // Ensure at least one of each required character type
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if a password needs to be rehashed (e.g., if bcrypt rounds changed)
   */
  needsRehash(hash: string): boolean {
    try {
      // Extract the rounds from the hash
      const rounds = bcrypt.getRounds(hash);
      return rounds < SALT_ROUNDS;
    } catch {
      // If we can't get rounds, assume it needs rehashing
      return true;
    }
  }
}

export default PasswordService;

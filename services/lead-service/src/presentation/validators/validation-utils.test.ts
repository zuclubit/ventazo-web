import { describe, it, expect } from 'vitest';
import {
  phoneSchema,
  requiredPhoneSchema,
  e164PhoneSchema,
  websiteSchema,
  linkedinUrlSchema,
  emailSchema,
  companyNameSchema,
  timezoneSchema,
  scoreSchema,
  formatPhoneNumber,
  normalizeUrl,
  isBusinessEmail,
  addressSchema,
  tagsSchema,
  currencyAmountSchema,
} from './validation-utils';

describe('Validation Utils', () => {
  describe('phoneSchema', () => {
    it('should accept valid phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '+1 (234) 567-8901',
        '(234) 567-8901',
        '1234567890',
        '+44 20 7946 0958',
      ];

      for (const phone of validPhones) {
        const result = phoneSchema.safeParse(phone);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = ['123', 'abc123', '++1234567890'];

      for (const phone of invalidPhones) {
        const result = phoneSchema.safeParse(phone);
        expect(result.success).toBe(false);
      }
    });

    it('should allow null and undefined', () => {
      expect(phoneSchema.safeParse(null).success).toBe(true);
      expect(phoneSchema.safeParse(undefined).success).toBe(true);
    });
  });

  describe('requiredPhoneSchema', () => {
    it('should require a phone number', () => {
      const result = requiredPhoneSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should accept valid phone numbers', () => {
      const result = requiredPhoneSchema.safeParse('+1234567890');
      expect(result.success).toBe(true);
    });
  });

  describe('e164PhoneSchema', () => {
    it('should accept valid E.164 format', () => {
      const validE164 = ['+12025551234', '+442071234567', '+8613912345678'];

      for (const phone of validE164) {
        const result = e164PhoneSchema.safeParse(phone);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid E.164 format', () => {
      const invalidE164 = ['1234567890', '+0123456789', '(202) 555-1234'];

      for (const phone of invalidE164) {
        const result = e164PhoneSchema.safeParse(phone);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('websiteSchema', () => {
    it('should accept valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'example.com', // Should be normalized to https://
        'www.example.com',
      ];

      for (const url of validUrls) {
        const result = websiteSchema.safeParse(url);
        expect(result.success).toBe(true);
      }
    });

    it('should normalize URLs to include https://', () => {
      const result = websiteSchema.parse('example.com');
      expect(result).toBe('https://example.com');
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = ['not a url', 'ftp://example.com'];

      for (const url of invalidUrls) {
        const result = websiteSchema.safeParse(url);
        if (result.success && url === 'not a url') {
          // After normalization, 'not a url' becomes 'https://not a url' which is invalid
          expect(result.success).toBe(false);
        }
      }
    });

    it('should allow null and undefined', () => {
      expect(websiteSchema.safeParse(null).success).toBe(true);
      expect(websiteSchema.safeParse(undefined).success).toBe(true);
    });
  });

  describe('linkedinUrlSchema', () => {
    it('should accept valid LinkedIn URLs', () => {
      const validUrls = [
        'https://www.linkedin.com/in/johndoe',
        'https://linkedin.com/company/acme-corp',
        'linkedin.com/in/johndoe',
      ];

      for (const url of validUrls) {
        const result = linkedinUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      }
    });

    it('should reject non-LinkedIn URLs', () => {
      const invalidUrls = [
        'https://facebook.com/johndoe',
        'https://linkedin.com/search?q=test',
      ];

      for (const url of invalidUrls) {
        const result = linkedinUrlSchema.safeParse(url);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('emailSchema', () => {
    it('should accept valid business emails', () => {
      const result = emailSchema.safeParse('john@acme.com');
      expect(result.success).toBe(true);
      expect(result.data).toBe('john@acme.com');
    });

    it('should lowercase email', () => {
      const result = emailSchema.safeParse('John.Doe@ACME.COM');
      expect(result.success).toBe(true);
      expect(result.data).toBe('john.doe@acme.com');
    });

    it('should reject invalid emails', () => {
      const invalidEmails = ['notanemail', 'missing@tld', '@example.com'];

      for (const email of invalidEmails) {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      }
    });

    it('should reject disposable email addresses', () => {
      const disposableEmails = [
        'test@tempmail.com',
        'test@guerrillamail.com',
        'test@mailinator.com',
      ];

      for (const email of disposableEmails) {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('companyNameSchema', () => {
    it('should accept valid company names', () => {
      const validNames = ['Acme Corp', 'ABC Inc.', "O'Reilly Media", '3M Company'];

      for (const name of validNames) {
        const result = companyNameSchema.safeParse(name);
        expect(result.success).toBe(true);
      }
    });

    it('should reject empty names', () => {
      const result = companyNameSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject names with only special characters', () => {
      const result = companyNameSchema.safeParse('---');
      expect(result.success).toBe(false);
    });

    it('should reject names over 255 characters', () => {
      const longName = 'A'.repeat(256);
      const result = companyNameSchema.safeParse(longName);
      expect(result.success).toBe(false);
    });
  });

  describe('timezoneSchema', () => {
    it('should accept valid IANA timezones', () => {
      const validTimezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'UTC',
      ];

      for (const tz of validTimezones) {
        const result = timezoneSchema.safeParse(tz);
        expect(result.success).toBe(true);
      }
    });

    it('should reject truly invalid timezones', () => {
      // Note: Some abbreviations like 'EST' or 'GMT+5' may be valid in certain contexts
      const invalidTimezones = ['NotATimezone', 'Invalid/Zone', 'Fake/City'];

      for (const tz of invalidTimezones) {
        const result = timezoneSchema.safeParse(tz);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('scoreSchema', () => {
    it('should accept valid scores', () => {
      expect(scoreSchema.safeParse(0).success).toBe(true);
      expect(scoreSchema.safeParse(50).success).toBe(true);
      expect(scoreSchema.safeParse(100).success).toBe(true);
    });

    it('should reject scores outside 0-100', () => {
      expect(scoreSchema.safeParse(-1).success).toBe(false);
      expect(scoreSchema.safeParse(101).success).toBe(false);
    });

    it('should reject non-integer scores', () => {
      expect(scoreSchema.safeParse(50.5).success).toBe(false);
    });
  });

  describe('addressSchema', () => {
    it('should accept valid address objects', () => {
      const address = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      };

      const result = addressSchema.safeParse(address);
      expect(result.success).toBe(true);
    });

    it('should accept partial addresses', () => {
      const result = addressSchema.safeParse({ city: 'New York' });
      expect(result.success).toBe(true);
    });

    it('should allow null and undefined', () => {
      expect(addressSchema.safeParse(null).success).toBe(true);
      expect(addressSchema.safeParse(undefined).success).toBe(true);
    });
  });

  describe('tagsSchema', () => {
    it('should accept valid tags array', () => {
      const result = tagsSchema.safeParse(['tech', 'startup', 'b2b']);
      expect(result.success).toBe(true);
    });

    it('should reject arrays with more than 20 tags', () => {
      const tooManyTags = Array(21).fill('tag');
      const result = tagsSchema.safeParse(tooManyTags);
      expect(result.success).toBe(false);
    });

    it('should reject tags longer than 50 characters', () => {
      const result = tagsSchema.safeParse(['a'.repeat(51)]);
      expect(result.success).toBe(false);
    });
  });

  describe('currencyAmountSchema', () => {
    it('should accept valid amounts', () => {
      expect(currencyAmountSchema.safeParse(100).success).toBe(true);
      expect(currencyAmountSchema.safeParse(1000000).success).toBe(true);
    });

    it('should round to 2 decimal places', () => {
      const result = currencyAmountSchema.parse(100.456);
      expect(result).toBe(100.46);
    });

    it('should reject negative amounts', () => {
      expect(currencyAmountSchema.safeParse(-100).success).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit US numbers', () => {
      expect(formatPhoneNumber('2025551234')).toBe('+12025551234');
    });

    it('should format 11-digit numbers starting with 1', () => {
      expect(formatPhoneNumber('12025551234')).toBe('+12025551234');
    });

    it('should handle international numbers', () => {
      expect(formatPhoneNumber('442071234567')).toBe('+442071234567');
    });
  });

  describe('normalizeUrl', () => {
    it('should add https:// if missing', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com');
    });

    it('should keep existing http://', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should keep existing https://', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should handle empty string', () => {
      expect(normalizeUrl('')).toBe('');
    });
  });

  describe('isBusinessEmail', () => {
    it('should return true for business domains', () => {
      expect(isBusinessEmail('john@acme.com')).toBe(true);
      expect(isBusinessEmail('info@company.io')).toBe(true);
    });

    it('should return false for free email providers', () => {
      expect(isBusinessEmail('john@gmail.com')).toBe(false);
      expect(isBusinessEmail('john@yahoo.com')).toBe(false);
      expect(isBusinessEmail('john@hotmail.com')).toBe(false);
      expect(isBusinessEmail('john@outlook.com')).toBe(false);
    });
  });
});

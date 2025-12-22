import { Result } from '@zuclubit/domain';

/**
 * Contact Type Enum
 * Defines the type of contact person
 */
export enum ContactType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  BILLING = 'billing',
  TECHNICAL = 'technical',
  DECISION_MAKER = 'decision_maker',
  INFLUENCER = 'influencer',
  OTHER = 'other',
}

/**
 * Contact Role Enum
 * Defines the role of the contact person
 */
export enum ContactRole {
  CEO = 'ceo',
  CTO = 'cto',
  CFO = 'cfo',
  COO = 'coo',
  VP = 'vp',
  DIRECTOR = 'director',
  MANAGER = 'manager',
  ENGINEER = 'engineer',
  ANALYST = 'analyst',
  CONSULTANT = 'consultant',
  ASSISTANT = 'assistant',
  OTHER = 'other',
}

/**
 * Contact Communication Preferences
 */
export interface ContactPreferences {
  preferredContactMethod: 'email' | 'phone' | 'both';
  timezone?: string;
  bestTimeToCall?: string;
  doNotCall?: boolean;
  doNotEmail?: boolean;
  language?: string;
}

/**
 * Contact Props
 */
export interface ContactProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  mobilePhone: string | null;
  jobTitle: string | null;
  department: string | null;
  type: ContactType;
  role: ContactRole | null;
  isPrimary: boolean;
  preferences: ContactPreferences | null;
  linkedInUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contact Update Props - allows undefined for partial updates
 */
export interface ContactUpdateProps {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  mobilePhone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  type?: ContactType;
  role?: ContactRole | null;
  isPrimary?: boolean;
  preferences?: ContactPreferences | null;
  linkedInUrl?: string | null;
  notes?: string | null;
}

/**
 * Contact Value Object
 * Represents a contact person associated with a lead
 */
export class Contact {
  private constructor(private readonly props: ContactProps) {}

  /**
   * Factory method to create a new Contact
   */
  static create(props: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    mobilePhone?: string;
    jobTitle?: string;
    department?: string;
    type?: ContactType;
    role?: ContactRole;
    isPrimary?: boolean;
    preferences?: ContactPreferences;
    linkedInUrl?: string;
    notes?: string;
  }): Result<Contact> {
    // Validate required fields
    if (!props.firstName || props.firstName.trim().length === 0) {
      return Result.fail('First name is required');
    }

    if (props.firstName.length > 100) {
      return Result.fail('First name is too long (max 100 characters)');
    }

    if (!props.lastName || props.lastName.trim().length === 0) {
      return Result.fail('Last name is required');
    }

    if (props.lastName.length > 100) {
      return Result.fail('Last name is too long (max 100 characters)');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!props.email || !emailRegex.test(props.email)) {
      return Result.fail('Valid email is required');
    }

    if (props.email.length > 255) {
      return Result.fail('Email is too long (max 255 characters)');
    }

    // Validate phone if provided
    if (props.phone && props.phone.length > 50) {
      return Result.fail('Phone is too long (max 50 characters)');
    }

    // Validate LinkedIn URL if provided
    if (props.linkedInUrl) {
      if (!props.linkedInUrl.includes('linkedin.com')) {
        return Result.fail('Invalid LinkedIn URL');
      }
      if (props.linkedInUrl.length > 500) {
        return Result.fail('LinkedIn URL is too long (max 500 characters)');
      }
    }

    const now = new Date();

    return Result.ok(
      new Contact({
        id: crypto.randomUUID(),
        firstName: props.firstName.trim(),
        lastName: props.lastName.trim(),
        email: props.email.toLowerCase().trim(),
        phone: props.phone || null,
        mobilePhone: props.mobilePhone || null,
        jobTitle: props.jobTitle || null,
        department: props.department || null,
        type: props.type || ContactType.OTHER,
        role: props.role || null,
        isPrimary: props.isPrimary || false,
        preferences: props.preferences || null,
        linkedInUrl: props.linkedInUrl || null,
        notes: props.notes || null,
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  /**
   * Factory method to reconstitute Contact from persistence
   */
  static reconstitute(props: ContactProps): Result<Contact> {
    return Result.ok(new Contact(props));
  }

  /**
   * Update contact information
   */
  update(props: ContactUpdateProps): Result<Contact> {
    const updatedProps = { ...this.props };

    if (props.firstName !== undefined) {
      if (!props.firstName || props.firstName.trim().length === 0) {
        return Result.fail('First name cannot be empty');
      }
      updatedProps.firstName = props.firstName.trim();
    }

    if (props.lastName !== undefined) {
      if (!props.lastName || props.lastName.trim().length === 0) {
        return Result.fail('Last name cannot be empty');
      }
      updatedProps.lastName = props.lastName.trim();
    }

    if (props.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!props.email || !emailRegex.test(props.email)) {
        return Result.fail('Valid email is required');
      }
      updatedProps.email = props.email.toLowerCase().trim();
    }

    if (props.phone !== undefined) updatedProps.phone = props.phone ?? null;
    if (props.mobilePhone !== undefined) updatedProps.mobilePhone = props.mobilePhone ?? null;
    if (props.jobTitle !== undefined) updatedProps.jobTitle = props.jobTitle ?? null;
    if (props.department !== undefined) updatedProps.department = props.department ?? null;
    if (props.type !== undefined) updatedProps.type = props.type;
    if (props.role !== undefined) updatedProps.role = props.role ?? null;
    if (props.isPrimary !== undefined) updatedProps.isPrimary = props.isPrimary;
    if (props.preferences !== undefined) updatedProps.preferences = props.preferences ?? null;
    if (props.linkedInUrl !== undefined) updatedProps.linkedInUrl = props.linkedInUrl ?? null;
    if (props.notes !== undefined) updatedProps.notes = props.notes ?? null;

    updatedProps.updatedAt = new Date();

    return Result.ok(new Contact(updatedProps));
  }

  /**
   * Set as primary contact
   */
  setAsPrimary(): Contact {
    return new Contact({
      ...this.props,
      isPrimary: true,
      updatedAt: new Date(),
    });
  }

  /**
   * Unset as primary contact
   */
  unsetAsPrimary(): Contact {
    return new Contact({
      ...this.props,
      isPrimary: false,
      updatedAt: new Date(),
    });
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get email(): string {
    return this.props.email;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get mobilePhone(): string | null {
    return this.props.mobilePhone;
  }

  get jobTitle(): string | null {
    return this.props.jobTitle;
  }

  get department(): string | null {
    return this.props.department;
  }

  get type(): ContactType {
    return this.props.type;
  }

  get role(): ContactRole | null {
    return this.props.role;
  }

  get isPrimary(): boolean {
    return this.props.isPrimary;
  }

  get preferences(): ContactPreferences | null {
    return this.props.preferences;
  }

  get linkedInUrl(): string | null {
    return this.props.linkedInUrl;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Convert to plain object for serialization
   */
  toObject(): ContactProps {
    return { ...this.props };
  }

  /**
   * Check equality by ID
   */
  equals(other: Contact): boolean {
    return this.id === other.id;
  }
}

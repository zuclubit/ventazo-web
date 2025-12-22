import { ICommand } from '../common';

/**
 * Single lead data for bulk creation
 */
export interface BulkLeadData {
  companyName: string;
  email: string;
  source: string;
  phone?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  notes?: string;
  customFields?: Record<string, unknown>;
  ownerId?: string;
}

/**
 * Command to create multiple leads in a single operation
 * Supports up to 1000 leads per batch
 */
export class BulkCreateLeadsCommand implements ICommand {
  readonly type = 'BulkCreateLeadsCommand';

  constructor(
    public readonly tenantId: string,
    public readonly leads: BulkLeadData[],
    public readonly createdBy: string,
    public readonly options?: {
      skipDuplicates?: boolean;
      duplicateCheckFields?: ('email' | 'companyName' | 'phone')[];
      validateOnly?: boolean;
    }
  ) {}
}

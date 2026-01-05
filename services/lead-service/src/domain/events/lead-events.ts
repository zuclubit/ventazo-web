import { DomainEvent } from '@zuclubit/domain';

/**
 * Lead Domain Events
 */

export interface LeadCreatedData {
  leadId: string;
  tenantId: string;
  companyName: string;
  email: string;
  source: string;
}

export interface LeadQualifiedData {
  leadId: string;
  tenantId: string;
  score: number;
  qualifiedBy: string;
}

export interface LeadStatusChangedData {
  leadId: string;
  tenantId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}

export interface LeadScoreChangedData {
  leadId: string;
  tenantId: string;
  oldScore: number;
  newScore: number;
  reason?: string;
}

export interface LeadAssignedData {
  leadId: string;
  tenantId: string;
  assignedTo: string;
  assignedBy: string;
}

export interface LeadConvertedData {
  leadId: string;
  tenantId: string;
  customerId: string;
  convertedBy: string;
}

export interface LeadLostData {
  leadId: string;
  tenantId: string;
  reason: string;
  lostBy: string;
}

/**
 * Event type constants
 */
export const LeadEventTypes = {
  LEAD_CREATED: 'Lead.Created',
  LEAD_QUALIFIED: 'Lead.Qualified',
  LEAD_STATUS_CHANGED: 'Lead.StatusChanged',
  LEAD_SCORE_CHANGED: 'Lead.ScoreChanged',
  LEAD_ASSIGNED: 'Lead.Assigned',
  LEAD_CONVERTED: 'Lead.Converted',
  LEAD_LOST: 'Lead.Lost',
} as const;

/**
 * Event factory functions
 */
export class LeadEvents {
  static created(data: LeadCreatedData): DomainEvent<LeadCreatedData> {
    return {
      type: LeadEventTypes.LEAD_CREATED,
      data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: data.tenantId,
    };
  }

  static qualified(data: LeadQualifiedData): DomainEvent<LeadQualifiedData> {
    return {
      type: LeadEventTypes.LEAD_QUALIFIED,
      data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: data.tenantId,
    };
  }

  static statusChanged(data: LeadStatusChangedData): DomainEvent<LeadStatusChangedData> {
    return {
      type: LeadEventTypes.LEAD_STATUS_CHANGED,
      data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: data.tenantId,
    };
  }

  static scoreChanged(data: LeadScoreChangedData): DomainEvent<LeadScoreChangedData> {
    return {
      type: LeadEventTypes.LEAD_SCORE_CHANGED,
      data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: data.tenantId,
    };
  }

  static assigned(data: LeadAssignedData): DomainEvent<LeadAssignedData> {
    return {
      type: LeadEventTypes.LEAD_ASSIGNED,
      data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: data.tenantId,
    };
  }

  static converted(data: LeadConvertedData): DomainEvent<LeadConvertedData> {
    return {
      type: LeadEventTypes.LEAD_CONVERTED,
      data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: data.tenantId,
    };
  }

  static lost(data: LeadLostData): DomainEvent<LeadLostData> {
    return {
      type: LeadEventTypes.LEAD_LOST,
      data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: data.tenantId,
    };
  }
}

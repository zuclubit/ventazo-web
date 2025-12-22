/**
 * Communication Types
 * Types for tracking communications with leads
 */

/**
 * Communication Type Enum
 */
export enum CommunicationType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  SMS = 'sms',
  LINKEDIN_MESSAGE = 'linkedin_message',
  WHATSAPP = 'whatsapp',
  OTHER = 'other',
}

/**
 * Communication Direction
 */
export enum CommunicationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/**
 * Communication Status
 */
export enum CommunicationStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  NO_ANSWER = 'no_answer',
  VOICEMAIL = 'voicemail',
}

/**
 * Call Outcome
 */
export enum CallOutcome {
  CONNECTED = 'connected',
  NO_ANSWER = 'no_answer',
  VOICEMAIL = 'voicemail',
  BUSY = 'busy',
  WRONG_NUMBER = 'wrong_number',
  CALLBACK_REQUESTED = 'callback_requested',
  NOT_INTERESTED = 'not_interested',
  INTERESTED = 'interested',
  MEETING_SCHEDULED = 'meeting_scheduled',
}

/**
 * Email Status
 */
export enum EmailStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  SPAM = 'spam',
  UNSUBSCRIBED = 'unsubscribed',
}

/**
 * Meeting Type
 */
export enum MeetingType {
  IN_PERSON = 'in_person',
  VIDEO_CALL = 'video_call',
  PHONE_CALL = 'phone_call',
  WEBINAR = 'webinar',
  DEMO = 'demo',
  FOLLOW_UP = 'follow_up',
}

/**
 * Communication Participant
 */
export interface CommunicationParticipant {
  type: 'lead' | 'contact' | 'user' | 'external';
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

/**
 * Communication Attachment
 */
export interface CommunicationAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

/**
 * Call Details
 */
export interface CallDetails {
  phoneNumber: string;
  duration?: number; // seconds
  outcome?: CallOutcome;
  recordingUrl?: string;
  transcription?: string;
}

/**
 * Email Details
 */
export interface EmailDetails {
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  htmlBody?: string;
  textBody?: string;
  status: EmailStatus;
  openedAt?: Date;
  clickedAt?: Date;
  threadId?: string;
  messageId?: string;
}

/**
 * Meeting Details
 */
export interface MeetingDetails {
  title: string;
  type: MeetingType;
  location?: string;
  meetingUrl?: string;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  agenda?: string;
  attendees?: CommunicationParticipant[];
  calendarEventId?: string;
}

/**
 * Communication DTO
 */
export interface CommunicationDTO {
  id: string;
  leadId: string;
  contactId?: string | null;
  tenantId: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  status: CommunicationStatus;
  subject?: string | null;
  body?: string | null;
  summary?: string | null;
  scheduledAt?: Date | null;
  occurredAt: Date;
  completedAt?: Date | null;
  duration?: number | null;
  createdBy: string;
  assignedTo?: string | null;
  callDetails?: CallDetails | null;
  emailDetails?: EmailDetails | null;
  meetingDetails?: MeetingDetails | null;
  participants: CommunicationParticipant[];
  attachments: CommunicationAttachment[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Communication Request
 */
export interface CreateCommunicationRequest {
  leadId: string;
  contactId?: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  status?: CommunicationStatus;
  subject?: string;
  body?: string;
  summary?: string;
  scheduledAt?: Date;
  occurredAt?: Date;
  duration?: number;
  assignedTo?: string;
  callDetails?: CallDetails;
  emailDetails?: EmailDetails;
  meetingDetails?: MeetingDetails;
  participants?: CommunicationParticipant[];
  attachments?: CommunicationAttachment[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Update Communication Request
 */
export interface UpdateCommunicationRequest {
  status?: CommunicationStatus;
  subject?: string | null;
  body?: string | null;
  summary?: string | null;
  scheduledAt?: Date | null;
  occurredAt?: Date;
  completedAt?: Date | null;
  duration?: number | null;
  assignedTo?: string | null;
  callDetails?: CallDetails | null;
  emailDetails?: EmailDetails | null;
  meetingDetails?: MeetingDetails | null;
  participants?: CommunicationParticipant[];
  attachments?: CommunicationAttachment[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Communication Filter Options
 */
export interface CommunicationFilterOptions {
  type?: CommunicationType;
  direction?: CommunicationDirection;
  status?: CommunicationStatus;
  dateFrom?: Date;
  dateTo?: Date;
  createdBy?: string;
  assignedTo?: string;
  contactId?: string;
  tags?: string[];
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: 'occurredAt' | 'createdAt' | 'scheduledAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Communication Timeline Entry
 */
export interface CommunicationTimelineEntry {
  id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  status: CommunicationStatus;
  subject?: string;
  summary?: string;
  occurredAt: Date;
  createdBy: string;
  contactName?: string;
  duration?: number;
}

/**
 * Communication Stats
 */
export interface CommunicationStats {
  total: number;
  byType: Record<CommunicationType, number>;
  byDirection: Record<CommunicationDirection, number>;
  byStatus: Record<CommunicationStatus, number>;
  averageCallDuration?: number;
  totalCallDuration?: number;
  emailOpenRate?: number;
  responseRate?: number;
  lastCommunication?: Date;
  nextScheduled?: Date;
}

/**
 * Paginated Communications Result
 */
export interface PaginatedCommunicationsResult {
  items: CommunicationDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

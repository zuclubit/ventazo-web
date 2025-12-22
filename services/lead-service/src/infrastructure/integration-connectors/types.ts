/**
 * Integration Connectors Types
 * Unified framework for third-party integrations
 */

/**
 * Integration categories
 */
export type IntegrationCategory =
  | 'crm'
  | 'marketing'
  | 'communication'
  | 'payment'
  | 'calendar'
  | 'storage'
  | 'analytics'
  | 'productivity'
  | 'social'
  | 'ecommerce'
  | 'support'
  | 'custom';

/**
 * Authentication types
 */
export type AuthType =
  | 'oauth2'
  | 'api_key'
  | 'basic'
  | 'bearer_token'
  | 'webhook_secret'
  | 'custom';

/**
 * Connection status
 */
export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'expired'
  | 'pending'
  | 'requires_reauth';

/**
 * Sync direction
 */
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';

/**
 * Sync frequency
 */
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';

/**
 * OAuth2 configuration
 */
export interface OAuth2Config {
  client_id: string;
  client_secret: string;
  authorization_url: string;
  token_url: string;
  scopes: string[];
  redirect_uri: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: Date;
}

/**
 * API Key configuration
 */
export interface ApiKeyConfig {
  api_key: string;
  key_header?: string;
  key_query_param?: string;
}

/**
 * Integration connector definition
 */
export interface IntegrationConnectorDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: IntegrationCategory;
  icon_url: string;
  website_url: string;
  documentation_url: string;
  auth_type: AuthType;
  oauth_config?: Partial<OAuth2Config>;
  supported_features: IntegrationFeature[];
  entity_mappings: EntityMappingDefinition[];
  webhook_config?: {
    supported: boolean;
    events: string[];
  };
  rate_limits?: {
    requests_per_minute: number;
    requests_per_day: number;
  };
  is_premium: boolean;
  is_enabled: boolean;
  created_at: Date;
}

/**
 * Integration feature
 */
export interface IntegrationFeature {
  id: string;
  name: string;
  description: string;
  is_enabled: boolean;
  requires_scope?: string;
}

/**
 * Entity mapping definition
 */
export interface EntityMappingDefinition {
  source_entity: string;
  target_entity: string;
  sync_direction: SyncDirection;
  field_mappings: FieldMappingDefinition[];
  sync_filters?: Record<string, unknown>;
}

/**
 * Field mapping definition
 */
export interface FieldMappingDefinition {
  source_field: string;
  target_field: string;
  transform?: 'none' | 'lowercase' | 'uppercase' | 'trim' | 'date' | 'custom';
  custom_transform?: string;
  is_required: boolean;
  default_value?: unknown;
}

/**
 * Integration connection (tenant-specific)
 */
export interface IntegrationConnection {
  id: string;
  tenant_id: string;
  connector_id: string;
  connector_slug: string;
  name: string;
  status: ConnectionStatus;
  auth_type: AuthType;
  credentials: EncryptedCredentials;
  settings: ConnectionSettings;
  entity_mappings: EntityMappingConfig[];
  sync_config: SyncConfig;
  last_sync_at?: Date;
  last_error?: string;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Encrypted credentials (stored securely)
 */
export interface EncryptedCredentials {
  encrypted_data: string;
  encryption_version: string;
}

/**
 * Decrypted credentials for use
 */
export interface DecryptedCredentials {
  oauth?: {
    access_token: string;
    refresh_token?: string;
    expires_at?: Date;
  };
  api_key?: string;
  username?: string;
  password?: string;
  bearer_token?: string;
  webhook_secret?: string;
  custom?: Record<string, string>;
}

/**
 * Connection settings
 */
export interface ConnectionSettings {
  auto_sync: boolean;
  sync_frequency: SyncFrequency;
  sync_on_create: boolean;
  sync_on_update: boolean;
  sync_on_delete: boolean;
  conflict_resolution: 'local_wins' | 'remote_wins' | 'manual' | 'newest_wins';
  error_notification: boolean;
  notification_emails: string[];
  sandbox_mode: boolean;
  custom_settings?: Record<string, unknown>;
}

/**
 * Entity mapping configuration
 */
export interface EntityMappingConfig {
  id: string;
  source_entity: string;
  target_entity: string;
  sync_direction: SyncDirection;
  field_mappings: FieldMappingConfig[];
  is_enabled: boolean;
  filters?: Record<string, unknown>;
}

/**
 * Field mapping configuration
 */
export interface FieldMappingConfig {
  source_field: string;
  target_field: string;
  transform?: string;
  default_value?: unknown;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  frequency: SyncFrequency;
  last_sync_at?: Date;
  next_sync_at?: Date;
  sync_window?: {
    start_time: string;
    end_time: string;
    timezone: string;
  };
}

/**
 * Sync job
 */
export interface SyncJob {
  id: string;
  tenant_id: string;
  connection_id: string;
  connector_slug: string;
  type: 'full' | 'incremental' | 'entity';
  entity_type?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total_records: number;
    processed_records: number;
    success_count: number;
    error_count: number;
    percentage: number;
  };
  started_at?: Date;
  completed_at?: Date;
  error?: string;
  results?: SyncResult[];
}

/**
 * Sync result
 */
export interface SyncResult {
  entity_type: string;
  direction: SyncDirection;
  records_created: number;
  records_updated: number;
  records_deleted: number;
  records_skipped: number;
  errors: SyncError[];
}

/**
 * Sync error
 */
export interface SyncError {
  record_id: string;
  entity_type: string;
  error_code: string;
  error_message: string;
  timestamp: Date;
}

/**
 * Webhook event
 */
export interface IntegrationWebhookEvent {
  id: string;
  tenant_id: string;
  connection_id: string;
  connector_slug: string;
  event_type: string;
  payload: Record<string, unknown>;
  received_at: Date;
  processed_at?: Date;
  status: 'pending' | 'processed' | 'failed' | 'ignored';
  error?: string;
}

/**
 * Create connection input
 */
export interface CreateConnectionInput {
  connector_id: string;
  name: string;
  credentials: DecryptedCredentials;
  settings?: Partial<ConnectionSettings>;
  entity_mappings?: EntityMappingConfig[];
}

/**
 * Update connection input
 */
export interface UpdateConnectionInput {
  name?: string;
  settings?: Partial<ConnectionSettings>;
  entity_mappings?: EntityMappingConfig[];
}

/**
 * Default connectors
 */
export const DEFAULT_CONNECTORS: Partial<IntegrationConnectorDefinition>[] = [
  {
    name: 'Slack',
    slug: 'slack',
    description: 'Send notifications and messages to Slack channels',
    category: 'communication',
    icon_url: '/integrations/slack.svg',
    website_url: 'https://slack.com',
    documentation_url: 'https://api.slack.com',
    auth_type: 'oauth2',
    oauth_config: {
      scopes: ['chat:write', 'channels:read', 'users:read'],
    },
    supported_features: [
      { id: 'notifications', name: 'Notifications', description: 'Send notifications to channels', is_enabled: true },
      { id: 'mentions', name: 'User Mentions', description: 'Mention users in messages', is_enabled: true },
    ],
    entity_mappings: [],
    is_premium: false,
    is_enabled: true,
  },
  {
    name: 'HubSpot',
    slug: 'hubspot',
    description: 'Sync contacts, companies, and deals with HubSpot CRM',
    category: 'crm',
    icon_url: '/integrations/hubspot.svg',
    website_url: 'https://hubspot.com',
    documentation_url: 'https://developers.hubspot.com',
    auth_type: 'oauth2',
    oauth_config: {
      scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.companies.read'],
    },
    supported_features: [
      { id: 'contacts_sync', name: 'Contact Sync', description: 'Two-way contact synchronization', is_enabled: true },
      { id: 'companies_sync', name: 'Company Sync', description: 'Sync company records', is_enabled: true },
      { id: 'deals_sync', name: 'Deal Sync', description: 'Sync deals and opportunities', is_enabled: true },
    ],
    entity_mappings: [
      {
        source_entity: 'lead',
        target_entity: 'contact',
        sync_direction: 'bidirectional',
        field_mappings: [
          { source_field: 'email', target_field: 'email', is_required: true },
          { source_field: 'firstName', target_field: 'firstname', is_required: false },
          { source_field: 'lastName', target_field: 'lastname', is_required: false },
          { source_field: 'phone', target_field: 'phone', is_required: false },
          { source_field: 'company', target_field: 'company', is_required: false },
        ],
      },
    ],
    webhook_config: {
      supported: true,
      events: ['contact.creation', 'contact.propertyChange', 'deal.creation'],
    },
    is_premium: false,
    is_enabled: true,
  },
  {
    name: 'Salesforce',
    slug: 'salesforce',
    description: 'Connect with Salesforce CRM for complete data synchronization',
    category: 'crm',
    icon_url: '/integrations/salesforce.svg',
    website_url: 'https://salesforce.com',
    documentation_url: 'https://developer.salesforce.com',
    auth_type: 'oauth2',
    oauth_config: {
      scopes: ['api', 'refresh_token'],
    },
    supported_features: [
      { id: 'leads_sync', name: 'Lead Sync', description: 'Sync leads with Salesforce', is_enabled: true },
      { id: 'contacts_sync', name: 'Contact Sync', description: 'Sync contacts', is_enabled: true },
      { id: 'opportunities_sync', name: 'Opportunity Sync', description: 'Sync opportunities', is_enabled: true },
      { id: 'accounts_sync', name: 'Account Sync', description: 'Sync accounts/companies', is_enabled: true },
    ],
    entity_mappings: [
      {
        source_entity: 'lead',
        target_entity: 'Lead',
        sync_direction: 'bidirectional',
        field_mappings: [
          { source_field: 'email', target_field: 'Email', is_required: true },
          { source_field: 'firstName', target_field: 'FirstName', is_required: false },
          { source_field: 'lastName', target_field: 'LastName', is_required: true },
          { source_field: 'company', target_field: 'Company', is_required: true },
          { source_field: 'phone', target_field: 'Phone', is_required: false },
          { source_field: 'status', target_field: 'Status', is_required: false },
        ],
      },
    ],
    webhook_config: {
      supported: true,
      events: ['Lead.created', 'Lead.updated', 'Contact.created', 'Opportunity.created'],
    },
    is_premium: true,
    is_enabled: true,
  },
  {
    name: 'Mailchimp',
    slug: 'mailchimp',
    description: 'Sync contacts with Mailchimp for email marketing',
    category: 'marketing',
    icon_url: '/integrations/mailchimp.svg',
    website_url: 'https://mailchimp.com',
    documentation_url: 'https://mailchimp.com/developer',
    auth_type: 'oauth2',
    supported_features: [
      { id: 'audience_sync', name: 'Audience Sync', description: 'Sync contacts to Mailchimp audiences', is_enabled: true },
      { id: 'tags_sync', name: 'Tags Sync', description: 'Sync tags and segments', is_enabled: true },
    ],
    entity_mappings: [
      {
        source_entity: 'lead',
        target_entity: 'member',
        sync_direction: 'outbound',
        field_mappings: [
          { source_field: 'email', target_field: 'email_address', is_required: true },
          { source_field: 'firstName', target_field: 'merge_fields.FNAME', is_required: false },
          { source_field: 'lastName', target_field: 'merge_fields.LNAME', is_required: false },
        ],
      },
    ],
    is_premium: false,
    is_enabled: true,
  },
  {
    name: 'Google Calendar',
    slug: 'google-calendar',
    description: 'Sync meetings and events with Google Calendar',
    category: 'calendar',
    icon_url: '/integrations/google-calendar.svg',
    website_url: 'https://calendar.google.com',
    documentation_url: 'https://developers.google.com/calendar',
    auth_type: 'oauth2',
    oauth_config: {
      scopes: ['https://www.googleapis.com/auth/calendar'],
    },
    supported_features: [
      { id: 'events_sync', name: 'Event Sync', description: 'Sync calendar events', is_enabled: true },
      { id: 'availability', name: 'Availability Check', description: 'Check availability for scheduling', is_enabled: true },
    ],
    entity_mappings: [
      {
        source_entity: 'meeting',
        target_entity: 'event',
        sync_direction: 'bidirectional',
        field_mappings: [
          { source_field: 'title', target_field: 'summary', is_required: true },
          { source_field: 'startTime', target_field: 'start.dateTime', is_required: true },
          { source_field: 'endTime', target_field: 'end.dateTime', is_required: true },
          { source_field: 'description', target_field: 'description', is_required: false },
        ],
      },
    ],
    is_premium: false,
    is_enabled: true,
  },
  {
    name: 'Microsoft Teams',
    slug: 'microsoft-teams',
    description: 'Send notifications and collaborate via Microsoft Teams',
    category: 'communication',
    icon_url: '/integrations/teams.svg',
    website_url: 'https://teams.microsoft.com',
    documentation_url: 'https://docs.microsoft.com/en-us/graph/teams-concept-overview',
    auth_type: 'oauth2',
    supported_features: [
      { id: 'notifications', name: 'Notifications', description: 'Send notifications to Teams channels', is_enabled: true },
      { id: 'adaptive_cards', name: 'Adaptive Cards', description: 'Send rich adaptive card messages', is_enabled: true },
    ],
    entity_mappings: [],
    is_premium: false,
    is_enabled: true,
  },
  {
    name: 'Stripe',
    slug: 'stripe',
    description: 'Sync payment and subscription data with Stripe',
    category: 'payment',
    icon_url: '/integrations/stripe.svg',
    website_url: 'https://stripe.com',
    documentation_url: 'https://stripe.com/docs/api',
    auth_type: 'api_key',
    supported_features: [
      { id: 'customers_sync', name: 'Customer Sync', description: 'Sync customer records', is_enabled: true },
      { id: 'payments_sync', name: 'Payment Sync', description: 'Sync payment history', is_enabled: true },
      { id: 'subscriptions_sync', name: 'Subscription Sync', description: 'Sync subscription data', is_enabled: true },
    ],
    entity_mappings: [
      {
        source_entity: 'customer',
        target_entity: 'customer',
        sync_direction: 'bidirectional',
        field_mappings: [
          { source_field: 'email', target_field: 'email', is_required: true },
          { source_field: 'name', target_field: 'name', is_required: false },
        ],
      },
    ],
    webhook_config: {
      supported: true,
      events: ['customer.created', 'invoice.paid', 'subscription.created', 'subscription.updated'],
    },
    is_premium: false,
    is_enabled: true,
  },
  {
    name: 'Zapier',
    slug: 'zapier',
    description: 'Connect with 5000+ apps via Zapier automation',
    category: 'productivity',
    icon_url: '/integrations/zapier.svg',
    website_url: 'https://zapier.com',
    documentation_url: 'https://platform.zapier.com',
    auth_type: 'api_key',
    supported_features: [
      { id: 'triggers', name: 'Triggers', description: 'Trigger Zapier workflows', is_enabled: true },
      { id: 'actions', name: 'Actions', description: 'Receive actions from Zapier', is_enabled: true },
    ],
    entity_mappings: [],
    webhook_config: {
      supported: true,
      events: ['lead.created', 'lead.updated', 'opportunity.created', 'deal.closed'],
    },
    is_premium: false,
    is_enabled: true,
  },
  {
    name: 'Twilio',
    slug: 'twilio',
    description: 'Send SMS and make calls via Twilio',
    category: 'communication',
    icon_url: '/integrations/twilio.svg',
    website_url: 'https://twilio.com',
    documentation_url: 'https://www.twilio.com/docs',
    auth_type: 'api_key',
    supported_features: [
      { id: 'sms', name: 'SMS', description: 'Send and receive SMS messages', is_enabled: true },
      { id: 'voice', name: 'Voice Calls', description: 'Make and receive phone calls', is_enabled: true },
      { id: 'whatsapp', name: 'WhatsApp', description: 'Send WhatsApp messages', is_enabled: true },
    ],
    entity_mappings: [],
    is_premium: false,
    is_enabled: true,
  },
  {
    name: 'SendGrid',
    slug: 'sendgrid',
    description: 'Send transactional and marketing emails via SendGrid',
    category: 'marketing',
    icon_url: '/integrations/sendgrid.svg',
    website_url: 'https://sendgrid.com',
    documentation_url: 'https://docs.sendgrid.com',
    auth_type: 'api_key',
    supported_features: [
      { id: 'transactional', name: 'Transactional Email', description: 'Send transactional emails', is_enabled: true },
      { id: 'marketing', name: 'Marketing Email', description: 'Send marketing campaigns', is_enabled: true },
      { id: 'templates', name: 'Email Templates', description: 'Use SendGrid templates', is_enabled: true },
    ],
    entity_mappings: [],
    is_premium: false,
    is_enabled: true,
  },
];

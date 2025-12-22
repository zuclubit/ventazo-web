/**
 * Integration Hub & Registry Types
 * Central types for managing third-party integrations and API connections
 */

// ==================== Enums ====================

export type IntegrationType =
  | 'oauth2'
  | 'api_key'
  | 'basic_auth'
  | 'webhook'
  | 'custom';

export type IntegrationCategory =
  | 'crm'
  | 'email'
  | 'calendar'
  | 'storage'
  | 'payment'
  | 'marketing'
  | 'analytics'
  | 'communication'
  | 'productivity'
  | 'ai'
  | 'custom';

export type IntegrationStatus =
  | 'available'
  | 'connected'
  | 'error'
  | 'expired'
  | 'disabled'
  | 'pending_auth';

export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';

export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';

export type DataMappingType =
  | 'direct'
  | 'transform'
  | 'lookup'
  | 'computed'
  | 'constant';

// ==================== Integration Definition ====================

export interface IntegrationDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;

  // Branding
  iconUrl: string;
  logoUrl?: string;
  color?: string;
  website?: string;

  // Classification
  category: IntegrationCategory;
  tags?: string[];
  isPopular?: boolean;
  isBeta?: boolean;
  isEnterprise?: boolean;

  // Auth Configuration
  authType: IntegrationType;
  authConfig: OAuthConfig | ApiKeyConfig | BasicAuthConfig | WebhookConfig;

  // Capabilities
  capabilities: IntegrationCapability[];
  supportedEntities: string[];
  supportedActions: string[];

  // Requirements
  requiredScopes?: string[];
  requiredPermissions?: string[];
  prerequisites?: string[];

  // Documentation
  docsUrl?: string;
  setupGuideUrl?: string;
  apiDocsUrl?: string;

  // Version
  version: string;
  minApiVersion?: string;

  // Settings
  defaultSettings?: Record<string, unknown>;
  settingsSchema?: Record<string, unknown>;

  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Auth Configurations ====================

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  refreshUrl?: string;
  scopes: string[];
  clientIdEnvVar: string;
  clientSecretEnvVar: string;
  grantType: 'authorization_code' | 'client_credentials' | 'refresh_token';
  pkceEnabled?: boolean;
  stateEnabled?: boolean;
  additionalParams?: Record<string, string>;
}

export interface ApiKeyConfig {
  headerName?: string;
  queryParamName?: string;
  prefix?: string;
  location: 'header' | 'query' | 'body';
}

export interface BasicAuthConfig {
  usernameField: string;
  passwordField: string;
}

export interface WebhookConfig {
  signatureHeader?: string;
  signatureAlgorithm?: string;
  secretEnvVar?: string;
  verificationEndpoint?: string;
}

// ==================== Integration Capability ====================

export interface IntegrationCapability {
  id: string;
  name: string;
  description: string;
  type: 'sync' | 'action' | 'trigger' | 'automation';

  // For sync capabilities
  syncConfig?: {
    entities: string[];
    direction: SyncDirection;
    frequency: SyncFrequency;
    fieldMappings?: FieldMapping[];
  };

  // For action capabilities
  actionConfig?: {
    endpoint: string;
    method: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
  };

  // For trigger capabilities
  triggerConfig?: {
    events: string[];
    webhookEndpoint?: string;
    pollingInterval?: number;
  };
}

// ==================== Connected Integration ====================

export interface ConnectedIntegration {
  id: string;
  tenantId: string;
  integrationId: string;

  // Status
  status: IntegrationStatus;
  statusMessage?: string;
  lastError?: string;
  lastErrorAt?: Date;

  // Auth Credentials (encrypted)
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    expiresAt?: Date;
    tokenType?: string;
    scope?: string;
    metadata?: Record<string, unknown>;
  };

  // Configuration
  settings: Record<string, unknown>;
  enabledCapabilities: string[];

  // Sync Configuration
  syncConfig?: {
    enabled: boolean;
    direction: SyncDirection;
    frequency: SyncFrequency;
    lastSyncAt?: Date;
    nextSyncAt?: Date;
    fieldMappings: FieldMapping[];
  };

  // Connected Account Info
  externalAccountId?: string;
  externalAccountName?: string;
  externalAccountEmail?: string;

  // Usage
  connectedBy: string;
  connectedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;

  // Metadata
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

// ==================== Field Mapping ====================

export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  mappingType: DataMappingType;

  // For transform mappings
  transformFunction?: string;
  transformConfig?: Record<string, unknown>;

  // For lookup mappings
  lookupTable?: string;
  lookupKeyField?: string;
  lookupValueField?: string;

  // For computed mappings
  computeExpression?: string;

  // For constant mappings
  constantValue?: unknown;

  // Options
  isRequired?: boolean;
  defaultValue?: unknown;
  nullable?: boolean;
}

// ==================== Sync Job ====================

export interface SyncJob {
  id: string;
  tenantId: string;
  integrationId: string;
  connectedIntegrationId: string;

  // Configuration
  direction: SyncDirection;
  entities: string[];
  mode: 'full' | 'incremental' | 'delta';

  // Status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;

  // Results
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsFailed: number;
  errors?: SyncError[];

  // Timing
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds

  // Metadata
  triggeredBy: 'schedule' | 'manual' | 'webhook' | 'automation';
  triggeredById?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface SyncError {
  recordId?: string;
  entity?: string;
  field?: string;
  error: string;
  errorCode?: string;
  timestamp: Date;
}

// ==================== Webhook Event ====================

export interface WebhookEvent {
  id: string;
  tenantId: string;
  integrationId: string;
  connectedIntegrationId: string;

  // Event Info
  eventType: string;
  externalEventId?: string;

  // Payload
  payload: Record<string, unknown>;
  headers: Record<string, string>;

  // Processing
  status: 'received' | 'processing' | 'processed' | 'failed' | 'skipped';
  processingError?: string;
  processedAt?: Date;
  retryCount: number;

  // Signature Verification
  signatureValid?: boolean;

  receivedAt: Date;
  createdAt: Date;
}

// ==================== API Log ====================

export interface ApiLog {
  id: string;
  tenantId: string;
  integrationId: string;
  connectedIntegrationId: string;

  // Request
  method: string;
  endpoint: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;

  // Response
  statusCode: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseTime: number; // milliseconds

  // Context
  action?: string;
  entity?: string;
  entityId?: string;

  // Status
  success: boolean;
  errorMessage?: string;

  createdAt: Date;
}

// ==================== Integration Marketplace ====================

export interface MarketplaceIntegration {
  definition: IntegrationDefinition;

  // Stats
  installCount: number;
  rating: number;
  reviewCount: number;

  // Pricing
  isFree: boolean;
  pricingTier?: 'free' | 'starter' | 'professional' | 'enterprise';
  monthlyPrice?: number;

  // Reviews
  reviews?: {
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: Date;
  }[];

  // Featured
  isFeatured?: boolean;
  featuredOrder?: number;

  // New/Updated
  isNew?: boolean;
  recentlyUpdated?: boolean;
}

// ==================== Dashboard ====================

export interface IntegrationHubDashboard {
  tenantId: string;

  // Overview
  totalIntegrations: number;
  connectedIntegrations: number;
  activeIntegrations: number;
  errorIntegrations: number;

  // By Category
  byCategory: {
    category: IntegrationCategory;
    available: number;
    connected: number;
  }[];

  // Recent Activity
  recentSyncs: {
    integrationName: string;
    status: string;
    recordsProcessed: number;
    completedAt: Date;
  }[];

  recentErrors: {
    integrationName: string;
    error: string;
    occurredAt: Date;
  }[];

  // Health
  healthMetrics: {
    overallHealth: 'healthy' | 'degraded' | 'critical';
    syncSuccessRate: number;
    averageSyncTime: number;
    webhookSuccessRate: number;
    apiSuccessRate: number;
  };

  // Usage
  apiCallsToday: number;
  apiCallsThisMonth: number;
  dataTransferred: number; // bytes

  // Recommendations
  recommendedIntegrations: IntegrationDefinition[];

  generatedAt: Date;
}

// ==================== Search & Filter ====================

export interface IntegrationSearchParams {
  query?: string;
  categories?: IntegrationCategory[];
  authTypes?: IntegrationType[];
  status?: IntegrationStatus[];
  isConnected?: boolean;
  isFeatured?: boolean;
  isFree?: boolean;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'popularity' | 'rating' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

export interface IntegrationSearchResult {
  integrations: MarketplaceIntegration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== OAuth Flow ====================

export interface OAuthInitResult {
  authorizationUrl: string;
  state: string;
  codeVerifier?: string; // For PKCE
}

export interface OAuthCallbackResult {
  success: boolean;
  integrationId: string;
  connectedIntegrationId?: string;
  error?: string;
  errorDescription?: string;
}

// ==================== Action Execution ====================

export interface ActionRequest {
  integrationId: string;
  connectedIntegrationId: string;
  actionId: string;
  input: Record<string, unknown>;
  async?: boolean;
}

export interface ActionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  executionTime?: number;
  jobId?: string; // For async actions
}

/**
 * Lead Enrichment Types
 * Types for lead data enrichment with Apollo.io, Clearbit, and other providers
 */

/**
 * Enrichment provider types
 */
export type EnrichmentProvider = 'apollo' | 'clearbit' | 'hunter' | 'zoominfo';

/**
 * Enrichment status
 */
export type EnrichmentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

/**
 * Social profiles
 */
export interface SocialProfiles {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  github?: string;
  crunchbase?: string;
}

/**
 * Person enrichment data
 */
export interface PersonEnrichmentData {
  // Basic info
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  personalEmail?: string;
  phone?: string;
  mobilePhone?: string;

  // Work info
  jobTitle?: string;
  seniority?: string;
  department?: string;
  role?: string;

  // Location
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;

  // Social
  linkedinUrl?: string;
  twitterHandle?: string;
  photoUrl?: string;

  // Employment
  employmentHistory?: Array<{
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
    isCurrent: boolean;
  }>;

  // Education
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startYear?: number;
    endYear?: number;
  }>;

  // Skills and interests
  skills?: string[];
  interests?: string[];

  // Metadata
  confidenceScore?: number;
  dataQuality?: 'high' | 'medium' | 'low';
}

/**
 * Company enrichment data
 */
export interface CompanyEnrichmentData {
  // Basic info
  name?: string;
  legalName?: string;
  domain?: string;
  website?: string;
  description?: string;
  shortDescription?: string;

  // Industry
  industry?: string;
  industryGroup?: string;
  subIndustry?: string;
  sector?: string;
  sic?: string[];
  naics?: string[];

  // Size
  employeeCount?: number;
  employeeCountRange?: string;
  estimatedAnnualRevenue?: number;
  revenueRange?: string;
  marketCap?: number;
  fundingTotal?: number;
  fundingRounds?: Array<{
    type: string;
    amount: number;
    date: string;
    investors?: string[];
  }>;

  // Location
  headquarters?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
  };
  locations?: Array<{
    type: string;
    city?: string;
    state?: string;
    country?: string;
  }>;

  // Contact
  phone?: string;
  emailPatterns?: string[];

  // Social and web
  logoUrl?: string;
  socialProfiles?: SocialProfiles;

  // Tech stack
  technologies?: string[];
  techCategories?: string[];

  // Company details
  foundedYear?: number;
  type?: 'private' | 'public' | 'nonprofit' | 'government' | 'education';
  ticker?: string;
  stockExchange?: string;
  parentCompany?: string;
  ultimateParent?: string;

  // Tags
  tags?: string[];
  keywords?: string[];

  // Metadata
  confidenceScore?: number;
  dataQuality?: 'high' | 'medium' | 'low';
  alexaRank?: number;
}

/**
 * Combined enrichment result
 */
export interface EnrichmentResult {
  person?: PersonEnrichmentData;
  company?: CompanyEnrichmentData;
  provider: EnrichmentProvider;
  enrichedAt: Date;
  success: boolean;
  error?: string;
  creditsUsed?: number;
  matchConfidence?: number;
}

/**
 * Enrichment input
 */
export interface EnrichmentInput {
  // Person identification
  email?: string;
  firstName?: string;
  lastName?: string;
  linkedinUrl?: string;
  phone?: string;

  // Company identification
  domain?: string;
  companyName?: string;
  website?: string;

  // Options
  enrichPerson?: boolean;
  enrichCompany?: boolean;
  revealPhoneNumber?: boolean;
  revealPersonalEmail?: boolean;
  preferredProvider?: EnrichmentProvider;
}

/**
 * Bulk enrichment input
 */
export interface BulkEnrichmentInput {
  records: Array<{
    id: string; // Lead ID or reference
    email?: string;
    domain?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    linkedinUrl?: string;
  }>;
  enrichPerson?: boolean;
  enrichCompany?: boolean;
  preferredProvider?: EnrichmentProvider;
}

/**
 * Bulk enrichment result
 */
export interface BulkEnrichmentResult {
  total: number;
  enriched: number;
  failed: number;
  results: Array<{
    id: string;
    result: EnrichmentResult | null;
    error?: string;
  }>;
  creditsUsed: number;
}

/**
 * Enrichment job
 */
export interface EnrichmentJob {
  id: string;
  tenantId: string;
  type: 'single' | 'bulk';
  provider: EnrichmentProvider;
  status: EnrichmentStatus;
  totalRecords: number;
  processedRecords: number;
  enrichedRecords: number;
  failedRecords: number;
  creditsUsed: number;
  input: EnrichmentInput | BulkEnrichmentInput;
  results?: EnrichmentResult[] | BulkEnrichmentResult;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Provider status
 */
export interface ProviderStatus {
  provider: EnrichmentProvider;
  available: boolean;
  creditsRemaining?: number;
  creditsUsedToday?: number;
  dailyLimit?: number;
  rateLimit?: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
}

/**
 * Enrichment provider interface
 */
export interface IEnrichmentProvider {
  /**
   * Provider name
   */
  readonly name: EnrichmentProvider;

  /**
   * Check if provider is available/configured
   */
  isAvailable(): boolean;

  /**
   * Get provider status
   */
  getStatus(): Promise<ProviderStatus>;

  /**
   * Enrich a single person
   */
  enrichPerson(input: EnrichmentInput): Promise<EnrichmentResult>;

  /**
   * Enrich a single company
   */
  enrichCompany(input: EnrichmentInput): Promise<EnrichmentResult>;

  /**
   * Bulk enrich people (if supported)
   */
  bulkEnrich?(input: BulkEnrichmentInput): Promise<BulkEnrichmentResult>;
}

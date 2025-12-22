/**
 * Clearbit Enrichment Provider
 * Integration with Clearbit People & Company Enrichment API
 */

import {
  IEnrichmentProvider,
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
  PersonEnrichmentData,
  CompanyEnrichmentData,
  ProviderStatus,
} from './types';

/**
 * Clearbit API Response Types
 */
interface ClearbitPersonResponse {
  id: string;
  name?: {
    fullName?: string;
    givenName?: string;
    familyName?: string;
  };
  email?: string;
  location?: string;
  timeZone?: string;
  utcOffset?: number;
  geo?: {
    city?: string;
    state?: string;
    stateCode?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  };
  bio?: string;
  site?: string;
  avatar?: string;
  employment?: {
    domain?: string;
    name?: string;
    title?: string;
    role?: string;
    seniority?: string;
    subRole?: string;
  };
  facebook?: { handle?: string };
  github?: { handle?: string; id?: number; avatar?: string; company?: string; blog?: string };
  twitter?: { handle?: string; id?: string; bio?: string; followers?: number; following?: number };
  linkedin?: { handle?: string };
  googleplus?: { handle?: string };
  gravatar?: { handle?: string; avatar?: string };
  fuzzy?: boolean;
  emailProvider?: boolean;
  indexedAt?: string;
}

interface ClearbitCompanyResponse {
  id: string;
  name?: string;
  legalName?: string;
  domain?: string;
  domainAliases?: string[];
  site?: {
    url?: string;
    title?: string;
    h1?: string;
    metaDescription?: string;
    metaAuthor?: string;
    phoneNumbers?: string[];
    emailAddresses?: string[];
  };
  category?: {
    sector?: string;
    industryGroup?: string;
    industry?: string;
    subIndustry?: string;
    sicCode?: string;
    naicsCode?: string;
  };
  tags?: string[];
  description?: string;
  foundedYear?: number;
  location?: string;
  timeZone?: string;
  utcOffset?: number;
  geo?: {
    streetNumber?: string;
    streetName?: string;
    subPremise?: string;
    city?: string;
    postalCode?: string;
    state?: string;
    stateCode?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  };
  logo?: string;
  facebook?: { handle?: string; likes?: number };
  linkedin?: { handle?: string };
  twitter?: { handle?: string; id?: string; bio?: string; followers?: number; following?: number };
  crunchbase?: { handle?: string };
  emailProvider?: boolean;
  type?: string;
  ticker?: string;
  identifiers?: { usEIN?: string };
  phone?: string;
  metrics?: {
    alexaUsRank?: number;
    alexaGlobalRank?: number;
    employees?: number;
    employeesRange?: string;
    marketCap?: number;
    raised?: number;
    annualRevenue?: number;
    estimatedAnnualRevenue?: string;
    fiscalYearEnd?: number;
  };
  indexedAt?: string;
  tech?: string[];
  techCategories?: string[];
  parent?: { domain?: string };
  ultimateParent?: { domain?: string };
}

interface ClearbitCombinedResponse {
  person: ClearbitPersonResponse | null;
  company: ClearbitCompanyResponse | null;
}

/**
 * Clearbit Enrichment Provider
 */
export class ClearbitProvider implements IEnrichmentProvider {
  readonly name: EnrichmentProvider = 'clearbit';

  private apiKey: string;
  private baseUrl = 'https://person.clearbit.com/v2';
  private companyUrl = 'https://company.clearbit.com/v2';

  constructor() {
    this.apiKey = process.env.CLEARBIT_API_KEY || '';
  }

  /**
   * Check if Clearbit is configured
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    return {
      provider: 'clearbit',
      available: this.isAvailable(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
      },
    };
  }

  /**
   * Enrich a single person (includes company data)
   */
  async enrichPerson(input: EnrichmentInput): Promise<EnrichmentResult> {
    if (!this.isAvailable()) {
      return {
        provider: 'clearbit',
        enrichedAt: new Date(),
        success: false,
        error: 'Clearbit provider not configured',
      };
    }

    if (!input.email) {
      return {
        provider: 'clearbit',
        enrichedAt: new Date(),
        success: false,
        error: 'Email is required for Clearbit person enrichment',
      };
    }

    try {
      // Use combined endpoint for person + company
      const url = new URL('https://person-stream.clearbit.com/v2/combined/find');
      url.searchParams.set('email', input.email);

      if (input.companyName) {
        url.searchParams.set('company', input.companyName);
      }
      if (input.domain) {
        url.searchParams.set('company_domain', input.domain);
      }
      if (input.linkedinUrl) {
        url.searchParams.set('linkedin', input.linkedinUrl);
      }
      if (input.firstName) {
        url.searchParams.set('given_name', input.firstName);
      }
      if (input.lastName) {
        url.searchParams.set('family_name', input.lastName);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return {
          provider: 'clearbit',
          enrichedAt: new Date(),
          success: false,
          error: 'No matching person found',
        };
      }

      if (response.status === 402) {
        return {
          provider: 'clearbit',
          enrichedAt: new Date(),
          success: false,
          error: 'Clearbit credits exhausted',
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          provider: 'clearbit',
          enrichedAt: new Date(),
          success: false,
          error: `Clearbit API error: ${response.status} - ${errorText}`,
        };
      }

      const data = (await response.json()) as ClearbitCombinedResponse;

      const person = data.person ? this.mapClearbitPerson(data.person) : undefined;
      const company = data.company ? this.mapClearbitCompany(data.company) : undefined;

      return {
        person,
        company,
        provider: 'clearbit',
        enrichedAt: new Date(),
        success: true,
        creditsUsed: 1,
        matchConfidence: data.person?.fuzzy ? 0.7 : 0.95,
      };
    } catch (error) {
      return {
        provider: 'clearbit',
        enrichedAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Enrich a single company
   */
  async enrichCompany(input: EnrichmentInput): Promise<EnrichmentResult> {
    if (!this.isAvailable()) {
      return {
        provider: 'clearbit',
        enrichedAt: new Date(),
        success: false,
        error: 'Clearbit provider not configured',
      };
    }

    if (!input.domain) {
      return {
        provider: 'clearbit',
        enrichedAt: new Date(),
        success: false,
        error: 'Domain is required for Clearbit company enrichment',
      };
    }

    try {
      const url = new URL(`${this.companyUrl}/companies/find`);
      url.searchParams.set('domain', input.domain);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return {
          provider: 'clearbit',
          enrichedAt: new Date(),
          success: false,
          error: 'No matching company found',
        };
      }

      if (response.status === 402) {
        return {
          provider: 'clearbit',
          enrichedAt: new Date(),
          success: false,
          error: 'Clearbit credits exhausted',
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          provider: 'clearbit',
          enrichedAt: new Date(),
          success: false,
          error: `Clearbit API error: ${response.status} - ${errorText}`,
        };
      }

      const data = (await response.json()) as ClearbitCompanyResponse;
      const company = this.mapClearbitCompany(data);

      return {
        company,
        provider: 'clearbit',
        enrichedAt: new Date(),
        success: true,
        creditsUsed: 1,
        matchConfidence: 0.95,
      };
    } catch (error) {
      return {
        provider: 'clearbit',
        enrichedAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Map Clearbit person data to our format
   */
  private mapClearbitPerson(person: ClearbitPersonResponse): PersonEnrichmentData {
    return {
      firstName: person.name?.givenName,
      lastName: person.name?.familyName,
      fullName: person.name?.fullName,
      email: person.email,
      jobTitle: person.employment?.title,
      seniority: person.employment?.seniority,
      role: person.employment?.role,
      city: person.geo?.city,
      state: person.geo?.state,
      country: person.geo?.country,
      countryCode: person.geo?.countryCode,
      timezone: person.timeZone,
      linkedinUrl: person.linkedin?.handle
        ? `https://www.linkedin.com/in/${person.linkedin.handle}`
        : undefined,
      twitterHandle: person.twitter?.handle,
      photoUrl: person.avatar,
      confidenceScore: person.fuzzy ? 0.7 : 0.95,
      dataQuality: person.fuzzy ? 'medium' : 'high',
    };
  }

  /**
   * Map Clearbit company data to our format
   */
  private mapClearbitCompany(company: ClearbitCompanyResponse): CompanyEnrichmentData {
    return {
      name: company.name,
      legalName: company.legalName,
      domain: company.domain,
      website: company.site?.url,
      description: company.description,
      industry: company.category?.industry,
      industryGroup: company.category?.industryGroup,
      subIndustry: company.category?.subIndustry,
      sector: company.category?.sector,
      sic: company.category?.sicCode ? [company.category.sicCode] : undefined,
      naics: company.category?.naicsCode ? [company.category.naicsCode] : undefined,
      employeeCount: company.metrics?.employees,
      employeeCountRange: company.metrics?.employeesRange,
      estimatedAnnualRevenue: company.metrics?.annualRevenue,
      revenueRange: company.metrics?.estimatedAnnualRevenue,
      marketCap: company.metrics?.marketCap,
      fundingTotal: company.metrics?.raised,
      foundedYear: company.foundedYear,
      phone: company.phone,
      headquarters: {
        street: company.geo?.streetName
          ? `${company.geo.streetNumber || ''} ${company.geo.streetName}`.trim()
          : undefined,
        city: company.geo?.city,
        state: company.geo?.state,
        postalCode: company.geo?.postalCode,
        country: company.geo?.country,
        countryCode: company.geo?.countryCode,
      },
      logoUrl: company.logo,
      socialProfiles: {
        linkedin: company.linkedin?.handle
          ? `https://www.linkedin.com/company/${company.linkedin.handle}`
          : undefined,
        twitter: company.twitter?.handle
          ? `https://twitter.com/${company.twitter.handle}`
          : undefined,
        facebook: company.facebook?.handle
          ? `https://facebook.com/${company.facebook.handle}`
          : undefined,
        crunchbase: company.crunchbase?.handle
          ? `https://www.crunchbase.com/organization/${company.crunchbase.handle}`
          : undefined,
      },
      technologies: company.tech,
      techCategories: company.techCategories,
      type: company.type as CompanyEnrichmentData['type'],
      ticker: company.ticker,
      parentCompany: company.parent?.domain,
      ultimateParent: company.ultimateParent?.domain,
      tags: company.tags,
      alexaRank: company.metrics?.alexaGlobalRank,
      confidenceScore: 0.95,
      dataQuality: 'high',
    };
  }
}

/**
 * Apollo.io Enrichment Provider
 * Integration with Apollo.io People & Company Enrichment API
 */

import {
  IEnrichmentProvider,
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
  BulkEnrichmentInput,
  BulkEnrichmentResult,
  PersonEnrichmentData,
  CompanyEnrichmentData,
  ProviderStatus,
} from './types';

/**
 * Apollo API Response Types
 */
interface ApolloPersonResponse {
  person: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    email_status?: string;
    personal_emails?: string[];
    phone_numbers?: Array<{ raw_number: string; type: string }>;
    title?: string;
    seniority?: string;
    departments?: string[];
    city?: string;
    state?: string;
    country?: string;
    linkedin_url?: string;
    twitter_url?: string;
    photo_url?: string;
    employment_history?: Array<{
      current: boolean;
      organization_name?: string;
      title?: string;
      start_date?: string;
      end_date?: string;
    }>;
    organization?: ApolloOrganization;
  } | null;
}

interface ApolloOrganization {
  id: string;
  name?: string;
  website_url?: string;
  short_description?: string;
  industry?: string;
  estimated_num_employees?: number;
  annual_revenue?: number;
  annual_revenue_printed?: string;
  founded_year?: number;
  phone?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  logo_url?: string;
  primary_domain?: string;
  city?: string;
  state?: string;
  country?: string;
  technologies?: string[];
  keywords?: string[];
  seo_description?: string;
}

interface ApolloBulkResponse {
  matches: Array<{
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    organization?: ApolloOrganization;
    error?: string;
  }>;
  status: string;
}

/**
 * Apollo.io Enrichment Provider
 */
export class ApolloProvider implements IEnrichmentProvider {
  readonly name: EnrichmentProvider = 'apollo';

  private apiKey: string;
  private baseUrl = 'https://api.apollo.io/v1';

  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY || '';
  }

  /**
   * Check if Apollo is configured
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    if (!this.isAvailable()) {
      return {
        provider: 'apollo',
        available: false,
      };
    }

    try {
      // Apollo doesn't have a dedicated credits endpoint
      // We'd need to track usage internally
      const response = await fetch(`${this.baseUrl}/auth/health`, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      return {
        provider: 'apollo',
        available: response.ok,
        rateLimit: {
          requestsPerSecond: 5,
          requestsPerMinute: 100,
        },
      };
    } catch {
      return {
        provider: 'apollo',
        available: false,
      };
    }
  }

  /**
   * Enrich a single person
   */
  async enrichPerson(input: EnrichmentInput): Promise<EnrichmentResult> {
    if (!this.isAvailable()) {
      return {
        provider: 'apollo',
        enrichedAt: new Date(),
        success: false,
        error: 'Apollo provider not configured',
      };
    }

    try {
      const params: Record<string, unknown> = {};

      if (input.email) {
        params.email = input.email;
      }
      if (input.firstName) {
        params.first_name = input.firstName;
      }
      if (input.lastName) {
        params.last_name = input.lastName;
      }
      if (input.linkedinUrl) {
        params.linkedin_url = input.linkedinUrl;
      }
      if (input.domain) {
        params.organization_domain = input.domain;
      }
      if (input.companyName) {
        params.organization_name = input.companyName;
      }
      if (input.revealPhoneNumber) {
        params.reveal_phone_number = true;
      }
      if (input.revealPersonalEmail) {
        params.reveal_personal_emails = true;
      }

      const response = await fetch(`${this.baseUrl}/people/match`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          provider: 'apollo',
          enrichedAt: new Date(),
          success: false,
          error: `Apollo API error: ${response.status} - ${errorText}`,
        };
      }

      const data = (await response.json()) as ApolloPersonResponse;

      if (!data.person) {
        return {
          provider: 'apollo',
          enrichedAt: new Date(),
          success: false,
          error: 'No matching person found',
        };
      }

      const person = this.mapApolloPerson(data.person);
      const company = data.person.organization
        ? this.mapApolloOrganization(data.person.organization)
        : undefined;

      return {
        person,
        company,
        provider: 'apollo',
        enrichedAt: new Date(),
        success: true,
        creditsUsed: 1,
        matchConfidence: 0.9,
      };
    } catch (error) {
      return {
        provider: 'apollo',
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
        provider: 'apollo',
        enrichedAt: new Date(),
        success: false,
        error: 'Apollo provider not configured',
      };
    }

    try {
      const params: Record<string, unknown> = {};

      if (input.domain) {
        params.domain = input.domain;
      }
      if (input.companyName) {
        params.name = input.companyName;
      }

      const response = await fetch(`${this.baseUrl}/organizations/enrich`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          provider: 'apollo',
          enrichedAt: new Date(),
          success: false,
          error: `Apollo API error: ${response.status} - ${errorText}`,
        };
      }

      const data = (await response.json()) as { organization: ApolloOrganization | null };

      if (!data.organization) {
        return {
          provider: 'apollo',
          enrichedAt: new Date(),
          success: false,
          error: 'No matching organization found',
        };
      }

      const company = this.mapApolloOrganization(data.organization);

      return {
        company,
        provider: 'apollo',
        enrichedAt: new Date(),
        success: true,
        creditsUsed: 1,
        matchConfidence: 0.85,
      };
    } catch (error) {
      return {
        provider: 'apollo',
        enrichedAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Bulk enrich people (Apollo supports up to 10 at a time)
   */
  async bulkEnrich(input: BulkEnrichmentInput): Promise<BulkEnrichmentResult> {
    if (!this.isAvailable()) {
      return {
        total: input.records.length,
        enriched: 0,
        failed: input.records.length,
        results: input.records.map((r) => ({
          id: r.id,
          result: null,
          error: 'Apollo provider not configured',
        })),
        creditsUsed: 0,
      };
    }

    const results: BulkEnrichmentResult['results'] = [];
    let enriched = 0;
    let failed = 0;
    let creditsUsed = 0;

    // Apollo bulk API supports up to 10 records at a time
    const batchSize = 10;
    const batches = this.chunkArray(input.records, batchSize);

    for (const batch of batches) {
      try {
        const details = batch.map((record) => ({
          email: record.email,
          first_name: record.firstName,
          last_name: record.lastName,
          organization_name: record.companyName,
          linkedin_url: record.linkedinUrl,
          domain: record.domain,
        }));

        const response = await fetch(`${this.baseUrl}/people/bulk_match`, {
          method: 'POST',
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ details }),
        });

        if (!response.ok) {
          // Mark all as failed
          for (const record of batch) {
            failed++;
            results.push({
              id: record.id,
              result: null,
              error: `Apollo API error: ${response.status}`,
            });
          }
          continue;
        }

        const data = (await response.json()) as ApolloBulkResponse;

        // Map results back to original records
        for (let i = 0; i < batch.length; i++) {
          const record = batch[i];
          const match = data.matches?.[i];

          if (match && !match.error) {
            enriched++;
            creditsUsed++;

            const person: PersonEnrichmentData = {
              firstName: match.first_name,
              lastName: match.last_name,
              email: match.email,
            };

            const company = match.organization
              ? this.mapApolloOrganization(match.organization)
              : undefined;

            results.push({
              id: record.id,
              result: {
                person,
                company,
                provider: 'apollo',
                enrichedAt: new Date(),
                success: true,
                creditsUsed: 1,
              },
            });
          } else {
            failed++;
            results.push({
              id: record.id,
              result: null,
              error: match?.error || 'No match found',
            });
          }
        }
      } catch (error) {
        // Mark all in batch as failed
        for (const record of batch) {
          failed++;
          results.push({
            id: record.id,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Rate limiting - wait between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(200); // 200ms between batches
      }
    }

    return {
      total: input.records.length,
      enriched,
      failed,
      results,
      creditsUsed,
    };
  }

  /**
   * Map Apollo person data to our format
   */
  private mapApolloPerson(person: ApolloPersonResponse['person']): PersonEnrichmentData {
    if (!person) return {};

    return {
      firstName: person.first_name,
      lastName: person.last_name,
      fullName: person.name,
      email: person.email,
      personalEmail: person.personal_emails?.[0],
      phone: person.phone_numbers?.find((p) => p.type === 'work')?.raw_number,
      mobilePhone: person.phone_numbers?.find((p) => p.type === 'mobile')?.raw_number,
      jobTitle: person.title,
      seniority: person.seniority,
      department: person.departments?.join(', '),
      city: person.city,
      state: person.state,
      country: person.country,
      linkedinUrl: person.linkedin_url,
      twitterHandle: person.twitter_url?.replace('https://twitter.com/', ''),
      photoUrl: person.photo_url,
      employmentHistory: person.employment_history?.map((e) => ({
        company: e.organization_name || '',
        title: e.title || '',
        startDate: e.start_date,
        endDate: e.end_date,
        isCurrent: e.current,
      })),
      confidenceScore: 0.9,
      dataQuality: 'high',
    };
  }

  /**
   * Map Apollo organization data to our format
   */
  private mapApolloOrganization(org: ApolloOrganization): CompanyEnrichmentData {
    return {
      name: org.name,
      domain: org.primary_domain,
      website: org.website_url,
      description: org.seo_description,
      shortDescription: org.short_description,
      industry: org.industry,
      employeeCount: org.estimated_num_employees,
      estimatedAnnualRevenue: org.annual_revenue,
      revenueRange: org.annual_revenue_printed,
      foundedYear: org.founded_year,
      phone: org.phone,
      headquarters: {
        city: org.city,
        state: org.state,
        country: org.country,
      },
      logoUrl: org.logo_url,
      socialProfiles: {
        linkedin: org.linkedin_url,
        twitter: org.twitter_url,
        facebook: org.facebook_url,
      },
      technologies: org.technologies,
      keywords: org.keywords,
      confidenceScore: 0.85,
      dataQuality: 'high',
    };
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

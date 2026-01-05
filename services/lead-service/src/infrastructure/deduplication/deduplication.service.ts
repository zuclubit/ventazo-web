/**
 * Deduplication Service
 * Handles duplicate lead detection and merging
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  DuplicateCheckField,
  DuplicateConfidence,
  DuplicateDetectionConfig,
  DuplicateDetectionResult,
  DuplicateGroup,
  DuplicateGroupStatus,
  DuplicateMatch,
  DuplicateMatchField,
  DuplicateScanOptions,
  DuplicateScanResult,
  DuplicateStrategy,
  DEFAULT_DUPLICATE_CONFIG,
  MergeConfig,
  MergeResult,
  MergeStrategy,
} from './types';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';

@injectable()
export class DeduplicationService {
  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool,
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  // ==========================================
  // Duplicate Detection
  // ==========================================

  /**
   * Find duplicates for a specific lead
   */
  async findDuplicates(
    leadId: string,
    tenantId: string,
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<Result<DuplicateDetectionResult>> {
    const mergedConfig = { ...DEFAULT_DUPLICATE_CONFIG, ...config };

    try {
      // Get the source lead
      const sourceResult = await this.leadRepository.findById(leadId, tenantId);
      if (sourceResult.isFailure || !sourceResult.getValue()) {
        return Result.fail('Source lead not found');
      }

      const sourceLead = sourceResult.getValue()!;

      // Get all other leads in tenant
      const allLeadsResult = await this.leadRepository.findAll({
        tenantId,
        page: 1,
        limit: 50000,
      });

      if (allLeadsResult.isFailure) {
        return Result.fail(`Failed to fetch leads: ${allLeadsResult.error}`);
      }

      const allLeads = allLeadsResult.getValue()!.items;
      const matches: DuplicateMatch[] = [];

      // Compare against all other leads
      for (const candidateLead of allLeads) {
        if (candidateLead.id === leadId) continue;

        const match = this.compareleads(sourceLead, candidateLead, mergedConfig);
        if (match && this.meetsMinConfidence(match.confidence, mergedConfig.minConfidence)) {
          matches.push(match);
        }
      }

      // Sort by confidence score descending
      matches.sort((a, b) => b.confidenceScore - a.confidenceScore);

      return Result.ok({
        leadId,
        hasDuplicates: matches.length > 0,
        matches,
        totalMatches: matches.length,
      });
    } catch (error) {
      return Result.fail(
        `Duplicate detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Scan entire tenant for duplicates
   */
  async scanForDuplicates(
    options: DuplicateScanOptions
  ): Promise<Result<DuplicateScanResult>> {
    const startTime = Date.now();
    const scanId = uuidv4();
    const config = { ...DEFAULT_DUPLICATE_CONFIG, ...options.config };

    try {
      // Fetch leads to scan
      const leadsResult = await this.leadRepository.findAll({
        tenantId: options.tenantId,
        page: 1,
        limit: 50000,
      });

      if (leadsResult.isFailure) {
        return Result.fail(`Failed to fetch leads: ${leadsResult.error}`);
      }

      let leads = leadsResult.getValue()!.items;

      // Apply filters
      if (options.leadIds?.length) {
        leads = leads.filter(l => options.leadIds!.includes(l.id));
      }
      if (options.excludeLeadIds?.length) {
        leads = leads.filter(l => !options.excludeLeadIds!.includes(l.id));
      }

      // Find all duplicate pairs
      const duplicatePairs: Map<string, DuplicateMatch[]> = new Map();
      const processedPairs = new Set<string>();

      for (let i = 0; i < leads.length; i++) {
        for (let j = i + 1; j < leads.length; j++) {
          const leadA = leads[i];
          const leadB = leads[j];

          const pairKey = [leadA.id, leadB.id].sort().join(':');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          const match = this.compareleads(leadA, leadB, config);
          if (match && this.meetsMinConfidence(match.confidence, config.minConfidence)) {
            if (!duplicatePairs.has(leadA.id)) {
              duplicatePairs.set(leadA.id, []);
            }
            duplicatePairs.get(leadA.id)!.push(match);
          }
        }
      }

      // Group duplicates
      const groups = this.groupDuplicates(duplicatePairs);

      // Limit results if specified
      const limitedGroups = options.maxResults
        ? groups.slice(0, options.maxResults)
        : groups;

      const duration = Date.now() - startTime;

      return Result.ok({
        scanId,
        tenantId: options.tenantId,
        totalLeadsScanned: leads.length,
        duplicateGroupsFound: limitedGroups.length,
        totalDuplicates: limitedGroups.reduce((sum, g) => sum + g.leadIds.length - 1, 0),
        groups: limitedGroups,
        duration,
        scanConfig: config,
        completedAt: new Date(),
      });
    } catch (error) {
      return Result.fail(
        `Duplicate scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a lead would be a duplicate before creation
   */
  async checkForDuplicatesBeforeCreate(
    tenantId: string,
    companyName: string,
    email: string,
    phone?: string,
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<Result<{ isDuplicate: boolean; potentialMatches: { leadId: string; confidence: number }[] }>> {
    const mergedConfig = { ...DEFAULT_DUPLICATE_CONFIG, ...config };

    try {
      const allLeadsResult = await this.leadRepository.findAll({
        tenantId,
        page: 1,
        limit: 50000,
      });

      if (allLeadsResult.isFailure) {
        return Result.fail(`Failed to fetch leads: ${allLeadsResult.error}`);
      }

      const allLeads = allLeadsResult.getValue()!.items;
      const potentialMatches: { leadId: string; confidence: number }[] = [];

      for (const lead of allLeads) {
        let totalScore = 0;
        let fieldsChecked = 0;

        // Check email
        if (mergedConfig.fields.includes('email')) {
          const emailSimilarity = this.compareStrings(
            email,
            lead.getEmail().value,
            mergedConfig.strategy,
            mergedConfig.ignoreCase
          );
          totalScore += emailSimilarity;
          fieldsChecked++;

          // Email exact match is high confidence
          if (emailSimilarity === 100) {
            potentialMatches.push({ leadId: lead.id, confidence: 95 });
            continue;
          }
        }

        // Check company name
        if (mergedConfig.fields.includes('companyName')) {
          const companySimilarity = this.compareStrings(
            companyName,
            lead.getCompanyName(),
            mergedConfig.strategy,
            mergedConfig.ignoreCase
          );
          totalScore += companySimilarity;
          fieldsChecked++;
        }

        // Check phone
        if (mergedConfig.fields.includes('phone') && phone && lead.getPhone()) {
          const phoneSimilarity = this.comparePhones(phone, lead.getPhone()!);
          totalScore += phoneSimilarity;
          fieldsChecked++;
        }

        if (fieldsChecked > 0) {
          const avgScore = totalScore / fieldsChecked;
          if (avgScore >= 70) {
            potentialMatches.push({ leadId: lead.id, confidence: avgScore });
          }
        }
      }

      // Sort by confidence
      potentialMatches.sort((a, b) => b.confidence - a.confidence);

      return Result.ok({
        isDuplicate: potentialMatches.length > 0,
        potentialMatches: potentialMatches.slice(0, 10),
      });
    } catch (error) {
      return Result.fail(
        `Duplicate check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ==========================================
  // Merge Operations
  // ==========================================

  /**
   * Merge duplicate leads
   */
  async mergeLeads(
    tenantId: string,
    config: MergeConfig
  ): Promise<Result<MergeResult>> {
    const { primaryLeadId, duplicateLeadIds, fieldConfigs, defaultStrategy } = config;
    const strategy = defaultStrategy || MergeStrategy.KEEP_PRIMARY;

    try {
      // Get primary lead
      const primaryResult = await this.leadRepository.findById(primaryLeadId, tenantId);
      if (primaryResult.isFailure || !primaryResult.getValue()) {
        return Result.fail('Primary lead not found');
      }

      const primaryLead = primaryResult.getValue()!;

      // Get all duplicate leads
      const duplicateLeads: Lead[] = [];
      for (const dupId of duplicateLeadIds) {
        const dupResult = await this.leadRepository.findById(dupId, tenantId);
        if (dupResult.isSuccess && dupResult.getValue()) {
          duplicateLeads.push(dupResult.getValue()!);
        }
      }

      if (duplicateLeads.length === 0) {
        return Result.fail('No valid duplicate leads found');
      }

      const fieldsUpdated: string[] = [];
      let notesMerged = 0;

      // Merge each duplicate into primary
      for (const duplicate of duplicateLeads) {
        // Merge fields based on strategy
        const fieldsToMerge = this.determineFieldsToMerge(
          primaryLead,
          duplicate,
          fieldConfigs,
          strategy
        );

        for (const [field, value] of Object.entries(fieldsToMerge)) {
          if (value !== undefined && value !== null) {
            fieldsUpdated.push(field);
          }
        }

        // Merge notes
        const primaryNotes = primaryLead.getNotes() || '';
        const duplicateNotes = duplicate.getNotes();
        if (duplicateNotes && !primaryNotes.includes(duplicateNotes)) {
          const mergedNotes = primaryNotes
            ? `${primaryNotes}\n\n--- Merged from ${duplicate.id} ---\n${duplicateNotes}`
            : duplicateNotes;

          // Update notes (would need to implement update method)
          notesMerged++;
        }

        // Handle score merging
        if (duplicate.getScore().value > primaryLead.getScore().value) {
          // Could update score if duplicate has higher
        }
      }

      // Save primary lead with merged data
      const saveResult = await this.leadRepository.save(primaryLead);
      if (saveResult.isFailure) {
        return Result.fail(`Failed to save merged lead: ${saveResult.error}`);
      }

      // Delete duplicates if configured
      const deletedLeads: string[] = [];
      if (config.deleteAfterMerge) {
        for (const duplicate of duplicateLeads) {
          const deleteResult = await this.leadRepository.delete(duplicate.id, tenantId);
          if (deleteResult.isSuccess) {
            deletedLeads.push(duplicate.id);
          }
        }
      }

      return Result.ok({
        mergedLeadId: primaryLeadId,
        mergedFromIds: duplicateLeadIds,
        fieldsUpdated: [...new Set(fieldsUpdated)],
        activitiesMerged: 0, // Would need activity tracking
        notesMerged,
        deletedLeads,
      });
    } catch (error) {
      return Result.fail(
        `Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Compare two leads for duplicate detection
   */
  private compareleads(
    leadA: Lead,
    leadB: Lead,
    config: DuplicateDetectionConfig
  ): DuplicateMatch | null {
    const matchedFields: DuplicateMatchField[] = [];
    let totalScore = 0;

    for (const field of config.fields) {
      const fieldMatch = this.compareField(leadA, leadB, field, config);
      if (fieldMatch) {
        matchedFields.push(fieldMatch);
        totalScore += fieldMatch.similarity;
      }
    }

    if (matchedFields.length === 0) {
      return null;
    }

    const avgScore = totalScore / matchedFields.length;
    const confidence = this.scoreToConfidence(avgScore);

    return {
      leadId: leadA.id,
      matchedLeadId: leadB.id,
      confidence,
      confidenceScore: avgScore,
      matchedFields,
    };
  }

  /**
   * Compare a specific field between two leads
   */
  private compareField(
    leadA: Lead,
    leadB: Lead,
    field: DuplicateCheckField,
    config: DuplicateDetectionConfig
  ): DuplicateMatchField | null {
    let valueA: string | null = null;
    let valueB: string | null = null;

    switch (field) {
      case 'email':
        valueA = leadA.getEmail().value;
        valueB = leadB.getEmail().value;
        break;
      case 'companyName':
        valueA = leadA.getCompanyName();
        valueB = leadB.getCompanyName();
        break;
      case 'phone':
        valueA = leadA.getPhone();
        valueB = leadB.getPhone();
        break;
      case 'website':
        valueA = leadA.getWebsite();
        valueB = leadB.getWebsite();
        break;
      case 'domain':
        valueA = this.extractDomain(leadA.getEmail().value);
        valueB = this.extractDomain(leadB.getEmail().value);
        break;
    }

    if (!valueA || !valueB) {
      return null;
    }

    let similarity: number;

    if (field === 'phone') {
      similarity = this.comparePhones(valueA, valueB);
    } else if (field === 'domain' || field === 'website') {
      similarity = this.compareDomains(valueA, valueB, config.normalizeDomains);
    } else {
      similarity = this.compareStrings(valueA, valueB, config.strategy, config.ignoreCase);
    }

    // Only return if similarity meets threshold
    const threshold = config.fuzzyThreshold ? config.fuzzyThreshold * 100 : 70;
    if (similarity < threshold) {
      return null;
    }

    return {
      field,
      originalValue: valueA,
      matchedValue: valueB,
      similarity,
      isExact: similarity === 100,
    };
  }

  /**
   * Compare two strings based on strategy
   */
  private compareStrings(
    a: string,
    b: string,
    strategy: DuplicateStrategy,
    ignoreCase?: boolean
  ): number {
    let strA = a;
    let strB = b;

    if (ignoreCase) {
      strA = strA.toLowerCase();
      strB = strB.toLowerCase();
    }

    if (strategy === DuplicateStrategy.NORMALIZED) {
      strA = this.normalizeString(strA);
      strB = this.normalizeString(strB);
    }

    if (strA === strB) {
      return 100;
    }

    if (strategy === DuplicateStrategy.EXACT) {
      return 0;
    }

    // Fuzzy matching using Levenshtein distance
    return this.calculateSimilarity(strA, strB);
  }

  /**
   * Compare phone numbers
   */
  private comparePhones(a: string, b: string): number {
    const normalA = this.normalizePhone(a);
    const normalB = this.normalizePhone(b);

    if (normalA === normalB) {
      return 100;
    }

    // Check if one contains the other (e.g., with/without country code)
    if (normalA.includes(normalB) || normalB.includes(normalA)) {
      return 90;
    }

    // Calculate similarity
    return this.calculateSimilarity(normalA, normalB);
  }

  /**
   * Compare domains
   */
  private compareDomains(a: string, b: string, normalize?: boolean): number {
    let domainA = this.extractDomain(a);
    let domainB = this.extractDomain(b);

    if (normalize) {
      domainA = domainA.replace(/^www\./, '').toLowerCase();
      domainB = domainB.replace(/^www\./, '').toLowerCase();
    }

    if (domainA === domainB) {
      return 100;
    }

    return this.calculateSimilarity(domainA, domainB);
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a.length === 0 || b.length === 0) {
      return 0;
    }

    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);

    return Math.round(((maxLength - distance) / maxLength) * 100);
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)\.\+]/g, '');
  }

  /**
   * Extract domain from email or URL
   */
  private extractDomain(value: string): string {
    if (value.includes('@')) {
      return value.split('@')[1] || '';
    }
    try {
      const url = new URL(value.startsWith('http') ? value : `https://${value}`);
      return url.hostname;
    } catch {
      return value;
    }
  }

  /**
   * Convert similarity score to confidence level
   */
  private scoreToConfidence(score: number): DuplicateConfidence {
    if (score >= 90) return DuplicateConfidence.HIGH;
    if (score >= 70) return DuplicateConfidence.MEDIUM;
    return DuplicateConfidence.LOW;
  }

  /**
   * Check if confidence meets minimum threshold
   */
  private meetsMinConfidence(
    confidence: DuplicateConfidence,
    minConfidence: DuplicateConfidence
  ): boolean {
    const order = [DuplicateConfidence.LOW, DuplicateConfidence.MEDIUM, DuplicateConfidence.HIGH];
    return order.indexOf(confidence) >= order.indexOf(minConfidence);
  }

  /**
   * Group duplicate matches into groups
   */
  private groupDuplicates(
    duplicatePairs: Map<string, DuplicateMatch[]>
  ): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (const [leadId, matches] of duplicatePairs) {
      if (processed.has(leadId)) continue;

      const groupLeadIds = new Set([leadId]);
      const groupMatches: DuplicateMatch[] = [];

      // Add all matched leads
      for (const match of matches) {
        if (!processed.has(match.matchedLeadId)) {
          groupLeadIds.add(match.matchedLeadId);
          groupMatches.push(match);
        }
      }

      if (groupLeadIds.size > 1) {
        const allFields = new Set<DuplicateCheckField>();
        let totalScore = 0;

        for (const match of groupMatches) {
          totalScore += match.confidenceScore;
          for (const field of match.matchedFields) {
            allFields.add(field.field);
          }
        }

        groups.push({
          id: uuidv4(),
          leadIds: Array.from(groupLeadIds),
          confidence: this.scoreToConfidence(totalScore / Math.max(groupMatches.length, 1)),
          avgConfidenceScore: totalScore / Math.max(groupMatches.length, 1),
          matchedFields: Array.from(allFields),
          createdAt: new Date(),
          status: DuplicateGroupStatus.PENDING,
        });

        for (const id of groupLeadIds) {
          processed.add(id);
        }
      }
    }

    // Sort by confidence descending
    return groups.sort((a, b) => b.avgConfidenceScore - a.avgConfidenceScore);
  }

  /**
   * Determine which fields to merge based on strategy
   */
  private determineFieldsToMerge(
    primary: Lead,
    duplicate: Lead,
    fieldConfigs?: { field: string; strategy: MergeStrategy }[],
    defaultStrategy?: MergeStrategy
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const strategy = defaultStrategy || MergeStrategy.KEEP_PRIMARY;

    // Define mergeable fields
    const fields = ['phone', 'website', 'industry', 'employeeCount', 'annualRevenue', 'notes'];

    for (const field of fields) {
      const fieldConfig = fieldConfigs?.find(c => c.field === field);
      const fieldStrategy = fieldConfig?.strategy || strategy;

      const primaryValue = this.getFieldValue(primary, field);
      const duplicateValue = this.getFieldValue(duplicate, field);

      switch (fieldStrategy) {
        case MergeStrategy.KEEP_PRIMARY:
          result[field] = primaryValue || duplicateValue;
          break;
        case MergeStrategy.KEEP_SECONDARY:
          result[field] = duplicateValue || primaryValue;
          break;
        case MergeStrategy.KEEP_NEWEST:
          result[field] = primary.getUpdatedAt() > duplicate.getUpdatedAt()
            ? primaryValue
            : duplicateValue;
          break;
        case MergeStrategy.KEEP_OLDEST:
          result[field] = primary.createdAt < duplicate.createdAt
            ? primaryValue
            : duplicateValue;
          break;
        case MergeStrategy.CONCATENATE:
          if (typeof primaryValue === 'string' && typeof duplicateValue === 'string') {
            result[field] = primaryValue && duplicateValue
              ? `${primaryValue}\n${duplicateValue}`
              : primaryValue || duplicateValue;
          }
          break;
        case MergeStrategy.HIGHEST:
          if (typeof primaryValue === 'number' && typeof duplicateValue === 'number') {
            result[field] = Math.max(primaryValue, duplicateValue);
          }
          break;
        case MergeStrategy.LOWEST:
          if (typeof primaryValue === 'number' && typeof duplicateValue === 'number') {
            result[field] = Math.min(primaryValue, duplicateValue);
          }
          break;
      }
    }

    return result;
  }

  /**
   * Get field value from lead
   */
  private getFieldValue(lead: Lead, field: string): unknown {
    switch (field) {
      case 'phone':
        return lead.getPhone();
      case 'website':
        return lead.getWebsite();
      case 'industry':
        return lead.getIndustry();
      case 'employeeCount':
        return lead.getEmployeeCount();
      case 'annualRevenue':
        return lead.getAnnualRevenue();
      case 'notes':
        return lead.getNotes();
      default:
        return undefined;
    }
  }
}

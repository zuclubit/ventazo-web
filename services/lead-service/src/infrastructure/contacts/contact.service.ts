import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import { Contact, ContactType, ContactRole } from '../../domain/value-objects';
import {
  ContactDTO,
  CreateContactRequest,
  UpdateContactRequest,
  ContactFilterOptions,
  ContactHistoryEntry,
  BulkContactImportRequest,
  BulkContactImportResult,
  BulkContactResult,
} from './types';

/**
 * Contact Service
 * Manages contacts associated with leads
 */
@injectable()
export class ContactService {
  constructor(@inject('DatabasePool') private readonly pool: DatabasePool) {}

  /**
   * Create a new contact for a lead
   */
  async createContact(
    leadId: string,
    tenantId: string,
    request: CreateContactRequest,
    createdBy: string
  ): Promise<Result<ContactDTO>> {
    try {
      // Verify lead exists
      const leadExists = await this.verifyLeadExists(leadId, tenantId);
      if (!leadExists) {
        return Result.fail('Lead not found');
      }

      // Create contact value object
      const contactResult = Contact.create({
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        phone: request.phone,
        mobilePhone: request.mobilePhone,
        jobTitle: request.jobTitle,
        department: request.department,
        type: request.type,
        role: request.role,
        isPrimary: request.isPrimary,
        preferences: request.preferences,
        linkedInUrl: request.linkedInUrl,
        notes: request.notes,
      });

      if (contactResult.isFailure) {
        return Result.fail(contactResult.error as string);
      }

      const contact = contactResult.getValue();

      // If this is set as primary, unset other primary contacts
      if (contact.isPrimary) {
        await this.unsetOtherPrimaryContacts(leadId, tenantId, contact.id);
      }

      // Insert into database
      const query = `
        INSERT INTO lead_contacts (
          id, lead_id, tenant_id, first_name, last_name, email, phone,
          mobile_phone, job_title, department, contact_type, contact_role,
          is_primary, preferences, linkedin_url, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

      const values = [
        contact.id,
        leadId,
        tenantId,
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone,
        contact.mobilePhone,
        contact.jobTitle,
        contact.department,
        contact.type,
        contact.role,
        contact.isPrimary,
        contact.preferences ? JSON.stringify(contact.preferences) : null,
        contact.linkedInUrl,
        contact.notes,
        contact.createdAt,
        contact.updatedAt,
      ];

      const queryResult = await this.pool.query(query, values);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      // Log history
      await this.logContactHistory(contact.id, tenantId, 'created', {}, createdBy);

      return Result.ok(this.mapToDTO(rows[0], leadId));
    } catch (error) {
      return Result.fail(`Failed to create contact: ${(error as Error).message}`);
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(
    contactId: string,
    leadId: string,
    tenantId: string
  ): Promise<Result<ContactDTO | null>> {
    try {
      const query = `
        SELECT * FROM lead_contacts
        WHERE id = $1 AND lead_id = $2 AND tenant_id = $3
      `;

      const queryResult = await this.pool.query(query, [contactId, leadId, tenantId]);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapToDTO(rows[0], leadId));
    } catch (error) {
      return Result.fail(`Failed to get contact: ${(error as Error).message}`);
    }
  }

  /**
   * Get all contacts for a lead
   */
  async getContactsByLead(
    leadId: string,
    tenantId: string,
    filters?: ContactFilterOptions
  ): Promise<Result<ContactDTO[]>> {
    try {
      let query = `
        SELECT * FROM lead_contacts
        WHERE lead_id = $1 AND tenant_id = $2
      `;
      const values: unknown[] = [leadId, tenantId];
      let paramIndex = 3;

      if (filters?.type) {
        query += ` AND contact_type = $${paramIndex++}`;
        values.push(filters.type);
      }

      if (filters?.role) {
        query += ` AND contact_role = $${paramIndex++}`;
        values.push(filters.role);
      }

      if (filters?.isPrimary !== undefined) {
        query += ` AND is_primary = $${paramIndex++}`;
        values.push(filters.isPrimary);
      }

      if (filters?.searchTerm) {
        query += ` AND (
          first_name ILIKE $${paramIndex} OR
          last_name ILIKE $${paramIndex} OR
          email ILIKE $${paramIndex} OR
          job_title ILIKE $${paramIndex}
        )`;
        values.push(`%${filters.searchTerm}%`);
        paramIndex++;
      }

      query += ` ORDER BY is_primary DESC, created_at ASC`;

      const queryResult = await this.pool.query(query, values);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      return Result.ok(rows.map((row: Record<string, unknown>) => this.mapToDTO(row, leadId)));
    } catch (error) {
      return Result.fail(`Failed to get contacts: ${(error as Error).message}`);
    }
  }

  /**
   * Get primary contact for a lead
   */
  async getPrimaryContact(leadId: string, tenantId: string): Promise<Result<ContactDTO | null>> {
    try {
      const query = `
        SELECT * FROM lead_contacts
        WHERE lead_id = $1 AND tenant_id = $2 AND is_primary = true
        LIMIT 1
      `;

      const queryResult = await this.pool.query(query, [leadId, tenantId]);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapToDTO(rows[0], leadId));
    } catch (error) {
      return Result.fail(`Failed to get primary contact: ${(error as Error).message}`);
    }
  }

  /**
   * Update contact
   */
  async updateContact(
    contactId: string,
    leadId: string,
    tenantId: string,
    request: UpdateContactRequest,
    updatedBy: string
  ): Promise<Result<ContactDTO>> {
    try {
      // Get existing contact
      const existingResult = await this.getContactById(contactId, leadId, tenantId);
      if (existingResult.isFailure) {
        return Result.fail(existingResult.error as string);
      }

      const existing = existingResult.getValue();
      if (!existing) {
        return Result.fail('Contact not found');
      }

      // Reconstitute and update
      const contactResult = Contact.reconstitute({
        id: existing.id,
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        phone: existing.phone,
        mobilePhone: existing.mobilePhone,
        jobTitle: existing.jobTitle,
        department: existing.department,
        type: existing.type,
        role: existing.role,
        isPrimary: existing.isPrimary,
        preferences: existing.preferences,
        linkedInUrl: existing.linkedInUrl,
        notes: existing.notes,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      });

      if (contactResult.isFailure) {
        return Result.fail(contactResult.error as string);
      }

      const contact = contactResult.getValue();
      const updateResult = contact.update(request);

      if (updateResult.isFailure) {
        return Result.fail(updateResult.error as string);
      }

      const updatedContact = updateResult.getValue();

      // If setting as primary, unset others
      if (request.isPrimary === true) {
        await this.unsetOtherPrimaryContacts(leadId, tenantId, contactId);
      }

      // Build update query dynamically
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (request.firstName !== undefined) {
        setClauses.push(`first_name = $${paramIndex++}`);
        values.push(updatedContact.firstName);
      }
      if (request.lastName !== undefined) {
        setClauses.push(`last_name = $${paramIndex++}`);
        values.push(updatedContact.lastName);
      }
      if (request.email !== undefined) {
        setClauses.push(`email = $${paramIndex++}`);
        values.push(updatedContact.email);
      }
      if (request.phone !== undefined) {
        setClauses.push(`phone = $${paramIndex++}`);
        values.push(request.phone);
      }
      if (request.mobilePhone !== undefined) {
        setClauses.push(`mobile_phone = $${paramIndex++}`);
        values.push(request.mobilePhone);
      }
      if (request.jobTitle !== undefined) {
        setClauses.push(`job_title = $${paramIndex++}`);
        values.push(request.jobTitle);
      }
      if (request.department !== undefined) {
        setClauses.push(`department = $${paramIndex++}`);
        values.push(request.department);
      }
      if (request.type !== undefined) {
        setClauses.push(`contact_type = $${paramIndex++}`);
        values.push(request.type);
      }
      if (request.role !== undefined) {
        setClauses.push(`contact_role = $${paramIndex++}`);
        values.push(request.role);
      }
      if (request.isPrimary !== undefined) {
        setClauses.push(`is_primary = $${paramIndex++}`);
        values.push(request.isPrimary);
      }
      if (request.preferences !== undefined) {
        setClauses.push(`preferences = $${paramIndex++}`);
        values.push(request.preferences ? JSON.stringify(request.preferences) : null);
      }
      if (request.linkedInUrl !== undefined) {
        setClauses.push(`linkedin_url = $${paramIndex++}`);
        values.push(request.linkedInUrl);
      }
      if (request.notes !== undefined) {
        setClauses.push(`notes = $${paramIndex++}`);
        values.push(request.notes);
      }

      values.push(contactId, leadId, tenantId);

      const query = `
        UPDATE lead_contacts
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex++} AND lead_id = $${paramIndex++} AND tenant_id = $${paramIndex}
        RETURNING *
      `;

      const queryResult = await this.pool.query(query, values);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      // Log changes
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      for (const key of Object.keys(request) as (keyof UpdateContactRequest)[]) {
        if (request[key] !== undefined && existing[key] !== request[key]) {
          changes[key] = { old: existing[key], new: request[key] };
        }
      }

      if (Object.keys(changes).length > 0) {
        await this.logContactHistory(contactId, tenantId, 'updated', changes, updatedBy);
      }

      return Result.ok(this.mapToDTO(rows[0], leadId));
    } catch (error) {
      return Result.fail(`Failed to update contact: ${(error as Error).message}`);
    }
  }

  /**
   * Delete contact
   */
  async deleteContact(
    contactId: string,
    leadId: string,
    tenantId: string,
    deletedBy: string
  ): Promise<Result<void>> {
    try {
      const query = `
        DELETE FROM lead_contacts
        WHERE id = $1 AND lead_id = $2 AND tenant_id = $3
        RETURNING *
      `;

      const queryResult = await this.pool.query(query, [contactId, leadId, tenantId]);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      if (rows.length === 0) {
        return Result.fail('Contact not found');
      }

      // Log deletion
      await this.logContactHistory(contactId, tenantId, 'deleted', {}, deletedBy);

      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to delete contact: ${(error as Error).message}`);
    }
  }

  /**
   * Set contact as primary
   */
  async setPrimaryContact(
    contactId: string,
    leadId: string,
    tenantId: string,
    setBy: string
  ): Promise<Result<ContactDTO>> {
    try {
      // Unset all other primary contacts
      await this.unsetOtherPrimaryContacts(leadId, tenantId, contactId);

      // Set this contact as primary
      const query = `
        UPDATE lead_contacts
        SET is_primary = true, updated_at = NOW()
        WHERE id = $1 AND lead_id = $2 AND tenant_id = $3
        RETURNING *
      `;

      const queryResult = await this.pool.query(query, [contactId, leadId, tenantId]);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      if (rows.length === 0) {
        return Result.fail('Contact not found');
      }

      await this.logContactHistory(contactId, tenantId, 'set_primary', {}, setBy);

      return Result.ok(this.mapToDTO(rows[0], leadId));
    } catch (error) {
      return Result.fail(`Failed to set primary contact: ${(error as Error).message}`);
    }
  }

  /**
   * Bulk import contacts
   */
  async bulkImportContacts(
    leadId: string,
    tenantId: string,
    request: BulkContactImportRequest,
    createdBy: string
  ): Promise<Result<BulkContactImportResult>> {
    try {
      // Verify lead exists
      const leadExists = await this.verifyLeadExists(leadId, tenantId);
      if (!leadExists) {
        return Result.fail('Lead not found');
      }

      const results: BulkContactResult[] = [];
      let successful = 0;
      let failed = 0;
      let duplicates = 0;

      // Get existing emails if skipping duplicates
      let existingEmails: Set<string> = new Set();
      if (request.skipDuplicates) {
        const existingContacts = await this.getContactsByLead(leadId, tenantId);
        if (existingContacts.isSuccess) {
          existingEmails = new Set(existingContacts.getValue().map((c) => c.email.toLowerCase()));
        }
      }

      for (const contactReq of request.contacts) {
        // Check for duplicates
        if (request.skipDuplicates && existingEmails.has(contactReq.email.toLowerCase())) {
          duplicates++;
          results.push({
            success: false,
            error: 'Duplicate email',
          });
          continue;
        }

        const createResult = await this.createContact(leadId, tenantId, contactReq, createdBy);

        if (createResult.isSuccess) {
          successful++;
          existingEmails.add(contactReq.email.toLowerCase());
          results.push({
            success: true,
            contactId: createResult.getValue().id,
            data: createResult.getValue(),
          });
        } else {
          failed++;
          results.push({
            success: false,
            error: createResult.error as string,
          });
        }
      }

      return Result.ok({
        total: request.contacts.length,
        successful,
        failed,
        duplicates,
        results,
      });
    } catch (error) {
      return Result.fail(`Failed to bulk import contacts: ${(error as Error).message}`);
    }
  }

  /**
   * Get contact history
   */
  async getContactHistory(
    contactId: string,
    tenantId: string
  ): Promise<Result<ContactHistoryEntry[]>> {
    try {
      const query = `
        SELECT * FROM lead_contact_history
        WHERE contact_id = $1 AND tenant_id = $2
        ORDER BY performed_at DESC
      `;

      const queryResult = await this.pool.query(query, [contactId, tenantId]);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      return Result.ok(
        rows.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          contactId: row.contact_id as string,
          action: row.action as ContactHistoryEntry['action'],
          changes: (row.changes as Record<string, { old: unknown; new: unknown }>) || {},
          performedBy: row.performed_by as string,
          performedAt: row.performed_at as Date,
        }))
      );
    } catch (error) {
      return Result.fail(`Failed to get contact history: ${(error as Error).message}`);
    }
  }

  /**
   * Count contacts by type for a lead
   */
  async countContactsByType(
    leadId: string,
    tenantId: string
  ): Promise<Result<Record<ContactType, number>>> {
    try {
      const query = `
        SELECT contact_type, COUNT(*) as count
        FROM lead_contacts
        WHERE lead_id = $1 AND tenant_id = $2
        GROUP BY contact_type
      `;

      const queryResult = await this.pool.query(query, [leadId, tenantId]);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      const counts = Object.values(ContactType).reduce(
        (acc, type) => {
          acc[type] = 0;
          return acc;
        },
        {} as Record<ContactType, number>
      );

      for (const row of rows) {
        counts[row.contact_type as ContactType] = parseInt(row.count as string, 10);
      }

      return Result.ok(counts);
    } catch (error) {
      return Result.fail(`Failed to count contacts: ${(error as Error).message}`);
    }
  }

  // Private helper methods

  private async verifyLeadExists(leadId: string, tenantId: string): Promise<boolean> {
    const query = `SELECT 1 FROM leads WHERE id = $1 AND tenant_id = $2`;
    const queryResult = await this.pool.query(query, [leadId, tenantId]);
    return queryResult.isSuccess && queryResult.getValue().rows.length > 0;
  }

  private async unsetOtherPrimaryContacts(
    leadId: string,
    tenantId: string,
    exceptContactId: string
  ): Promise<void> {
    const query = `
      UPDATE lead_contacts
      SET is_primary = false, updated_at = NOW()
      WHERE lead_id = $1 AND tenant_id = $2 AND id != $3 AND is_primary = true
    `;
    await this.pool.query(query, [leadId, tenantId, exceptContactId]);
  }

  private async logContactHistory(
    contactId: string,
    tenantId: string,
    action: string,
    changes: Record<string, unknown>,
    performedBy: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO lead_contact_history (id, contact_id, tenant_id, action, changes, performed_by, performed_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;
      await this.pool.query(query, [
        crypto.randomUUID(),
        contactId,
        tenantId,
        action,
        JSON.stringify(changes),
        performedBy,
      ]);
    } catch {
      // Silently fail - history is not critical
    }
  }

  private mapToDTO(row: Record<string, unknown>, leadId: string): ContactDTO {
    return {
      id: row.id as string,
      leadId,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      fullName: `${row.first_name} ${row.last_name}`,
      email: row.email as string,
      phone: row.phone as string | null,
      mobilePhone: row.mobile_phone as string | null,
      jobTitle: row.job_title as string | null,
      department: row.department as string | null,
      type: row.contact_type as ContactType,
      role: row.contact_role as ContactRole | null,
      isPrimary: row.is_primary as boolean,
      preferences:
        typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
      linkedInUrl: row.linkedin_url as string | null,
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

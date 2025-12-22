/**
 * Scheduled Alerts Service
 * Automated notifications for time-sensitive events:
 * - Overdue tasks
 * - Follow-up reminders
 * - Contract expiration alerts
 * - Quote expiration alerts
 * - Payment reminders
 * - Opportunity overdue alerts
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import { NotificationOrchestrator, NotificationRecipient } from './notification-orchestrator';
import { getAppConfig } from '../../config/environment';

export interface AlertConfig {
  enabled: boolean;
  // Days before expiration to send alerts
  daysBeforeExpiration: number[];
  // Hours of day to send alerts (24h format)
  sendAtHours: number[];
  // Timezone for scheduling
  timezone: string;
}

export interface ScheduledAlertResult {
  alertType: string;
  processed: number;
  notificationsSent: number;
  errors: Array<{ entityId: string; error: string }>;
}

@injectable()
export class ScheduledAlertsService {
  constructor(
    @inject('DatabasePool') private pool: DatabasePool,
    @inject(NotificationOrchestrator) private orchestrator: NotificationOrchestrator
  ) {}

  // ============================================================================
  // TASK ALERTS
  // ============================================================================

  /**
   * Send alerts for tasks due today
   */
  async sendTaskDueTodayAlerts(tenantId?: string): Promise<ScheduledAlertResult> {
    const result: ScheduledAlertResult = {
      alertType: 'task_due_today',
      processed: 0,
      notificationsSent: 0,
      errors: [],
    };

    try {
      const query = `
        SELECT
          t.id, t.tenant_id, t.title, t.description, t.due_date,
          t.assigned_to, t.priority, t.related_entity_type, t.related_entity_id,
          u.name as assignee_name, u.email as assignee_email, u.phone as assignee_phone
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.status NOT IN ('completed', 'cancelled')
          AND DATE(t.due_date) = CURRENT_DATE
          AND t.reminder_sent_today IS NOT TRUE
          ${tenantId ? 'AND t.tenant_id = $1' : ''}
        ORDER BY t.due_date ASC
        LIMIT 500
      `;

      const dbResult = await this.pool.query(query, tenantId ? [tenantId] : []);

      if (dbResult.isFailure || !dbResult.value?.rows) {
        return result;
      }

      const appConfig = getAppConfig();

      for (const task of dbResult.value.rows) {
        result.processed++;

        try {
          if (!task.assignee_email && !task.assignee_phone) {
            continue;
          }

          const recipient: NotificationRecipient = {
            userId: task.assigned_to,
            role: 'assignee',
            name: task.assignee_name || 'Usuario',
            email: task.assignee_email,
            phone: task.assignee_phone,
          };

          const notificationResult = await this.orchestrator.notify(
            task.tenant_id,
            'task.due_soon',
            recipient,
            {
              taskTitle: task.title,
              taskDescription: task.description || '',
              dueDate: new Date(task.due_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
              priority: task.priority,
              actionUrl: `${appConfig.appUrl}/tasks/${task.id}`,
            },
            'task',
            task.id
          );

          if (notificationResult.success) {
            result.notificationsSent++;

            // Mark task as notified today
            await this.pool.query(
              `UPDATE tasks SET reminder_sent_today = true, updated_at = NOW() WHERE id = $1`,
              [task.id]
            );
          }
        } catch (error) {
          result.errors.push({
            entityId: task.id,
            error: (error as Error).message,
          });
        }
      }

      console.log(`[ScheduledAlerts] Task due today: ${result.processed} processed, ${result.notificationsSent} sent`);
    } catch (error) {
      console.error('[ScheduledAlerts] Error in task due today alerts:', error);
    }

    return result;
  }

  /**
   * Send alerts for overdue tasks
   */
  async sendTaskOverdueAlerts(tenantId?: string): Promise<ScheduledAlertResult> {
    const result: ScheduledAlertResult = {
      alertType: 'task_overdue',
      processed: 0,
      notificationsSent: 0,
      errors: [],
    };

    try {
      const query = `
        SELECT
          t.id, t.tenant_id, t.title, t.description, t.due_date,
          t.assigned_to, t.priority, t.related_entity_type, t.related_entity_id,
          u.name as assignee_name, u.email as assignee_email, u.phone as assignee_phone,
          m.name as manager_name, m.email as manager_email, m.phone as manager_phone,
          EXTRACT(DAY FROM (NOW() - t.due_date)) as days_overdue
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN users m ON u.manager_id = m.id
        WHERE t.status NOT IN ('completed', 'cancelled')
          AND t.due_date < CURRENT_DATE
          AND (t.last_overdue_alert_at IS NULL OR t.last_overdue_alert_at < CURRENT_DATE)
          ${tenantId ? 'AND t.tenant_id = $1' : ''}
        ORDER BY t.due_date ASC
        LIMIT 500
      `;

      const dbResult = await this.pool.query(query, tenantId ? [tenantId] : []);

      if (dbResult.isFailure || !dbResult.value?.rows) {
        return result;
      }

      const appConfig = getAppConfig();

      for (const task of dbResult.value.rows) {
        result.processed++;

        try {
          const recipients: NotificationRecipient[] = [];

          // Notify assignee
          if (task.assignee_email || task.assignee_phone) {
            recipients.push({
              userId: task.assigned_to,
              role: 'assignee',
              name: task.assignee_name || 'Usuario',
              email: task.assignee_email,
              phone: task.assignee_phone,
            });
          }

          // Notify manager for tasks overdue > 2 days
          if (task.days_overdue > 2 && (task.manager_email || task.manager_phone)) {
            recipients.push({
              userId: task.manager_id || '',
              role: 'manager',
              name: task.manager_name || 'Manager',
              email: task.manager_email,
              phone: task.manager_phone,
            });
          }

          if (recipients.length === 0) {
            continue;
          }

          const notificationResult = await this.orchestrator.broadcast(
            task.tenant_id,
            'task.overdue',
            recipients,
            {
              taskTitle: task.title,
              taskDescription: task.description || '',
              dueDate: new Date(task.due_date).toLocaleDateString('es-MX'),
              daysOverdue: Math.floor(task.days_overdue),
              priority: task.priority,
              actionUrl: `${appConfig.appUrl}/tasks/${task.id}`,
            },
            'task',
            task.id
          );

          if (notificationResult.success) {
            result.notificationsSent += recipients.length;

            // Update last alert timestamp
            await this.pool.query(
              `UPDATE tasks SET last_overdue_alert_at = NOW(), updated_at = NOW() WHERE id = $1`,
              [task.id]
            );
          }
        } catch (error) {
          result.errors.push({
            entityId: task.id,
            error: (error as Error).message,
          });
        }
      }

      console.log(`[ScheduledAlerts] Task overdue: ${result.processed} processed, ${result.notificationsSent} sent`);
    } catch (error) {
      console.error('[ScheduledAlerts] Error in task overdue alerts:', error);
    }

    return result;
  }

  // ============================================================================
  // FOLLOW-UP ALERTS
  // ============================================================================

  /**
   * Send alerts for follow-ups due today
   */
  async sendFollowUpDueTodayAlerts(tenantId?: string): Promise<ScheduledAlertResult> {
    const result: ScheduledAlertResult = {
      alertType: 'follow_up_due_today',
      processed: 0,
      notificationsSent: 0,
      errors: [],
    };

    try {
      const query = `
        SELECT
          l.id, l.tenant_id, l.company_name, l.contact_name, l.email,
          l.next_follow_up_date, l.owner_id,
          u.name as owner_name, u.email as owner_email, u.phone as owner_phone
        FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.status NOT IN ('converted', 'lost', 'disqualified')
          AND DATE(l.next_follow_up_date) = CURRENT_DATE
          AND l.follow_up_reminder_sent IS NOT TRUE
          ${tenantId ? 'AND l.tenant_id = $1' : ''}
        ORDER BY l.next_follow_up_date ASC
        LIMIT 500
      `;

      const dbResult = await this.pool.query(query, tenantId ? [tenantId] : []);

      if (dbResult.isFailure || !dbResult.value?.rows) {
        return result;
      }

      const appConfig = getAppConfig();

      for (const lead of dbResult.value.rows) {
        result.processed++;

        try {
          if (!lead.owner_email && !lead.owner_phone) {
            continue;
          }

          const recipient: NotificationRecipient = {
            userId: lead.owner_id,
            role: 'owner',
            name: lead.owner_name || 'Usuario',
            email: lead.owner_email,
            phone: lead.owner_phone,
          };

          const followUpTime = new Date(lead.next_follow_up_date).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const notificationResult = await this.orchestrator.notify(
            lead.tenant_id,
            'lead.follow_up_due',
            recipient,
            {
              companyName: lead.company_name,
              contactName: lead.contact_name || 'Sin nombre',
              contactEmail: lead.email,
              followUpTime,
              actionUrl: `${appConfig.appUrl}/leads/${lead.id}`,
            },
            'lead',
            lead.id
          );

          if (notificationResult.success) {
            result.notificationsSent++;

            await this.pool.query(
              `UPDATE leads SET follow_up_reminder_sent = true, updated_at = NOW() WHERE id = $1`,
              [lead.id]
            );
          }
        } catch (error) {
          result.errors.push({
            entityId: lead.id,
            error: (error as Error).message,
          });
        }
      }

      console.log(`[ScheduledAlerts] Follow-up due today: ${result.processed} processed, ${result.notificationsSent} sent`);
    } catch (error) {
      console.error('[ScheduledAlerts] Error in follow-up due today alerts:', error);
    }

    return result;
  }

  /**
   * Send alerts for overdue follow-ups
   */
  async sendFollowUpOverdueAlerts(tenantId?: string): Promise<ScheduledAlertResult> {
    const result: ScheduledAlertResult = {
      alertType: 'follow_up_overdue',
      processed: 0,
      notificationsSent: 0,
      errors: [],
    };

    try {
      const query = `
        SELECT
          l.id, l.tenant_id, l.company_name, l.contact_name, l.email,
          l.next_follow_up_date, l.owner_id,
          u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
          EXTRACT(DAY FROM (NOW() - l.next_follow_up_date)) as days_overdue
        FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.status NOT IN ('converted', 'lost', 'disqualified')
          AND l.next_follow_up_date < CURRENT_DATE
          AND (l.last_follow_up_overdue_alert IS NULL OR l.last_follow_up_overdue_alert < CURRENT_DATE)
          ${tenantId ? 'AND l.tenant_id = $1' : ''}
        ORDER BY l.next_follow_up_date ASC
        LIMIT 500
      `;

      const dbResult = await this.pool.query(query, tenantId ? [tenantId] : []);

      if (dbResult.isFailure || !dbResult.value?.rows) {
        return result;
      }

      const appConfig = getAppConfig();

      for (const lead of dbResult.value.rows) {
        result.processed++;

        try {
          if (!lead.owner_email && !lead.owner_phone) {
            continue;
          }

          const recipient: NotificationRecipient = {
            userId: lead.owner_id,
            role: 'owner',
            name: lead.owner_name || 'Usuario',
            email: lead.owner_email,
            phone: lead.owner_phone,
          };

          const notificationResult = await this.orchestrator.notify(
            lead.tenant_id,
            'lead.follow_up_overdue',
            recipient,
            {
              companyName: lead.company_name,
              contactName: lead.contact_name || 'Sin nombre',
              daysOverdue: Math.floor(lead.days_overdue),
              actionUrl: `${appConfig.appUrl}/leads/${lead.id}`,
            },
            'lead',
            lead.id
          );

          if (notificationResult.success) {
            result.notificationsSent++;

            await this.pool.query(
              `UPDATE leads SET last_follow_up_overdue_alert = NOW(), updated_at = NOW() WHERE id = $1`,
              [lead.id]
            );
          }
        } catch (error) {
          result.errors.push({
            entityId: lead.id,
            error: (error as Error).message,
          });
        }
      }

      console.log(`[ScheduledAlerts] Follow-up overdue: ${result.processed} processed, ${result.notificationsSent} sent`);
    } catch (error) {
      console.error('[ScheduledAlerts] Error in follow-up overdue alerts:', error);
    }

    return result;
  }

  // ============================================================================
  // CONTRACT ALERTS
  // ============================================================================

  /**
   * Send alerts for contracts expiring soon
   */
  async sendContractExpiringAlerts(
    tenantId?: string,
    daysBeforeExpiration: number[] = [90, 60, 30, 14, 7, 1]
  ): Promise<ScheduledAlertResult> {
    const result: ScheduledAlertResult = {
      alertType: 'contract_expiring',
      processed: 0,
      notificationsSent: 0,
      errors: [],
    };

    try {
      // Build date conditions
      const dateConditions = daysBeforeExpiration
        .map((days, i) => `DATE(c.expiration_date) = CURRENT_DATE + INTERVAL '${days} days'`)
        .join(' OR ');

      const query = `
        SELECT
          c.id, c.tenant_id, c.contract_number, c.name, c.customer_name,
          c.total_value, c.currency, c.expiration_date, c.owner_id,
          u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
          cust.email as customer_email, cust.phone as customer_phone,
          EXTRACT(DAY FROM (c.expiration_date - NOW())) as days_until_expiration
        FROM contracts c
        LEFT JOIN users u ON c.owner_id = u.id
        LEFT JOIN customers cust ON c.customer_id = cust.id
        WHERE c.status = 'active'
          AND (${dateConditions})
          ${tenantId ? 'AND c.tenant_id = $1' : ''}
        ORDER BY c.expiration_date ASC
        LIMIT 500
      `;

      const dbResult = await this.pool.query(query, tenantId ? [tenantId] : []);

      if (dbResult.isFailure || !dbResult.value?.rows) {
        return result;
      }

      const appConfig = getAppConfig();

      for (const contract of dbResult.value.rows) {
        result.processed++;

        try {
          const recipients: NotificationRecipient[] = [];

          // Notify owner
          if (contract.owner_email || contract.owner_phone) {
            recipients.push({
              userId: contract.owner_id,
              role: 'owner',
              name: contract.owner_name || 'Account Manager',
              email: contract.owner_email,
              phone: contract.owner_phone,
            });
          }

          // Notify customer for 30, 14, 7, 1 day alerts
          const daysUntil = Math.floor(contract.days_until_expiration);
          if (daysUntil <= 30 && (contract.customer_email || contract.customer_phone)) {
            recipients.push({
              userId: contract.customer_id || '',
              role: 'customer',
              name: contract.customer_name,
              email: contract.customer_email,
              phone: contract.customer_phone,
            });
          }

          if (recipients.length === 0) {
            continue;
          }

          const notificationResult = await this.orchestrator.broadcast(
            contract.tenant_id,
            'contract.expiring_soon',
            recipients,
            {
              contractName: contract.name,
              contractNumber: contract.contract_number,
              customerName: contract.customer_name,
              contractValue: `${contract.currency} ${(contract.total_value / 100).toLocaleString()}`,
              expiryDate: new Date(contract.expiration_date).toLocaleDateString('es-MX'),
              daysUntilExpiration: daysUntil,
              actionUrl: `${appConfig.appUrl}/contracts/${contract.id}`,
            },
            'contract',
            contract.id
          );

          if (notificationResult.success) {
            result.notificationsSent += recipients.length;
          }
        } catch (error) {
          result.errors.push({
            entityId: contract.id,
            error: (error as Error).message,
          });
        }
      }

      console.log(`[ScheduledAlerts] Contract expiring: ${result.processed} processed, ${result.notificationsSent} sent`);
    } catch (error) {
      console.error('[ScheduledAlerts] Error in contract expiring alerts:', error);
    }

    return result;
  }

  // ============================================================================
  // QUOTE ALERTS
  // ============================================================================

  /**
   * Send alerts for quotes expiring soon
   */
  async sendQuoteExpiringAlerts(
    tenantId?: string,
    daysBeforeExpiration: number[] = [7, 3, 1]
  ): Promise<ScheduledAlertResult> {
    const result: ScheduledAlertResult = {
      alertType: 'quote_expiring',
      processed: 0,
      notificationsSent: 0,
      errors: [],
    };

    try {
      const dateConditions = daysBeforeExpiration
        .map((days) => `DATE(q.valid_until) = CURRENT_DATE + INTERVAL '${days} days'`)
        .join(' OR ');

      const query = `
        SELECT
          q.id, q.tenant_id, q.quote_number, q.total_amount, q.currency,
          q.valid_until, q.customer_name, q.customer_email, q.owner_id,
          u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
          EXTRACT(DAY FROM (q.valid_until - NOW())) as days_until_expiration
        FROM quotes q
        LEFT JOIN users u ON q.owner_id = u.id
        WHERE q.status = 'sent'
          AND (${dateConditions})
          ${tenantId ? 'AND q.tenant_id = $1' : ''}
        ORDER BY q.valid_until ASC
        LIMIT 500
      `;

      const dbResult = await this.pool.query(query, tenantId ? [tenantId] : []);

      if (dbResult.isFailure || !dbResult.value?.rows) {
        return result;
      }

      const appConfig = getAppConfig();

      for (const quote of dbResult.value.rows) {
        result.processed++;

        try {
          const recipients: NotificationRecipient[] = [];

          // Notify owner
          if (quote.owner_email || quote.owner_phone) {
            recipients.push({
              userId: quote.owner_id,
              role: 'owner',
              name: quote.owner_name || 'Sales Rep',
              email: quote.owner_email,
              phone: quote.owner_phone,
            });
          }

          // Notify customer
          if (quote.customer_email) {
            recipients.push({
              userId: '',
              role: 'customer',
              name: quote.customer_name,
              email: quote.customer_email,
            });
          }

          if (recipients.length === 0) {
            continue;
          }

          const notificationResult = await this.orchestrator.broadcast(
            quote.tenant_id,
            'quote.expiring_soon',
            recipients,
            {
              quoteNumber: quote.quote_number,
              companyName: quote.customer_name,
              amount: `${quote.currency} ${(quote.total_amount / 100).toLocaleString()}`,
              expiryDate: new Date(quote.valid_until).toLocaleDateString('es-MX'),
              daysUntilExpiration: Math.floor(quote.days_until_expiration),
              actionUrl: `${appConfig.appUrl}/quotes/${quote.id}`,
            },
            'quote',
            quote.id
          );

          if (notificationResult.success) {
            result.notificationsSent += recipients.length;
          }
        } catch (error) {
          result.errors.push({
            entityId: quote.id,
            error: (error as Error).message,
          });
        }
      }

      console.log(`[ScheduledAlerts] Quote expiring: ${result.processed} processed, ${result.notificationsSent} sent`);
    } catch (error) {
      console.error('[ScheduledAlerts] Error in quote expiring alerts:', error);
    }

    return result;
  }

  // ============================================================================
  // OPPORTUNITY ALERTS
  // ============================================================================

  /**
   * Send alerts for overdue opportunities (past expected close date)
   */
  async sendOpportunityOverdueAlerts(tenantId?: string): Promise<ScheduledAlertResult> {
    const result: ScheduledAlertResult = {
      alertType: 'opportunity_overdue',
      processed: 0,
      notificationsSent: 0,
      errors: [],
    };

    try {
      const query = `
        SELECT
          o.id, o.tenant_id, o.name, o.amount, o.currency, o.expected_close_date,
          o.owner_id, o.stage_id,
          u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
          EXTRACT(DAY FROM (NOW() - o.expected_close_date)) as days_overdue
        FROM opportunities o
        LEFT JOIN users u ON o.owner_id = u.id
        WHERE o.status = 'open'
          AND o.expected_close_date < CURRENT_DATE
          AND (o.last_overdue_alert_at IS NULL OR o.last_overdue_alert_at < CURRENT_DATE - INTERVAL '3 days')
          ${tenantId ? 'AND o.tenant_id = $1' : ''}
        ORDER BY o.expected_close_date ASC
        LIMIT 500
      `;

      const dbResult = await this.pool.query(query, tenantId ? [tenantId] : []);

      if (dbResult.isFailure || !dbResult.value?.rows) {
        return result;
      }

      const appConfig = getAppConfig();

      for (const opportunity of dbResult.value.rows) {
        result.processed++;

        try {
          if (!opportunity.owner_email && !opportunity.owner_phone) {
            continue;
          }

          const recipient: NotificationRecipient = {
            userId: opportunity.owner_id,
            role: 'owner',
            name: opportunity.owner_name || 'Sales Rep',
            email: opportunity.owner_email,
            phone: opportunity.owner_phone,
          };

          const notificationResult = await this.orchestrator.notify(
            opportunity.tenant_id,
            'opportunity.overdue',
            recipient,
            {
              opportunityName: opportunity.name,
              amount: `${opportunity.currency || 'USD'} ${(opportunity.amount / 100).toLocaleString()}`,
              closeDate: new Date(opportunity.expected_close_date).toLocaleDateString('es-MX'),
              daysOverdue: Math.floor(opportunity.days_overdue),
              actionUrl: `${appConfig.appUrl}/opportunities/${opportunity.id}`,
            },
            'opportunity',
            opportunity.id
          );

          if (notificationResult.success) {
            result.notificationsSent++;

            await this.pool.query(
              `UPDATE opportunities SET last_overdue_alert_at = NOW(), updated_at = NOW() WHERE id = $1`,
              [opportunity.id]
            );
          }
        } catch (error) {
          result.errors.push({
            entityId: opportunity.id,
            error: (error as Error).message,
          });
        }
      }

      console.log(`[ScheduledAlerts] Opportunity overdue: ${result.processed} processed, ${result.notificationsSent} sent`);
    } catch (error) {
      console.error('[ScheduledAlerts] Error in opportunity overdue alerts:', error);
    }

    return result;
  }

  // ============================================================================
  // PAYMENT ALERTS
  // ============================================================================

  /**
   * Send payment reminder alerts
   */
  async sendPaymentReminderAlerts(
    tenantId?: string,
    daysBeforeDue: number[] = [7, 3, 1]
  ): Promise<ScheduledAlertResult> {
    const result: ScheduledAlertResult = {
      alertType: 'payment_reminder',
      processed: 0,
      notificationsSent: 0,
      errors: [],
    };

    try {
      const dateConditions = daysBeforeDue
        .map((days) => `DATE(i.due_date) = CURRENT_DATE + INTERVAL '${days} days'`)
        .join(' OR ');

      const query = `
        SELECT
          i.id, i.tenant_id, i.invoice_number, i.amount, i.currency, i.due_date,
          i.customer_id, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
          EXTRACT(DAY FROM (i.due_date - NOW())) as days_until_due
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.status = 'pending'
          AND (${dateConditions})
          ${tenantId ? 'AND i.tenant_id = $1' : ''}
        ORDER BY i.due_date ASC
        LIMIT 500
      `;

      const dbResult = await this.pool.query(query, tenantId ? [tenantId] : []);

      if (dbResult.isFailure || !dbResult.value?.rows) {
        return result;
      }

      const appConfig = getAppConfig();

      for (const invoice of dbResult.value.rows) {
        result.processed++;

        try {
          if (!invoice.customer_email && !invoice.customer_phone) {
            continue;
          }

          const recipient: NotificationRecipient = {
            userId: invoice.customer_id,
            role: 'customer',
            name: invoice.customer_name,
            email: invoice.customer_email,
            phone: invoice.customer_phone,
          };

          const notificationResult = await this.orchestrator.notify(
            invoice.tenant_id,
            'payment.reminder',
            recipient,
            {
              invoiceNumber: invoice.invoice_number,
              amount: `${invoice.currency || 'USD'} ${(invoice.amount / 100).toLocaleString()}`,
              dueDate: new Date(invoice.due_date).toLocaleDateString('es-MX'),
              daysUntilDue: Math.floor(invoice.days_until_due),
              actionUrl: `${appConfig.appUrl}/invoices/${invoice.id}/pay`,
            },
            'payment',
            invoice.id
          );

          if (notificationResult.success) {
            result.notificationsSent++;
          }
        } catch (error) {
          result.errors.push({
            entityId: invoice.id,
            error: (error as Error).message,
          });
        }
      }

      console.log(`[ScheduledAlerts] Payment reminder: ${result.processed} processed, ${result.notificationsSent} sent`);
    } catch (error) {
      console.error('[ScheduledAlerts] Error in payment reminder alerts:', error);
    }

    return result;
  }

  // ============================================================================
  // MASTER RUN ALL
  // ============================================================================

  /**
   * Run all scheduled alerts
   */
  async runAllAlerts(tenantId?: string): Promise<Record<string, ScheduledAlertResult>> {
    console.log('[ScheduledAlerts] Running all scheduled alerts...');
    const startTime = Date.now();

    const results: Record<string, ScheduledAlertResult> = {};

    // Task alerts
    results.taskDueToday = await this.sendTaskDueTodayAlerts(tenantId);
    results.taskOverdue = await this.sendTaskOverdueAlerts(tenantId);

    // Follow-up alerts
    results.followUpDueToday = await this.sendFollowUpDueTodayAlerts(tenantId);
    results.followUpOverdue = await this.sendFollowUpOverdueAlerts(tenantId);

    // Contract alerts
    results.contractExpiring = await this.sendContractExpiringAlerts(tenantId);

    // Quote alerts
    results.quoteExpiring = await this.sendQuoteExpiringAlerts(tenantId);

    // Opportunity alerts
    results.opportunityOverdue = await this.sendOpportunityOverdueAlerts(tenantId);

    // Payment alerts
    results.paymentReminder = await this.sendPaymentReminderAlerts(tenantId);

    const totalTime = Date.now() - startTime;
    const totalNotifications = Object.values(results).reduce((sum, r) => sum + r.notificationsSent, 0);

    console.log(`[ScheduledAlerts] All alerts completed in ${totalTime}ms. Total notifications: ${totalNotifications}`);

    return results;
  }
}

// Singleton instance
let scheduledAlertsInstance: ScheduledAlertsService | null = null;

export function getScheduledAlertsService(
  pool?: DatabasePool,
  orchestrator?: NotificationOrchestrator
): ScheduledAlertsService {
  if (!scheduledAlertsInstance && pool && orchestrator) {
    scheduledAlertsInstance = new ScheduledAlertsService(pool, orchestrator);
  }
  if (!scheduledAlertsInstance) {
    throw new Error('ScheduledAlertsService not initialized.');
  }
  return scheduledAlertsInstance;
}

// Add static method for backward compatibility with CronSchedulerService
(ScheduledAlertsService as unknown as { getInstance: () => ScheduledAlertsService }).getInstance = function(): ScheduledAlertsService {
  return getScheduledAlertsService();
};

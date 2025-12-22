/**
 * Unified Inbox / Omnichannel Hub Service
 * Central service for managing communications across all channels
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { eq, and, desc, asc, gte, lte, or, like, sql, count, sum, avg, inArray } from 'drizzle-orm';
import {
  UnifiedMessage,
  Conversation,
  InboxView,
  InboxFilter,
  ChannelAccount,
  CannedResponse,
  SLAPolicy,
  UnifiedInboxSearchParams,
  UnifiedInboxSearchResult,
  UnifiedInboxDashboard,
  BulkAction,
  ComposeMessage,
  SendMessageResult,
  MessageChannel,
  ConversationStatus,
  ConversationPriority,
  MessageDirection,
} from './types';
import {
  leadCommunications,
  emailMessages,
  smsMessages,
  whatsappMessages,
  whatsappConversations,
} from '../database/schema';

@injectable()
export class UnifiedInboxService {
  constructor(@inject('Database') private db: any) {}

  // ==================== Conversations ====================

  /**
   * Get all conversations with filters
   */
  async getConversations(
    params: UnifiedInboxSearchParams
  ): Promise<Result<UnifiedInboxSearchResult>> {
    try {
      const { tenantId, page = 1, limit = 20, filters } = params;
      const offset = (page - 1) * limit;

      // Build base query from communications grouped as conversations
      let query = this.db
        .select({
          id: leadCommunications.id,
          tenantId: leadCommunications.tenantId,
          channel: leadCommunications.channel,
          subject: leadCommunications.subject,
          status: leadCommunications.status,
          direction: leadCommunications.direction,
          leadId: leadCommunications.leadId,
          createdAt: leadCommunications.createdAt,
          updatedAt: leadCommunications.updatedAt,
        })
        .from(leadCommunications)
        .where(eq(leadCommunications.tenantId, tenantId));

      // Apply filters
      if (filters) {
        if (filters.channels?.length) {
          query = query.where(
            inArray(leadCommunications.channel, filters.channels)
          );
        }

        if (filters.statuses?.length) {
          query = query.where(
            inArray(leadCommunications.status, filters.statuses)
          );
        }

        if (filters.searchQuery) {
          query = query.where(
            or(
              like(leadCommunications.subject, `%${filters.searchQuery}%`),
              like(leadCommunications.content, `%${filters.searchQuery}%`)
            )
          );
        }

        if (filters.dateRange?.start) {
          query = query.where(
            gte(leadCommunications.createdAt, filters.dateRange.start)
          );
        }

        if (filters.dateRange?.end) {
          query = query.where(
            lte(leadCommunications.createdAt, filters.dateRange.end)
          );
        }
      }

      // Get total count
      const countResult = await this.db
        .select({ count: count() })
        .from(leadCommunications)
        .where(eq(leadCommunications.tenantId, tenantId));

      const total = Number(countResult[0]?.count || 0);

      // Apply sorting
      const sortOrder = params.sortOrder === 'asc' ? asc : desc;
      switch (params.sortBy) {
        case 'oldest':
          query = query.orderBy(asc(leadCommunications.createdAt));
          break;
        case 'priority':
          query = query.orderBy(desc(leadCommunications.priority));
          break;
        default:
          query = query.orderBy(desc(leadCommunications.createdAt));
      }

      // Apply pagination
      const results = await query.limit(limit).offset(offset);

      // Transform to Conversation type
      const conversations: Conversation[] = results.map((comm: any) => ({
        id: comm.id,
        tenantId: comm.tenantId,
        subject: comm.subject,
        channel: comm.channel || 'email',
        participants: [],
        status: this.mapStatus(comm.status),
        priority: comm.priority || 'normal',
        messageCount: 1,
        unreadCount: comm.isRead ? 0 : 1,
        lastMessageAt: comm.createdAt,
        linkedEntityType: 'lead',
        linkedEntityId: comm.leadId,
        createdAt: comm.createdAt,
        updatedAt: comm.updatedAt,
      }));

      // Get unread total
      const unreadResult = await this.db
        .select({ count: count() })
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.isRead, false)
          )
        );

      return Result.ok({
        conversations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadTotal: Number(unreadResult[0]?.count || 0),
      });
    } catch (error) {
      return Result.fail(`Failed to get conversations: ${error}`);
    }
  }

  /**
   * Get a single conversation with all messages
   */
  async getConversation(
    tenantId: string,
    conversationId: string
  ): Promise<Result<Conversation & { messages: UnifiedMessage[] }>> {
    try {
      // Get the conversation (communication)
      const result = await this.db
        .select()
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.id, conversationId)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return Result.fail('Conversation not found');
      }

      const comm = result[0];

      // Get thread messages if there's a thread ID
      let messages: UnifiedMessage[] = [];
      if (comm.threadId) {
        const threadMessages = await this.db
          .select()
          .from(leadCommunications)
          .where(
            and(
              eq(leadCommunications.tenantId, tenantId),
              eq(leadCommunications.threadId, comm.threadId)
            )
          )
          .orderBy(asc(leadCommunications.createdAt));

        messages = threadMessages.map((msg: any) => this.transformToUnifiedMessage(msg));
      } else {
        messages = [this.transformToUnifiedMessage(comm)];
      }

      const conversation: Conversation & { messages: UnifiedMessage[] } = {
        id: comm.id,
        tenantId: comm.tenantId,
        subject: comm.subject,
        channel: comm.channel || 'email',
        participants: [],
        status: this.mapStatus(comm.status),
        priority: comm.priority || 'normal',
        messageCount: messages.length,
        unreadCount: messages.filter((m) => !m.isRead).length,
        lastMessage: messages[messages.length - 1],
        lastMessageAt: messages[messages.length - 1]?.createdAt,
        linkedEntityType: 'lead',
        linkedEntityId: comm.leadId,
        createdAt: comm.createdAt,
        updatedAt: comm.updatedAt,
        messages,
      };

      return Result.ok(conversation);
    } catch (error) {
      return Result.fail(`Failed to get conversation: ${error}`);
    }
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    tenantId: string,
    conversationId: string,
    status: ConversationStatus
  ): Promise<Result<void>> {
    try {
      await this.db
        .update(leadCommunications)
        .set({
          status: this.unmapStatus(status),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.id, conversationId)
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to update conversation status: ${error}`);
    }
  }

  /**
   * Assign conversation to user or team
   */
  async assignConversation(
    tenantId: string,
    conversationId: string,
    assigneeId?: string,
    teamId?: string
  ): Promise<Result<void>> {
    try {
      await this.db
        .update(leadCommunications)
        .set({
          assignedTo: assigneeId,
          assignedTeamId: teamId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.id, conversationId)
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to assign conversation: ${error}`);
    }
  }

  /**
   * Mark conversation as read/unread
   */
  async markAsRead(
    tenantId: string,
    conversationId: string,
    isRead: boolean
  ): Promise<Result<void>> {
    try {
      await this.db
        .update(leadCommunications)
        .set({
          isRead,
          readAt: isRead ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.id, conversationId)
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to mark conversation: ${error}`);
    }
  }

  /**
   * Snooze conversation
   */
  async snoozeConversation(
    tenantId: string,
    conversationId: string,
    snoozeUntil: Date
  ): Promise<Result<void>> {
    try {
      await this.db
        .update(leadCommunications)
        .set({
          status: 'snoozed',
          snoozedUntil: snoozeUntil,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.id, conversationId)
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to snooze conversation: ${error}`);
    }
  }

  /**
   * Add tags to conversation
   */
  async addTags(
    tenantId: string,
    conversationId: string,
    tags: string[]
  ): Promise<Result<void>> {
    try {
      const result = await this.db
        .select({ tags: leadCommunications.tags })
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.id, conversationId)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return Result.fail('Conversation not found');
      }

      const existingTags = result[0].tags ? JSON.parse(result[0].tags) : [];
      const newTags = [...new Set([...existingTags, ...tags])];

      await this.db
        .update(leadCommunications)
        .set({
          tags: JSON.stringify(newTags),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.id, conversationId)
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to add tags: ${error}`);
    }
  }

  // ==================== Messages ====================

  /**
   * Get messages for a conversation
   */
  async getMessages(
    tenantId: string,
    conversationId: string,
    limit: number = 50,
    before?: Date
  ): Promise<Result<UnifiedMessage[]>> {
    try {
      let query = this.db
        .select()
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            or(
              eq(leadCommunications.id, conversationId),
              eq(leadCommunications.threadId, conversationId)
            )
          )
        );

      if (before) {
        query = query.where(lte(leadCommunications.createdAt, before));
      }

      const results = await query
        .orderBy(desc(leadCommunications.createdAt))
        .limit(limit);

      const messages = results.map((msg: any) => this.transformToUnifiedMessage(msg));

      return Result.ok(messages.reverse()); // Return in chronological order
    } catch (error) {
      return Result.fail(`Failed to get messages: ${error}`);
    }
  }

  /**
   * Send a new message
   */
  async sendMessage(
    tenantId: string,
    userId: string,
    message: ComposeMessage
  ): Promise<Result<SendMessageResult>> {
    try {
      const now = new Date();

      // Create communication record
      const newMessage = {
        id: crypto.randomUUID(),
        tenantId,
        leadId: message.linkedEntityId,
        channel: message.channel,
        communicationType: message.channel,
        direction: 'outbound' as MessageDirection,
        subject: message.subject,
        content: message.body,
        htmlContent: message.bodyHtml,
        status: message.scheduledFor ? 'scheduled' : 'sent',
        fromEmail: message.accountId,
        toEmail: message.to.map((p) => p.email).filter(Boolean).join(','),
        threadId: message.replyToConversationId,
        inReplyTo: message.replyToMessageId,
        scheduledAt: message.scheduledFor,
        sentAt: message.scheduledFor ? null : now,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.insert(leadCommunications).values(newMessage);

      return Result.ok({
        success: true,
        messageId: newMessage.id,
        conversationId: message.replyToConversationId || newMessage.id,
        sentAt: newMessage.sentAt || undefined,
      });
    } catch (error) {
      return Result.fail(`Failed to send message: ${error}`);
    }
  }

  /**
   * Reply to a conversation
   */
  async replyToConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
    body: string,
    bodyHtml?: string
  ): Promise<Result<SendMessageResult>> {
    try {
      // Get original conversation
      const original = await this.db
        .select()
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.id, conversationId)
          )
        )
        .limit(1);

      if (original.length === 0) {
        return Result.fail('Conversation not found');
      }

      const conv = original[0];
      const now = new Date();

      // Create reply
      const reply = {
        id: crypto.randomUUID(),
        tenantId,
        leadId: conv.leadId,
        channel: conv.channel,
        communicationType: conv.communicationType,
        direction: 'outbound' as MessageDirection,
        subject: conv.subject?.startsWith('Re:') ? conv.subject : `Re: ${conv.subject || ''}`,
        content: body,
        htmlContent: bodyHtml,
        status: 'sent',
        threadId: conv.threadId || conversationId,
        inReplyTo: conversationId,
        sentAt: now,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.insert(leadCommunications).values(reply);

      // Update original conversation status
      await this.db
        .update(leadCommunications)
        .set({
          status: 'replied',
          updatedAt: now,
        })
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.id, conversationId)
          )
        );

      return Result.ok({
        success: true,
        messageId: reply.id,
        conversationId: conv.threadId || conversationId,
        sentAt: now,
      });
    } catch (error) {
      return Result.fail(`Failed to reply: ${error}`);
    }
  }

  // ==================== Inbox Views ====================

  /**
   * Get inbox views for user
   */
  async getInboxViews(
    tenantId: string,
    userId: string
  ): Promise<Result<InboxView[]>> {
    try {
      // Return default system views
      const defaultViews: InboxView[] = [
        {
          id: 'all',
          tenantId,
          name: 'All Conversations',
          filters: {},
          sortBy: 'newest',
          isDefault: true,
          isShared: true,
          isSystemView: true,
          position: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'unread',
          tenantId,
          name: 'Unread',
          filters: { hasUnread: true },
          sortBy: 'newest',
          isDefault: false,
          isShared: true,
          isSystemView: true,
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'assigned',
          tenantId,
          userId,
          name: 'Assigned to Me',
          filters: { assignedToIds: [userId] },
          sortBy: 'newest',
          isDefault: false,
          isShared: false,
          isSystemView: true,
          position: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'email',
          tenantId,
          name: 'Email',
          filters: { channels: ['email'] },
          sortBy: 'newest',
          isDefault: false,
          isShared: true,
          isSystemView: true,
          position: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sms',
          tenantId,
          name: 'SMS',
          filters: { channels: ['sms'] },
          sortBy: 'newest',
          isDefault: false,
          isShared: true,
          isSystemView: true,
          position: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'whatsapp',
          tenantId,
          name: 'WhatsApp',
          filters: { channels: ['whatsapp'] },
          sortBy: 'newest',
          isDefault: false,
          isShared: true,
          isSystemView: true,
          position: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Get counts for each view
      for (const view of defaultViews) {
        const countResult = await this.getViewCounts(tenantId, view.filters);
        if (countResult.isSuccess) {
          view.conversationCount = countResult.value.total;
          view.unreadCount = countResult.value.unread;
        }
      }

      return Result.ok(defaultViews);
    } catch (error) {
      return Result.fail(`Failed to get inbox views: ${error}`);
    }
  }

  /**
   * Get counts for a filter
   */
  private async getViewCounts(
    tenantId: string,
    filters: InboxFilter
  ): Promise<Result<{ total: number; unread: number }>> {
    try {
      let baseCondition = eq(leadCommunications.tenantId, tenantId);

      if (filters.channels?.length) {
        baseCondition = and(
          baseCondition,
          inArray(leadCommunications.channel, filters.channels)
        ) as any;
      }

      if (filters.hasUnread) {
        baseCondition = and(
          baseCondition,
          eq(leadCommunications.isRead, false)
        ) as any;
      }

      const totalResult = await this.db
        .select({ count: count() })
        .from(leadCommunications)
        .where(baseCondition);

      const unreadResult = await this.db
        .select({ count: count() })
        .from(leadCommunications)
        .where(and(baseCondition, eq(leadCommunications.isRead, false)));

      return Result.ok({
        total: Number(totalResult[0]?.count || 0),
        unread: Number(unreadResult[0]?.count || 0),
      });
    } catch (error) {
      return Result.fail(`Failed to get counts: ${error}`);
    }
  }

  // ==================== Canned Responses ====================

  /**
   * Get canned responses
   */
  async getCannedResponses(
    tenantId: string,
    channel?: MessageChannel
  ): Promise<Result<CannedResponse[]>> {
    try {
      // Would fetch from canned_responses table
      // For now return empty array
      return Result.ok([]);
    } catch (error) {
      return Result.fail(`Failed to get canned responses: ${error}`);
    }
  }

  /**
   * Create canned response
   */
  async createCannedResponse(
    tenantId: string,
    userId: string,
    data: Partial<CannedResponse>
  ): Promise<Result<CannedResponse>> {
    try {
      const response: CannedResponse = {
        id: crypto.randomUUID(),
        tenantId,
        createdBy: userId,
        name: data.name || '',
        shortcut: data.shortcut,
        category: data.category,
        subject: data.subject,
        body: data.body || '',
        bodyHtml: data.bodyHtml,
        channels: data.channels,
        mergeFields: data.mergeFields,
        usageCount: 0,
        isPublic: data.isPublic ?? true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Would insert into canned_responses table
      return Result.ok(response);
    } catch (error) {
      return Result.fail(`Failed to create canned response: ${error}`);
    }
  }

  // ==================== Dashboard ====================

  /**
   * Get inbox dashboard metrics
   */
  async getDashboard(
    tenantId: string,
    userId?: string
  ): Promise<Result<UnifiedInboxDashboard>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get total conversations
      const totalResult = await this.db
        .select({ count: count() })
        .from(leadCommunications)
        .where(eq(leadCommunications.tenantId, tenantId));

      // Get open conversations
      const openResult = await this.db
        .select({ count: count() })
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            or(
              eq(leadCommunications.status, 'pending'),
              eq(leadCommunications.status, 'sent')
            )
          )
        );

      // Get unread messages
      const unreadResult = await this.db
        .select({ count: count() })
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            eq(leadCommunications.isRead, false)
          )
        );

      // Get by channel
      const byChannel = await this.db
        .select({
          channel: leadCommunications.channel,
          count: count(),
          unread: sql`SUM(CASE WHEN ${leadCommunications.isRead} = false THEN 1 ELSE 0 END)`,
        })
        .from(leadCommunications)
        .where(eq(leadCommunications.tenantId, tenantId))
        .groupBy(leadCommunications.channel);

      // Get by status
      const byStatus = await this.db
        .select({
          status: leadCommunications.status,
          count: count(),
        })
        .from(leadCommunications)
        .where(eq(leadCommunications.tenantId, tenantId))
        .groupBy(leadCommunications.status);

      // Get volume trends
      const volumeTrends = await this.db
        .select({
          date: sql`DATE(${leadCommunications.createdAt})`,
          inbound: sql`SUM(CASE WHEN ${leadCommunications.direction} = 'inbound' THEN 1 ELSE 0 END)`,
          outbound: sql`SUM(CASE WHEN ${leadCommunications.direction} = 'outbound' THEN 1 ELSE 0 END)`,
        })
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            gte(leadCommunications.createdAt, thirtyDaysAgo)
          )
        )
        .groupBy(sql`DATE(${leadCommunications.createdAt})`)
        .orderBy(sql`DATE(${leadCommunications.createdAt})`);

      const statusCounts = byStatus.reduce(
        (acc: any, item: any) => {
          acc[item.status] = Number(item.count || 0);
          return acc;
        },
        { new: 0, open: 0, pending: 0, resolved: 0, closed: 0, snoozed: 0 }
      );

      const dashboard: UnifiedInboxDashboard = {
        tenantId,
        userId,
        totalConversations: Number(totalResult[0]?.count || 0),
        openConversations: Number(openResult[0]?.count || 0),
        unreadMessages: Number(unreadResult[0]?.count || 0),
        pendingResponses: statusCounts.pending,
        byStatus: statusCounts,
        byChannel: byChannel.map((ch: any) => ({
          channel: ch.channel || 'email',
          count: Number(ch.count || 0),
          unread: Number(ch.unread || 0),
        })),
        byPriority: {
          urgent: 0,
          high: 0,
          normal: Number(totalResult[0]?.count || 0),
          low: 0,
        },
        performance: {
          avgFirstResponseTime: 3600, // 1 hour placeholder
          avgResolutionTime: 86400, // 24 hours placeholder
          slaComplianceRate: 95,
        },
        volumeTrends: volumeTrends.map((trend: any) => ({
          date: String(trend.date),
          inbound: Number(trend.inbound || 0),
          outbound: Number(trend.outbound || 0),
        })),
        slaBreaches: 0,
        slaAtRisk: 0,
        generatedAt: now,
      };

      return Result.ok(dashboard);
    } catch (error) {
      return Result.fail(`Failed to get dashboard: ${error}`);
    }
  }

  // ==================== Bulk Actions ====================

  /**
   * Perform bulk action on conversations
   */
  async performBulkAction(
    tenantId: string,
    userId: string,
    action: BulkAction
  ): Promise<Result<{ success: number; failed: number }>> {
    try {
      let success = 0;
      let failed = 0;

      for (const conversationId of action.conversationIds) {
        try {
          switch (action.action) {
            case 'mark_read':
              await this.markAsRead(tenantId, conversationId, true);
              break;
            case 'mark_unread':
              await this.markAsRead(tenantId, conversationId, false);
              break;
            case 'close':
              await this.updateConversationStatus(tenantId, conversationId, 'closed');
              break;
            case 'reopen':
              await this.updateConversationStatus(tenantId, conversationId, 'open');
              break;
            case 'assign':
              await this.assignConversation(
                tenantId,
                conversationId,
                action.params?.assigneeId,
                action.params?.teamId
              );
              break;
            case 'snooze':
              if (action.params?.snoozeUntil) {
                await this.snoozeConversation(
                  tenantId,
                  conversationId,
                  action.params.snoozeUntil
                );
              }
              break;
            case 'add_tag':
              if (action.params?.tags) {
                await this.addTags(tenantId, conversationId, action.params.tags);
              }
              break;
            case 'change_priority':
              await this.db
                .update(leadCommunications)
                .set({
                  priority: action.params?.priority,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(leadCommunications.tenantId, tenantId),
                    eq(leadCommunications.id, conversationId)
                  )
                );
              break;
            case 'change_status':
              if (action.params?.status) {
                await this.updateConversationStatus(
                  tenantId,
                  conversationId,
                  action.params.status
                );
              }
              break;
          }
          success++;
        } catch {
          failed++;
        }
      }

      return Result.ok({ success, failed });
    } catch (error) {
      return Result.fail(`Failed to perform bulk action: ${error}`);
    }
  }

  // ==================== Search ====================

  /**
   * Search across all messages
   */
  async searchMessages(
    tenantId: string,
    query: string,
    options?: {
      channels?: MessageChannel[];
      dateRange?: { start?: Date; end?: Date };
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<{ messages: UnifiedMessage[]; total: number }>> {
    try {
      const limit = options?.limit || 20;
      const offset = options?.offset || 0;

      let dbQuery = this.db
        .select()
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            or(
              like(leadCommunications.subject, `%${query}%`),
              like(leadCommunications.content, `%${query}%`)
            )
          )
        );

      if (options?.channels?.length) {
        dbQuery = dbQuery.where(
          inArray(leadCommunications.channel, options.channels)
        );
      }

      if (options?.dateRange?.start) {
        dbQuery = dbQuery.where(
          gte(leadCommunications.createdAt, options.dateRange.start)
        );
      }

      if (options?.dateRange?.end) {
        dbQuery = dbQuery.where(
          lte(leadCommunications.createdAt, options.dateRange.end)
        );
      }

      // Get total count
      const countResult = await this.db
        .select({ count: count() })
        .from(leadCommunications)
        .where(
          and(
            eq(leadCommunications.tenantId, tenantId),
            or(
              like(leadCommunications.subject, `%${query}%`),
              like(leadCommunications.content, `%${query}%`)
            )
          )
        );

      const results = await dbQuery
        .orderBy(desc(leadCommunications.createdAt))
        .limit(limit)
        .offset(offset);

      const messages = results.map((msg: any) => this.transformToUnifiedMessage(msg));

      return Result.ok({
        messages,
        total: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return Result.fail(`Failed to search messages: ${error}`);
    }
  }

  // ==================== Aggregation from Multiple Sources ====================

  /**
   * Get unified view from all channels
   */
  async getUnifiedInbox(
    tenantId: string,
    params: UnifiedInboxSearchParams
  ): Promise<Result<UnifiedInboxSearchResult>> {
    try {
      // Get from lead communications
      const leadCommsResult = await this.getConversations(params);

      // In a full implementation, we'd also aggregate from:
      // - emailMessages
      // - smsMessages
      // - whatsappMessages
      // - etc.

      // For now, return the lead communications result
      return leadCommsResult;
    } catch (error) {
      return Result.fail(`Failed to get unified inbox: ${error}`);
    }
  }

  // ==================== Helper Methods ====================

  private transformToUnifiedMessage(comm: any): UnifiedMessage {
    return {
      id: comm.id,
      tenantId: comm.tenantId,
      conversationId: comm.threadId || comm.id,
      channel: comm.channel || 'email',
      direction: comm.direction || 'outbound',
      status: comm.status || 'sent',
      subject: comm.subject,
      body: comm.content || '',
      bodyHtml: comm.htmlContent,
      snippet: comm.content?.substring(0, 100),
      from: {
        email: comm.fromEmail,
        name: comm.fromName,
        type: 'external',
      },
      to: comm.toEmail
        ? comm.toEmail.split(',').map((email: string) => ({
            email: email.trim(),
            type: 'external' as const,
          }))
        : [],
      threadId: comm.threadId,
      attachments: comm.attachments ? JSON.parse(comm.attachments) : [],
      hasAttachments: comm.attachmentCount > 0,
      attachmentCount: comm.attachmentCount || 0,
      isRead: comm.isRead ?? true,
      isStarred: comm.isStarred ?? false,
      labels: comm.labels ? JSON.parse(comm.labels) : [],
      sentAt: comm.sentAt,
      receivedAt: comm.receivedAt,
      createdAt: comm.createdAt,
      updatedAt: comm.updatedAt,
    };
  }

  private mapStatus(dbStatus: string): ConversationStatus {
    const mapping: Record<string, ConversationStatus> = {
      pending: 'pending',
      sent: 'open',
      delivered: 'open',
      read: 'open',
      replied: 'resolved',
      completed: 'closed',
      failed: 'closed',
      snoozed: 'snoozed',
    };
    return mapping[dbStatus] || 'new';
  }

  private unmapStatus(status: ConversationStatus): string {
    const mapping: Record<ConversationStatus, string> = {
      new: 'pending',
      open: 'sent',
      pending: 'pending',
      resolved: 'replied',
      closed: 'completed',
      snoozed: 'snoozed',
    };
    return mapping[status] || 'pending';
  }
}

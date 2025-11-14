# Notification Service - Diseño de Solución Detallado
**Version**: 1.0.0 | **Fecha**: Enero 2025 | **Status**: Design Complete ✅

---

## 🎯 Visión General

### Bounded Context
**Multi-Channel Notifications** - Gestión unificada de comunicaciones por email, SMS, WhatsApp, in-app notifications y push notifications.

### Responsabilidades Core
```yaml
Primary:
  - Email delivery (transactional + marketing)
  - SMS delivery (México via Twilio)
  - WhatsApp messaging (Business API)
  - In-app notifications (real-time WebSocket)
  - Push notifications (mobile)
  - Notification templates management
  - Delivery tracking (sent, delivered, opened, clicked)
  - Notification preferences (user opt-in/opt-out)
  - Scheduled notifications (future delivery)
  - Batch notifications (bulk send)

Secondary:
  - Email template builder (WYSIWYG)
  - Notification analytics
  - Delivery failure retry
  - Rate limiting per channel
  - Unsubscribe management
```

### Dependencies
```yaml
Upstream (consume eventos de):
  - Lead Service: Lead.Created → Welcome email
  - Customer Service: Customer.Created → Onboarding email
  - Proposal Service: Proposal.Sent → Customer notification
  - Financial Service: Invoice.Issued → Invoice email
  - Analytics Service: Report.Generated → Email with attachment

External Services:
  - SendGrid/AWS SES (email)
  - Twilio (SMS + WhatsApp)
  - Firebase Cloud Messaging (push notifications)
  - WebSocket server (in-app real-time)

Infrastructure:
  - PostgreSQL: Notification logs, templates, preferences
  - MongoDB: Email HTML content, delivery logs (TTL 90 days)
  - Redis: Rate limiting, deduplication
  - NATS: Event consuming
  - S3: Email attachments
```

---

## 📊 Casos de Uso Principales

### UC-1: Send Transactional Email
```yaml
Actor: System (automated)
Trigger: Domain event (e.g., Proposal.Sent)

Flow:
  1. System receives event via NATS
  2. System determines notification type (proposal_sent)
  3. System loads email template
  4. System personalizes template (variables: customer_name, proposal_number)
  5. System checks user preferences (email opt-in)
  6. System checks rate limit (no spam)
  7. System checks deduplication (don't send twice)
  8. System sends via SendGrid
  9. System records notification log
  10. System publishes Notification.Sent event

Success:
  - Email delivered
  - Delivery status tracked
  - Open/click tracking enabled
```

### UC-2: Send SMS (México)
```yaml
Actor: System
Use Cases:
  - Two-factor authentication (2FA)
  - Payment reminders
  - Urgent alerts

Flow:
  1. System creates SMS notification
  2. System validates phone number (México format: +52...)
  3. System checks user SMS preferences
  4. System sends via Twilio
  5. Twilio webhook: message status update
  6. System records delivery status

Rate Limiting:
  - Max 5 SMS per user per day (anti-spam)
  - Cost control: Alert at $100/month spend
```

### UC-3: WhatsApp Business Message
```yaml
Actor: Sales Rep, System
Use Cases:
  - Follow-up messages
  - Proposal delivery
  - Customer support

Flow:
  1. Sales Rep sends WhatsApp message
  2. System validates WhatsApp Business template (SAT approved)
  3. System sends via Twilio WhatsApp API
  4. System tracks delivery status
  5. System logs conversation

Business Rules:
  - Must use approved templates
  - Cannot send marketing (opt-in required)
  - 24-hour response window
```

### UC-4: In-App Notification (Real-Time)
```yaml
Actor: System
Trigger: Important event (Proposal approved, Payment received)

Flow:
  1. System creates in-app notification
  2. System publishes via WebSocket to connected user
  3. Frontend displays notification toast
  4. User clicks notification → Navigate to relevant page
  5. System marks as read

Notification Types:
  - Info (blue)
  - Success (green)
  - Warning (yellow)
  - Error (red)
```

### UC-5: Scheduled Notification
```yaml
Actor: Admin, System
Use Cases:
  - Payment reminders (3 days before due)
  - Renewal reminders (90, 60, 30 days before)
  - Follow-up sequences

Flow:
  1. System creates scheduled notification
  2. System stores in database (scheduled_for timestamp)
  3. Cron job runs every 5 minutes
  4. System finds notifications due now
  5. System sends notifications
  6. System marks as sent

Example:
  - Invoice due 2025-02-15
  - Schedule reminder for 2025-02-12 09:00
```

---

## 🏛️ Arquitectura de Dominio

### Aggregate: Notification

```typescript
/**
 * Notification Aggregate
 */

enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  IN_APP = 'in_app',
  PUSH = 'push',
}

enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  OPENED = 'opened',
  CLICKED = 'clicked',
}

enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

class Notification {
  private domainEvents: DomainEvent[] = [];

  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly channel: NotificationChannel,
    public readonly recipientId: string,        // User ID or Customer ID
    public readonly recipientEmail: string | null,
    public readonly recipientPhone: string | null,
    private templateId: string | null,
    private subject: string | null,            // Email subject
    private body: string,                      // HTML or plain text
    private data: Record<string, any>,        // Template variables
    private priority: NotificationPriority,
    private status: NotificationStatus,
    private scheduledFor: Date | null,        // Null = send now
    private sentAt: Date | null,
    private deliveredAt: Date | null,
    private openedAt: Date | null,
    private clickedAt: Date | null,
    private failureReason: string | null,
    private externalId: string | null,        // SendGrid message ID, Twilio SID
    private attachments: Attachment[],
    public readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  // Business logic
  markAsSent(externalId: string): Result<void> {
    if (this.status !== NotificationStatus.PENDING) {
      return Result.fail('Can only mark pending notifications as sent');
    }

    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
    this.externalId = externalId;
    this.updatedAt = new Date();

    this.addDomainEvent({
      type: 'Notification.Sent',
      data: {
        notificationId: this.id,
        channel: this.channel,
        recipientId: this.recipientId,
      },
    });

    return Result.ok();
  }

  markAsDelivered(): Result<void> {
    if (this.status !== NotificationStatus.SENT) {
      return Result.fail('Can only mark sent notifications as delivered');
    }

    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = new Date();
    this.updatedAt = new Date();

    this.addDomainEvent({
      type: 'Notification.Delivered',
      data: {
        notificationId: this.id,
        channel: this.channel,
      },
    });

    return Result.ok();
  }

  markAsOpened(): Result<void> {
    if (this.channel !== NotificationChannel.EMAIL) {
      return Result.fail('Only emails can be opened');
    }

    this.status = NotificationStatus.OPENED;
    this.openedAt = new Date();
    this.updatedAt = new Date();

    return Result.ok();
  }

  markAsClicked(): Result<void> {
    if (this.channel !== NotificationChannel.EMAIL) {
      return Result.fail('Only emails can have click tracking');
    }

    this.status = NotificationStatus.CLICKED;
    this.clickedAt = new Date();
    this.updatedAt = new Date();

    return Result.ok();
  }

  markAsFailed(reason: string): Result<void> {
    this.status = NotificationStatus.FAILED;
    this.failureReason = reason;
    this.updatedAt = new Date();

    this.addDomainEvent({
      type: 'Notification.Failed',
      data: {
        notificationId: this.id,
        channel: this.channel,
        reason,
      },
    });

    return Result.ok();
  }

  isScheduled(): boolean {
    return this.scheduledFor !== null && this.scheduledFor > new Date();
  }

  isDue(): boolean {
    return this.scheduledFor !== null && this.scheduledFor <= new Date();
  }

  // Getters
  getStatus(): NotificationStatus { return this.status; }
  getChannel(): NotificationChannel { return this.channel; }

  getDomainEvents(): DomainEvent[] { return [...this.domainEvents]; }
  clearDomainEvents(): void { this.domainEvents = []; }

  private addDomainEvent(event: any): void {
    this.domainEvents.push({
      id: crypto.randomUUID(),
      ...event,
      tenantId: this.tenantId,
      timestamp: new Date(),
    });
  }

  // Factory
  static createEmail(
    tenantId: string,
    recipientId: string,
    recipientEmail: string,
    templateId: string,
    data: Record<string, any>,
    scheduledFor: Date | null = null
  ): Result<Notification> {
    const notification = new Notification(
      crypto.randomUUID(),
      tenantId,
      NotificationChannel.EMAIL,
      recipientId,
      recipientEmail,
      null,
      templateId,
      null,
      '',
      data,
      NotificationPriority.NORMAL,
      NotificationStatus.PENDING,
      scheduledFor,
      null,
      null,
      null,
      null,
      null,
      null,
      [],
      new Date(),
      new Date()
    );

    notification.addDomainEvent({
      type: 'Notification.Created',
      data: {
        notificationId: notification.id,
        channel: NotificationChannel.EMAIL,
        recipientId,
      },
    });

    return Result.ok(notification);
  }

  static createSMS(
    tenantId: string,
    recipientId: string,
    recipientPhone: string,
    body: string
  ): Result<Notification> {
    // Validate México phone format: +52XXXXXXXXXX
    if (!recipientPhone.startsWith('+52')) {
      return Result.fail('Phone must start with +52 (México)');
    }

    const notification = new Notification(
      crypto.randomUUID(),
      tenantId,
      NotificationChannel.SMS,
      recipientId,
      null,
      recipientPhone,
      null,
      null,
      body,
      {},
      NotificationPriority.HIGH,
      NotificationStatus.PENDING,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [],
      new Date(),
      new Date()
    );

    return Result.ok(notification);
  }
}

interface Attachment {
  filename: string;
  content_type: string;
  url: string; // S3 URL
}
```

### Aggregate: NotificationTemplate

```typescript
/**
 * Notification Template
 */

enum TemplateType {
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
}

class NotificationTemplate {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private name: string,
    private description: string,
    private type: TemplateType,
    private channel: NotificationChannel,
    private subject: string | null,        // Email subject (Handlebars)
    private body: string,                  // HTML or text (Handlebars)
    private variables: string[],           // Required variables: ['customer_name', 'amount']
    private active: boolean,
    public readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  render(data: Record<string, any>): Result<{ subject?: string; body: string }> {
    // Validate all required variables provided
    for (const variable of this.variables) {
      if (!(variable in data)) {
        return Result.fail(`Missing required variable: ${variable}`);
      }
    }

    try {
      // Render with Handlebars
      const Handlebars = require('handlebars');

      const renderedBody = Handlebars.compile(this.body)(data);
      const renderedSubject = this.subject
        ? Handlebars.compile(this.subject)(data)
        : undefined;

      return Result.ok({
        subject: renderedSubject,
        body: renderedBody,
      });
    } catch (error) {
      return Result.fail(`Template rendering error: ${error.message}`);
    }
  }

  activate(): void {
    this.active = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.active = false;
    this.updatedAt = new Date();
  }

  isActive(): boolean {
    return this.active;
  }
}
```

---

## 📧 Email Service (SendGrid)

```typescript
/**
 * Email Service - SendGrid Integration
 */

import sgMail from '@sendgrid/mail';

class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendEmail(notification: Notification): Promise<Result<string>> {
    try {
      // Load template
      const template = await this.templateRepo.findById(notification.templateId!);
      if (!template) {
        return Result.fail('Template not found');
      }

      // Render template
      const renderResult = template.render(notification.data);
      if (renderResult.isFailure) {
        return Result.fail(renderResult.error);
      }

      const { subject, body } = renderResult.value;

      // Send via SendGrid
      const msg = {
        to: notification.recipientEmail!,
        from: {
          email: process.env.FROM_EMAIL!,
          name: 'Zuclubit CRM',
        },
        subject: subject!,
        html: body,
        // Open tracking
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
        // Attachments
        attachments: notification.attachments.map((att) => ({
          filename: att.filename,
          type: att.content_type,
          content: att.url, // Base64 or URL
        })),
      };

      const response = await sgMail.send(msg);
      const messageId = response[0].headers['x-message-id'];

      // Mark as sent
      notification.markAsSent(messageId);

      return Result.ok(messageId);
    } catch (error) {
      notification.markAsFailed(error.message);
      return Result.fail(`Email send failed: ${error.message}`);
    }
  }

  /**
   * Handle SendGrid webhooks (delivery status updates)
   */
  async handleWebhook(events: any[]): Promise<void> {
    for (const event of events) {
      const messageId = event.sg_message_id;
      const notification = await this.notificationRepo.findByExternalId(messageId);

      if (!notification) continue;

      switch (event.event) {
        case 'delivered':
          notification.markAsDelivered();
          break;
        case 'open':
          notification.markAsOpened();
          break;
        case 'click':
          notification.markAsClicked();
          break;
        case 'bounce':
        case 'dropped':
          notification.markAsFailed(event.reason);
          break;
      }

      await this.notificationRepo.save(notification);
    }
  }
}
```

---

## 📱 SMS & WhatsApp Service (Twilio)

```typescript
/**
 * SMS/WhatsApp Service - Twilio Integration
 */

import twilio from 'twilio';

class TwilioService {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  async sendSMS(notification: Notification): Promise<Result<string>> {
    try {
      const message = await this.client.messages.create({
        body: notification.body,
        from: process.env.TWILIO_PHONE_NUMBER!, // Twilio number
        to: notification.recipientPhone!,
      });

      notification.markAsSent(message.sid);

      return Result.ok(message.sid);
    } catch (error) {
      notification.markAsFailed(error.message);
      return Result.fail(`SMS send failed: ${error.message}`);
    }
  }

  async sendWhatsApp(notification: Notification): Promise<Result<string>> {
    try {
      // WhatsApp messages must use approved templates
      const message = await this.client.messages.create({
        body: notification.body,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER!}`,
        to: `whatsapp:${notification.recipientPhone!}`,
      });

      notification.markAsSent(message.sid);

      return Result.ok(message.sid);
    } catch (error) {
      notification.markAsFailed(error.message);
      return Result.fail(`WhatsApp send failed: ${error.message}`);
    }
  }

  /**
   * Handle Twilio webhooks (status updates)
   */
  async handleWebhook(body: any): Promise<void> {
    const messageSid = body.MessageSid;
    const status = body.MessageStatus; // delivered, failed, etc.

    const notification = await this.notificationRepo.findByExternalId(messageSid);
    if (!notification) return;

    switch (status) {
      case 'delivered':
        notification.markAsDelivered();
        break;
      case 'failed':
      case 'undelivered':
        notification.markAsFailed(body.ErrorMessage);
        break;
    }

    await this.notificationRepo.save(notification);
  }
}
```

---

## 🔔 In-App Notification Service

```typescript
/**
 * In-App Notification Service (WebSocket)
 */

import { Server as SocketIOServer } from 'socket.io';

class InAppNotificationService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Authenticate user
      const userId = socket.handshake.query.userId as string;
      if (!userId) {
        socket.disconnect();
        return;
      }

      // Join user room
      socket.join(`user:${userId}`);

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });

      socket.on('mark_read', async (notificationId: string) => {
        await this.markAsRead(notificationId);
      });
    });
  }

  async sendInAppNotification(notification: Notification): Promise<Result<void>> {
    try {
      // Emit to user room
      this.io.to(`user:${notification.recipientId}`).emit('notification', {
        id: notification.id,
        type: notification.data.type || 'info', // info, success, warning, error
        title: notification.subject,
        body: notification.body,
        timestamp: new Date(),
      });

      notification.markAsSent('websocket');

      return Result.ok();
    } catch (error) {
      notification.markAsFailed(error.message);
      return Result.fail(`In-app notification failed: ${error.message}`);
    }
  }

  private async markAsRead(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(notificationId);
    if (notification) {
      notification.markAsOpened();
      await this.notificationRepo.save(notification);
    }
  }
}
```

---

## 🗄️ Base de Datos

### PostgreSQL Schema

```sql
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  channel VARCHAR(50) NOT NULL, -- email, sms, whatsapp, in_app, push

  recipient_id UUID NOT NULL,   -- User or Customer
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),

  template_id UUID,
  subject VARCHAR(500),
  body TEXT NOT NULL,
  data JSONB,                   -- Template variables

  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',

  scheduled_for TIMESTAMP,      -- NULL = send immediately
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,

  failure_reason TEXT,
  external_id VARCHAR(255),     -- SendGrid message ID, Twilio SID

  attachments JSONB,            -- Array of attachments

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT check_channel CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app', 'push')),
  CONSTRAINT check_status CHECK (status IN (
    'pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'
  ))
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX idx_notifications_external_id ON notifications(external_id);

-- Templates table
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- transactional, marketing
  channel VARCHAR(50) NOT NULL,

  subject VARCHAR(500),        -- Email subject (Handlebars)
  body TEXT NOT NULL,          -- HTML or text (Handlebars)

  variables TEXT[],            -- Required variables
  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT unique_template_name UNIQUE (tenant_id, name)
);

-- User notification preferences
CREATE TABLE notification_preferences (
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,

  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Specific preferences
  marketing_emails BOOLEAN NOT NULL DEFAULT FALSE,
  product_updates BOOLEAN NOT NULL DEFAULT TRUE,
  transactional_emails BOOLEAN NOT NULL DEFAULT TRUE,

  updated_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (user_id, tenant_id),
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### MongoDB (Delivery Logs)

```typescript
// Collection: notification_delivery_logs (TTL 90 days)
interface NotificationDeliveryLog {
  _id: ObjectId;
  tenant_id: string;
  notification_id: string;
  channel: string;

  // Delivery timeline
  created_at: Date;
  sent_at: Date | null;
  delivered_at: Date | null;
  opened_at: Date | null;
  clicked_at: Date | null;

  // Status
  status: string;
  failure_reason: string | null;

  // Metadata
  external_id: string | null;
  metadata: Record<string, any>;

  // TTL
  expires_at: Date; // 90 days
}

db.notification_delivery_logs.createIndexes([
  { key: { tenant_id: 1, notification_id: 1 } },
  { key: { expires_at: 1 }, expireAfterSeconds: 0 },
]);
```

---

## 🔌 API Design

```typescript
/**
 * Notification Service - API v1
 */

// POST /api/v1/notifications/send
interface SendNotificationRequest {
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  recipient_id: string;
  recipient_email?: string;
  recipient_phone?: string;
  template_id?: string;
  subject?: string;
  body?: string;
  data?: Record<string, any>;
  scheduled_for?: string; // ISO timestamp
}

// POST /api/v1/notifications/batch
interface SendBatchNotificationsRequest {
  notifications: SendNotificationRequest[];
}

// GET /api/v1/notifications
// List notifications (for user inbox)

// PATCH /api/v1/notifications/:id/mark-read
// Mark in-app notification as read

// GET /api/v1/notifications/preferences
// Get user notification preferences

// PATCH /api/v1/notifications/preferences
interface UpdatePreferencesRequest {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  marketing_emails?: boolean;
}

// POST /api/v1/notifications/webhooks/sendgrid
// SendGrid webhook receiver

// POST /api/v1/notifications/webhooks/twilio
// Twilio webhook receiver

// POST /api/v1/notifications/templates
// Create template (admin)

// GET /api/v1/notifications/templates
// List templates
```

---

## ⚡ Rate Limiting & Deduplication

```typescript
/**
 * Rate Limiting Service
 */

class NotificationRateLimiter {
  constructor(private redis: RedisClient) {}

  async checkRateLimit(
    userId: string,
    channel: NotificationChannel
  ): Promise<Result<void>> {
    const limits = {
      email: { max: 50, window: 3600 },      // 50/hour
      sms: { max: 5, window: 86400 },        // 5/day
      whatsapp: { max: 20, window: 86400 },  // 20/day
      in_app: { max: 100, window: 3600 },    // 100/hour
    };

    const limit = limits[channel];
    const key = `ratelimit:${channel}:${userId}`;

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, limit.window);
    }

    if (current > limit.max) {
      return Result.fail(`Rate limit exceeded for ${channel}`);
    }

    return Result.ok();
  }
}

/**
 * Deduplication Service
 */

class NotificationDeduplicationService {
  constructor(private redis: RedisClient) {}

  async isDuplicate(
    recipientId: string,
    templateId: string,
    channel: NotificationChannel
  ): Promise<boolean> {
    const key = `dedup:${channel}:${recipientId}:${templateId}`;
    const exists = await this.redis.exists(key);

    if (exists) {
      return true; // Duplicate, don't send
    }

    // Mark as sent (TTL 1 hour)
    await this.redis.set(key, '1', { ex: 3600 });

    return false;
  }
}
```

---

## 🎯 Summary

**Notification Service** - Diseño completo:

### ✅ Componentes:
- **Multi-Channel Support** (Email, SMS, WhatsApp, In-App, Push)
- **Template Engine** (Handlebars)
- **Delivery Tracking** (Sent, Delivered, Opened, Clicked)
- **Rate Limiting** (Anti-spam)
- **Deduplication** (Prevent duplicate sends)
- **Scheduled Notifications** (Future delivery)
- **User Preferences** (Opt-in/opt-out)
- **Webhook Handlers** (SendGrid, Twilio)

### 📊 Métricas:
- **Channels**: 5 (Email, SMS, WhatsApp, In-App, Push)
- **External Services**: SendGrid, Twilio, Firebase
- **Database Tables**: 3 (PostgreSQL)
- **MongoDB Collections**: 1 (Delivery logs 90 days)
- **Rate Limits**: Channel-specific
- **Template Engine**: Handlebars

### 🔑 Features:
- ✅ Transactional + Marketing emails
- ✅ SMS México (Twilio)
- ✅ WhatsApp Business API
- ✅ Real-time WebSocket notifications
- ✅ Template management (WYSIWYG)
- ✅ Delivery analytics
- ✅ Unsubscribe management
- ✅ Batch sending
- ✅ Scheduled delivery

---

**Status**: ✅ DESIGN COMPLETE
**All 8 microservices designed!** 🎉

Next: Crear documento resumen de patrones comunes

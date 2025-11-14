# Lead Service - Diseño de Solución Detallado
**Version**: 1.0.0 | **Fecha**: Enero 2025 | **Status**: Design Complete ✅

---

## 📋 Índice
1. [Visión General](#visión-general)
2. [Requisitos y Casos de Uso](#requisitos-y-casos-de-uso)
3. [Arquitectura de Dominio (DDD)](#arquitectura-de-dominio-ddd)
4. [Diseño de Base de Datos](#diseño-de-base-de-datos)
5. [API Design](#api-design)
6. [Event-Driven Flows](#event-driven-flows)
7. [Patrones de Implementación](#patrones-de-implementación)
8. [Manejo de Errores](#manejo-de-errores)
9. [Seguridad](#seguridad)
10. [Observabilidad](#observabilidad)
11. [Escalabilidad](#escalabilidad)

---

## 🎯 Visión General

### Bounded Context
**Lead Management** - Gestión completa del ciclo de vida de leads desde captura hasta conversión a cliente.

### Responsabilidades Core
```yaml
Primary:
  - Lead CRUD operations (Create, Read, Update, Delete)
  - Lead qualification workflow
  - Lead scoring (integración con AI Service)
  - Lead source tracking y attribution
  - Activity timeline (integración con MongoDB)
  - Lead assignment y re-assignment
  - Duplicate detection y merge

Secondary:
  - Contact management (persona asociada al lead)
  - Lead source analytics
  - Conversion tracking
  - Lead nurturing status
```

### Límites del Contexto (Context Boundaries)
```yaml
✅ Dentro del alcance:
  - Lead data y lifecycle
  - Contact information
  - Lead qualification rules
  - Activity logging (write)
  - Lead scoring coordination

❌ Fuera del alcance:
  - Customer management (Customer Service)
  - Proposal creation (Proposal Service)
  - Payment processing (Financial Service)
  - Marketing campaigns (futuro Marketing Service)
  - Email sending (Notification Service)
```

### Dependencies
```yaml
Upstream (consume de):
  - AI Automation Service: Lead scoring results
  - Notification Service: Envío de notificaciones

Downstream (provee a):
  - Proposal Service: Lead data para proposals
  - Customer Service: Lead data para conversión
  - Analytics Service: Lead metrics

Infrastructure:
  - PostgreSQL: Transactional lead data
  - MongoDB: Activity logs (high-write volume)
  - NATS: Event publishing/consuming
  - Redis: Caching, deduplication
  - Supabase Auth: User authentication
```

---

## 📊 Requisitos y Casos de Uso

### Functional Requirements

#### FR-1: Lead Creation
```yaml
Actor: Sales Rep, Marketing Automation, API Integration
Preconditions:
  - User authenticated
  - Has permission to create leads

Flow:
  1. User submits lead data (contact info, company, source)
  2. System validates data (email format, required fields)
  3. System checks for duplicates (fuzzy matching)
  4. If duplicate found, prompt user (merge or create new)
  5. System creates lead + contact
  6. System publishes Lead.Created event
  7. System triggers AI scoring (async)
  8. System returns lead ID and data

Postconditions:
  - Lead persisted in PostgreSQL
  - Event published to NATS
  - Activity log created in MongoDB
  - AI scoring job queued

Business Rules:
  - Email is required (unique per tenant)
  - Phone or company name required (at least one)
  - Lead owner can be auto-assigned (round-robin, territory)
  - Initial score = 0 (updated by AI service)
  - Initial status = 'new'
```

#### FR-2: Lead Qualification
```yaml
Actor: Sales Rep, Automated Rule
Preconditions:
  - Lead exists
  - User has permission
  - Lead not already qualified/disqualified

Flow:
  1. User/System triggers qualification
  2. System evaluates qualification criteria:
     - Budget confirmed (Y/N)
     - Authority confirmed (Y/N)
     - Need confirmed (Y/N)
     - Timeline confirmed (Y/N)
     - Score >= threshold (e.g., 70)
  3. If all criteria met → status = 'qualified'
  4. System publishes Lead.Qualified event
  5. System creates Opportunity (or triggers Proposal Service)
  6. System sends notification to sales rep

Postconditions:
  - Lead status updated
  - Event published
  - Notification sent
  - Opportunity created (if configured)

Business Rules:
  - BANT criteria (Budget, Authority, Need, Timeline)
  - Minimum score threshold (configurable per tenant)
  - Can have custom qualification rules per tenant
  - Once qualified, can't go back to 'new' (one-way)
```

#### FR-3: Lead Scoring (AI Integration)
```yaml
Actor: System (AI Automation Service)
Trigger: Lead.Created, Lead.Updated, Schedule (daily rescore)

Flow:
  1. AI Service consumes Lead.Created event
  2. AI Service extracts features:
     - Company size (employee_count)
     - Industry match
     - Geographic fit
     - Engagement level (activities count)
     - Source quality
  3. AI Service invokes SageMaker endpoint
  4. AI Service publishes AI.LeadScored event
  5. Lead Service consumes event
  6. Lead Service updates score in PostgreSQL
  7. If score crossed threshold, trigger auto-qualification
  8. Send notification if high-value lead (score > 80)

Postconditions:
  - Lead score updated
  - Potential auto-qualification
  - High-value alert sent

Business Rules:
  - Score range: 0-100
  - Rescoring happens: on create, on update, daily batch
  - Score factors configurable per tenant
  - Score history tracked (audit trail)
```

#### FR-4: Activity Logging
```yaml
Actor: Any service, Sales Rep
Trigger: User action, API call

Types of Activities:
  - Call (phone call logged)
  - Email (email sent/received)
  - Meeting (calendar event)
  - Note (free-form note)
  - Task (to-do item)
  - WhatsApp (message via WhatsApp)
  - Form submission (web form)
  - Page view (website tracking)

Flow:
  1. Activity event received (HTTP or event bus)
  2. Validate activity data
  3. Store in MongoDB (activity_logs collection)
  4. Update lead.last_activity_at (PostgreSQL)
  5. Update engagement score
  6. Publish Activity.Logged event (for analytics)

Storage Strategy:
  - Write to MongoDB (optimized for high-volume writes)
  - Hot data: last 90 days (TTL)
  - Archive to S3 after 90 days
  - PostgreSQL: only last_activity_at timestamp

Business Rules:
  - Activities are immutable (no updates, only create)
  - TTL: 90 days in MongoDB
  - Activities contribute to engagement score
  - Activities trigger lead scoring update
```

#### FR-5: Duplicate Detection
```yaml
Trigger: Lead creation, Manual check
Algorithm: Multi-factor fuzzy matching

Matching Factors:
  1. Email exact match (100% confidence)
  2. Phone exact match (90% confidence)
  3. Company name + contact name fuzzy (70% confidence)
  4. Domain match (email domain = company website) (60% confidence)

Flow:
  1. On lead creation, extract matching keys
  2. Query PostgreSQL for potential duplicates
  3. Calculate confidence score per duplicate
  4. If confidence > 80%, block creation and suggest merge
  5. If confidence 50-80%, warn user but allow creation
  6. If confidence < 50%, create lead
  7. Store deduplication check in Redis (cache for 1 hour)

Implementation:
  - Use PostgreSQL trigram similarity (pg_trgm extension)
  - Use Redis for recent duplicate checks (cache)
  - Async batch job: find duplicates across all leads (weekly)

Business Rules:
  - Email duplicates: hard block (same tenant)
  - Phone duplicates: soft warning
  - Cross-tenant isolation (never match across tenants)
  - User can override and force create
```

### Non-Functional Requirements

#### NFR-1: Performance
```yaml
Response Times:
  - GET /leads (list): < 200ms (p95)
  - GET /leads/:id: < 100ms (p95)
  - POST /leads (create): < 500ms (p95)
  - PUT /leads/:id (update): < 300ms (p95)
  - GET /leads/:id/activities: < 300ms (p95)

Throughput:
  - Handle 1000 lead creations/minute (peak)
  - Handle 10,000 reads/minute (peak)
  - Activity logging: 5000 writes/minute

Optimization Strategies:
  - Database connection pooling (max 20 connections)
  - Redis caching for frequently accessed leads
  - MongoDB for high-volume activity writes
  - Database indexes on tenant_id, status, score
  - Pagination for list endpoints (max 100 per page)
```

#### NFR-2: Scalability
```yaml
Horizontal Scaling:
  - Stateless Lambda functions (can scale to 1000+ instances)
  - Database: RDS read replicas for read-heavy queries
  - MongoDB: Sharding by tenant_id (when > 10K tenants)
  - NATS: Consumer groups for parallel processing

Vertical Scaling:
  - Start: db.t4g.medium (Phase 1)
  - Growth: db.r6g.large (Phase 2)
  - Scale: db.r6g.2xlarge (Phase 3)

Data Volume:
  - Expected: 1M leads (Phase 1), 10M leads (Phase 2)
  - PostgreSQL: Can handle 100M+ rows with proper indexing
  - MongoDB: Unlimited (horizontal scaling)
```

#### NFR-3: Reliability
```yaml
Availability: 99.9% uptime (8.76 hours downtime/year)

Fault Tolerance:
  - Retry logic with exponential backoff
  - Circuit breaker for external services (AI Service)
  - Dead letter queue for failed events
  - Database failover (Multi-AZ RDS)

Data Durability:
  - PostgreSQL: Automated daily backups (7-day retention)
  - Point-in-time recovery (PITR)
  - MongoDB Atlas: Continuous backup
  - Event replay capability (NATS retention)

Disaster Recovery:
  - RTO (Recovery Time Objective): 1 hour
  - RPO (Recovery Point Objective): 5 minutes
  - Cross-region backup to S3 Glacier
```

#### NFR-4: Security
```yaml
Authentication:
  - Supabase Auth JWT tokens
  - Token expiry: 1 hour
  - Refresh token: 30 days

Authorization:
  - Role-based access control (RBAC)
  - Roles: Admin, Manager, Sales Rep, Read-only
  - Row Level Security (PostgreSQL RLS)
  - Tenant isolation enforced at DB level

Data Protection:
  - Encryption at rest (RDS, MongoDB Atlas)
  - Encryption in transit (TLS 1.3)
  - PII masking in logs
  - GDPR compliance (right to deletion)

Input Validation:
  - Schema validation (Zod)
  - SQL injection prevention (parameterized queries)
  - XSS prevention (sanitization)
  - Rate limiting (100 requests/minute per user)
```

---

## 🏛️ Arquitectura de Dominio (DDD)

### Domain Model

```typescript
// ============================================
// ENTITIES (have identity, mutable)
// ============================================

class Lead {
  // Identity
  private readonly id: LeadId;
  private readonly tenantId: TenantId;

  // Associations
  private contactId: ContactId;
  private sourceId: LeadSourceId | null;
  private ownerId: UserId | null;

  // Company Information
  private companyName: CompanyName;
  private industry: Industry | null;
  private employeeCount: EmployeeCount | null;
  private annualRevenue: Money | null;
  private website: Website | null;

  // Lead Status
  private status: LeadStatus; // new, contacted, qualified, converted, lost
  private stage: LeadStage | null; // prospect, mql, sql, opportunity

  // Scoring
  private score: Score; // 0-100
  private scoreUpdatedAt: Date | null;

  // Activity Tracking
  private lastActivityAt: Date | null;
  private nextFollowUpAt: Date | null;

  // Metadata
  private customFields: CustomFields;
  private createdAt: Date;
  private updatedAt: Date;

  // ============================================
  // BUSINESS METHODS
  // ============================================

  public qualify(criteria: QualificationCriteria): Result<LeadQualifiedEvent> {
    // Guard: Can't qualify if already qualified/converted
    if (this.status === LeadStatus.Qualified || this.status === LeadStatus.Converted) {
      return Result.fail('Lead already qualified or converted');
    }

    // Business Rule: Check BANT criteria
    if (!criteria.hasBudget || !criteria.hasAuthority ||
        !criteria.hasNeed || !criteria.hasTimeline) {
      return Result.fail('BANT criteria not met');
    }

    // Business Rule: Minimum score threshold
    if (this.score.value < criteria.minimumScore) {
      return Result.fail(`Score ${this.score.value} below threshold ${criteria.minimumScore}`);
    }

    // Update state
    this.status = LeadStatus.Qualified;
    this.stage = LeadStage.SQL; // Sales Qualified Lead
    this.updatedAt = new Date();

    // Return domain event
    return Result.ok(
      LeadQualifiedEvent.create({
        leadId: this.id,
        tenantId: this.tenantId,
        qualifiedAt: new Date(),
        score: this.score.value,
        criteria: criteria,
      })
    );
  }

  public updateScore(newScore: Score, reason: string): Result<LeadScoreChangedEvent> {
    // Guard: Score must be different
    if (this.score.equals(newScore)) {
      return Result.fail('Score unchanged');
    }

    const oldScore = this.score;
    this.score = newScore;
    this.scoreUpdatedAt = new Date();
    this.updatedAt = new Date();

    // Auto-qualify if score crossed threshold
    let autoQualified = false;
    if (oldScore.value < 70 && newScore.value >= 70) {
      // Trigger auto-qualification (business rule)
      autoQualified = true;
    }

    return Result.ok(
      LeadScoreChangedEvent.create({
        leadId: this.id,
        tenantId: this.tenantId,
        oldScore: oldScore.value,
        newScore: newScore.value,
        reason: reason,
        autoQualified: autoQualified,
      })
    );
  }

  public assignOwner(newOwnerId: UserId): Result<LeadOwnerChangedEvent> {
    const oldOwnerId = this.ownerId;
    this.ownerId = newOwnerId;
    this.updatedAt = new Date();

    return Result.ok(
      LeadOwnerChangedEvent.create({
        leadId: this.id,
        tenantId: this.tenantId,
        oldOwnerId: oldOwnerId,
        newOwnerId: newOwnerId,
      })
    );
  }

  public recordActivity(activityType: ActivityType): void {
    // Update last activity timestamp
    this.lastActivityAt = new Date();
    this.updatedAt = new Date();

    // Trigger engagement score update (async)
    // This will be handled by domain service
  }

  public convert(): Result<LeadConvertedEvent> {
    // Guard: Must be qualified first
    if (this.status !== LeadStatus.Qualified) {
      return Result.fail('Lead must be qualified before conversion');
    }

    this.status = LeadStatus.Converted;
    this.updatedAt = new Date();

    return Result.ok(
      LeadConvertedEvent.create({
        leadId: this.id,
        tenantId: this.tenantId,
        contactId: this.contactId,
        companyName: this.companyName.value,
        convertedAt: new Date(),
      })
    );
  }

  // Factory method
  public static create(props: CreateLeadProps): Result<Lead> {
    // Validation
    if (!props.tenantId) {
      return Result.fail('Tenant ID required');
    }

    if (!props.contactId) {
      return Result.fail('Contact ID required');
    }

    if (!props.companyName || props.companyName.trim().length === 0) {
      return Result.fail('Company name required');
    }

    // Create entity
    const lead = new Lead();
    lead.id = LeadId.create();
    lead.tenantId = props.tenantId;
    lead.contactId = props.contactId;
    lead.companyName = CompanyName.create(props.companyName);
    lead.industry = props.industry ? Industry.create(props.industry) : null;
    lead.status = LeadStatus.New;
    lead.score = Score.create(0); // Initial score
    lead.createdAt = new Date();
    lead.updatedAt = new Date();

    return Result.ok(lead);
  }
}


class Contact {
  // Identity
  private readonly id: ContactId;
  private readonly tenantId: TenantId;

  // Personal Information
  private firstName: FirstName | null;
  private lastName: LastName | null;
  private email: Email;
  private phone: PhoneNumber | null;

  // Professional Information
  private jobTitle: JobTitle | null;
  private linkedinUrl: Url | null;

  // Communication Preferences
  private preferredContactMethod: ContactMethod; // email, phone, whatsapp
  private timezone: Timezone;

  // Metadata
  private createdAt: Date;
  private updatedAt: Date;

  public getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName.value} ${this.lastName.value}`;
    }
    return this.email.value;
  }

  public static create(props: CreateContactProps): Result<Contact> {
    // Email is required
    if (!props.email) {
      return Result.fail('Email required');
    }

    const emailResult = Email.create(props.email);
    if (emailResult.isFailure) {
      return Result.fail(emailResult.error);
    }

    const contact = new Contact();
    contact.id = ContactId.create();
    contact.tenantId = props.tenantId;
    contact.email = emailResult.value;
    contact.firstName = props.firstName ? FirstName.create(props.firstName) : null;
    contact.lastName = props.lastName ? LastName.create(props.lastName) : null;
    contact.phone = props.phone ? PhoneNumber.create(props.phone) : null;
    contact.preferredContactMethod = props.preferredContactMethod || ContactMethod.Email;
    contact.timezone = props.timezone || Timezone.UTC;
    contact.createdAt = new Date();
    contact.updatedAt = new Date();

    return Result.ok(contact);
  }
}


// ============================================
// VALUE OBJECTS (no identity, immutable)
// ============================================

class Email {
  private constructor(public readonly value: string) {}

  public static create(email: string): Result<Email> {
    if (!email || email.trim().length === 0) {
      return Result.fail('Email cannot be empty');
    }

    // RFC 5322 compliant regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Result.fail('Invalid email format');
    }

    return Result.ok(new Email(email.toLowerCase().trim()));
  }

  public getDomain(): string {
    return this.value.split('@')[1];
  }

  public equals(other: Email): boolean {
    return this.value === other.value;
  }
}

class Score {
  private constructor(public readonly value: number) {}

  public static create(score: number): Result<Score> {
    if (score < 0 || score > 100) {
      return Result.fail('Score must be between 0 and 100');
    }

    return Result.ok(new Score(Math.round(score)));
  }

  public isHigh(): boolean {
    return this.value >= 70;
  }

  public isMedium(): boolean {
    return this.value >= 40 && this.value < 70;
  }

  public isLow(): boolean {
    return this.value < 40;
  }

  public equals(other: Score): boolean {
    return this.value === other.value;
  }
}

class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {}

  public static create(amount: number, currency: string = 'MXN'): Result<Money> {
    if (amount < 0) {
      return Result.fail('Amount cannot be negative');
    }

    if (!['MXN', 'USD', 'EUR'].includes(currency)) {
      return Result.fail('Unsupported currency');
    }

    return Result.ok(new Money(amount, currency));
  }

  public format(): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }
}


// ============================================
// ENUMS
// ============================================

enum LeadStatus {
  New = 'new',
  Contacted = 'contacted',
  Qualified = 'qualified',
  Converted = 'converted',
  Lost = 'lost',
}

enum LeadStage {
  Prospect = 'prospect',       // Initial contact
  MQL = 'mql',                 // Marketing Qualified Lead
  SQL = 'sql',                 // Sales Qualified Lead
  Opportunity = 'opportunity',  // Active opportunity
}

enum ContactMethod {
  Email = 'email',
  Phone = 'phone',
  WhatsApp = 'whatsapp',
  InPerson = 'in_person',
}

enum ActivityType {
  Call = 'call',
  Email = 'email',
  Meeting = 'meeting',
  Note = 'note',
  Task = 'task',
  WhatsApp = 'whatsapp',
}
```

### Domain Services

```typescript
// ============================================
// DOMAIN SERVICES
// (Contain business logic that doesn't fit in entities)
// ============================================

class LeadScoringService {
  /**
   * Calculate engagement score based on activities
   * This is a domain service because it operates on multiple aggregates
   */
  public calculateEngagementScore(
    lead: Lead,
    activities: Activity[]
  ): Score {
    let score = 0;

    // Recency scoring (more recent = higher score)
    const daysSinceLastActivity = this.getDaysSince(lead.lastActivityAt);
    if (daysSinceLastActivity <= 7) score += 30;
    else if (daysSinceLastActivity <= 30) score += 20;
    else if (daysSinceLastActivity <= 90) score += 10;

    // Frequency scoring
    const last30DaysActivities = activities.filter(a =>
      this.getDaysSince(a.timestamp) <= 30
    );
    score += Math.min(last30DaysActivities.length * 5, 40); // Max 40 points

    // Activity type scoring (higher quality = more points)
    const qualityActivities = activities.filter(a =>
      [ActivityType.Meeting, ActivityType.Call].includes(a.type)
    );
    score += Math.min(qualityActivities.length * 10, 30); // Max 30 points

    return Score.create(Math.min(score, 100));
  }

  private getDaysSince(date: Date | null): number {
    if (!date) return Infinity;
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}


class LeadQualificationService {
  /**
   * Evaluate if lead meets qualification criteria
   */
  public evaluateQualification(
    lead: Lead,
    activities: Activity[],
    criteria: QualificationCriteria
  ): QualificationResult {
    const checks: QualificationCheck[] = [];

    // Check 1: Minimum score
    checks.push({
      name: 'Minimum Score',
      passed: lead.score.value >= criteria.minimumScore,
      weight: 0.3,
    });

    // Check 2: Engagement level
    const engagementScore = this.calculateEngagementLevel(activities);
    checks.push({
      name: 'Engagement Level',
      passed: engagementScore >= 50,
      weight: 0.2,
    });

    // Check 3: BANT criteria
    checks.push({
      name: 'BANT Criteria',
      passed: this.checkBANT(criteria),
      weight: 0.5,
    });

    // Calculate overall qualification score
    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const passedWeight = checks
      .filter(c => c.passed)
      .reduce((sum, c) => sum + c.weight, 0);

    const qualificationScore = (passedWeight / totalWeight) * 100;

    return {
      qualified: qualificationScore >= 70,
      score: qualificationScore,
      checks: checks,
    };
  }

  private checkBANT(criteria: QualificationCriteria): boolean {
    return criteria.hasBudget &&
           criteria.hasAuthority &&
           criteria.hasNeed &&
           criteria.hasTimeline;
  }

  private calculateEngagementLevel(activities: Activity[]): number {
    // Implementation similar to LeadScoringService
    return 0;
  }
}


class DuplicateDetectionService {
  /**
   * Find potential duplicate leads using fuzzy matching
   */
  public async findDuplicates(
    lead: Lead,
    contact: Contact,
    repository: ILeadRepository
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    // Exact email match (100% confidence)
    const emailMatches = await repository.findByEmail(
      contact.email,
      lead.tenantId
    );
    for (const match of emailMatches) {
      if (match.id !== lead.id) {
        matches.push({
          leadId: match.id,
          confidence: 100,
          reason: 'Exact email match',
        });
      }
    }

    // Phone match (90% confidence)
    if (contact.phone) {
      const phoneMatches = await repository.findByPhone(
        contact.phone,
        lead.tenantId
      );
      for (const match of phoneMatches) {
        if (match.id !== lead.id && !matches.find(m => m.leadId === match.id)) {
          matches.push({
            leadId: match.id,
            confidence: 90,
            reason: 'Phone number match',
          });
        }
      }
    }

    // Fuzzy company + name match
    const fuzzyMatches = await repository.findByFuzzyMatch(
      lead.companyName.value,
      contact.getFullName(),
      lead.tenantId
    );
    for (const match of fuzzyMatches) {
      if (match.id !== lead.id && !matches.find(m => m.leadId === match.id)) {
        matches.push({
          leadId: match.id,
          confidence: match.similarity * 100,
          reason: 'Company and name similarity',
        });
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }
}
```

### Domain Events

```typescript
// ============================================
// DOMAIN EVENTS (CloudEvents standard)
// ============================================

interface DomainEvent<T = any> {
  // CloudEvents spec
  specversion: '1.0';
  type: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: 'application/json';

  // Business data
  data: T;

  // Metadata
  tenantId: string;
  userId?: string;
  correlationId?: string;
}

// Lead.Created
interface LeadCreatedEvent extends DomainEvent<{
  leadId: string;
  contactId: string;
  companyName: string;
  industry: string | null;
  sourceId: string | null;
  ownerId: string | null;
  score: number;
}> {
  type: 'Lead.Created';
  source: 'lead-service';
}

// Lead.Updated
interface LeadUpdatedEvent extends DomainEvent<{
  leadId: string;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}> {
  type: 'Lead.Updated';
  source: 'lead-service';
}

// Lead.Qualified
interface LeadQualifiedEvent extends DomainEvent<{
  leadId: string;
  score: number;
  qualifiedAt: string;
  criteria: {
    hasBudget: boolean;
    hasAuthority: boolean;
    hasNeed: boolean;
    hasTimeline: boolean;
    minimumScore: number;
  };
}> {
  type: 'Lead.Qualified';
  source: 'lead-service';
}

// Lead.Converted
interface LeadConvertedEvent extends DomainEvent<{
  leadId: string;
  contactId: string;
  companyName: string;
  convertedAt: string;
}> {
  type: 'Lead.Converted';
  source: 'lead-service';
}

// Lead.ScoreChanged
interface LeadScoreChangedEvent extends DomainEvent<{
  leadId: string;
  oldScore: number;
  newScore: number;
  reason: string;
  autoQualified: boolean;
}> {
  type: 'Lead.ScoreChanged';
  source: 'lead-service';
}
```

---

## 🗄️ Diseño de Base de Datos

### PostgreSQL Schema

```sql
-- ============================================
-- LEADS TABLE (Core transactional data)
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Associations
  contact_id UUID NOT NULL REFERENCES contacts(id),
  source_id UUID REFERENCES lead_sources(id),
  owner_id UUID REFERENCES users(id),

  -- Company Information
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  employee_count INTEGER CHECK (employee_count > 0),
  annual_revenue DECIMAL(15,2),
  revenue_currency VARCHAR(3) DEFAULT 'MXN',
  website VARCHAR(255),

  -- Lead Status
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  stage VARCHAR(100),

  -- Scoring
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_updated_at TIMESTAMP,
  score_reason TEXT,

  -- Activity Tracking
  last_activity_at TIMESTAMP,
  last_activity_type VARCHAR(50),
  next_follow_up_at TIMESTAMP,
  activities_count INTEGER DEFAULT 0,

  -- Qualification
  qualified_at TIMESTAMP,
  qualification_criteria JSONB,

  -- Conversion
  converted_at TIMESTAMP,
  converted_to_customer_id UUID,

  -- Custom Fields (flexible schema)
  custom_fields JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('new', 'contacted', 'qualified', 'converted', 'lost')
  ),
  CONSTRAINT valid_stage CHECK (
    stage IN ('prospect', 'mql', 'sql', 'opportunity') OR stage IS NULL
  ),
  CONSTRAINT valid_currency CHECK (
    revenue_currency IN ('MXN', 'USD', 'EUR')
  )
);

-- Indexes for performance
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_tenant_score ON leads(tenant_id, score DESC);
CREATE INDEX idx_leads_owner ON leads(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_leads_source ON leads(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_leads_next_followup ON leads(tenant_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL AND status NOT IN ('converted', 'lost');
CREATE INDEX idx_leads_last_activity ON leads(tenant_id, last_activity_at DESC);

-- Full-text search index
CREATE INDEX idx_leads_company_search ON leads
  USING gin(to_tsvector('english', company_name));

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id = current_setting('app.tenant_id')::UUID);


-- ============================================
-- CONTACTS TABLE
-- ============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Personal Information
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Professional Information
  job_title VARCHAR(255),
  linkedin_url VARCHAR(500),

  -- Communication Preferences
  preferred_contact_method VARCHAR(20) DEFAULT 'email',
  timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
  language VARCHAR(10) DEFAULT 'es',

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, email),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_contact_method CHECK (
    preferred_contact_method IN ('email', 'phone', 'whatsapp', 'in_person')
  )
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_email ON contacts(tenant_id, email);
CREATE INDEX idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;

-- Trigram index for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_contacts_name_trgm ON contacts
  USING gin((first_name || ' ' || last_name) gin_trgm_ops);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_contacts ON contacts
  USING (tenant_id = current_setting('app.tenant_id')::UUID);


-- ============================================
-- LEAD SOURCES TABLE
-- ============================================
CREATE TABLE lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'website', 'referral', 'campaign', 'event', 'direct'

  -- Attribution
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_lead_sources_tenant ON lead_sources(tenant_id);
CREATE INDEX idx_lead_sources_active ON lead_sources(tenant_id, is_active);


-- ============================================
-- LEAD SCORE HISTORY (Audit Trail)
-- ============================================
CREATE TABLE lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  old_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  reason TEXT,

  -- ML Model Info (if applicable)
  model_version VARCHAR(50),
  model_confidence DECIMAL(5,4), -- 0.0000 to 1.0000

  scored_at TIMESTAMP NOT NULL DEFAULT NOW(),
  scored_by VARCHAR(100) -- 'ai-service', 'manual', 'auto-rule'
);

CREATE INDEX idx_score_history_lead ON lead_score_history(lead_id, scored_at DESC);
CREATE INDEX idx_score_history_tenant_date ON lead_score_history(tenant_id, scored_at DESC);


-- ============================================
-- LEAD STAGE HISTORY (Pipeline Tracking)
-- ============================================
CREATE TABLE lead_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  old_stage VARCHAR(100),
  new_stage VARCHAR(100),

  reason TEXT,

  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_stage_history_lead ON lead_stage_history(lead_id, changed_at DESC);


-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Track score changes
CREATE OR REPLACE FUNCTION track_score_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.score IS DISTINCT FROM NEW.score THEN
    INSERT INTO lead_score_history (
      tenant_id,
      lead_id,
      old_score,
      new_score,
      reason,
      scored_by
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      OLD.score,
      NEW.score,
      NEW.score_reason,
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_score_change
AFTER UPDATE ON leads
FOR EACH ROW
WHEN (OLD.score IS DISTINCT FROM NEW.score)
EXECUTE FUNCTION track_score_change();


-- Track stage changes
CREATE OR REPLACE FUNCTION track_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR
     OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO lead_stage_history (
      tenant_id,
      lead_id,
      old_status,
      new_status,
      old_stage,
      new_stage,
      changed_by
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      OLD.status,
      NEW.status,
      OLD.stage,
      NEW.stage,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_stage_change
AFTER UPDATE ON leads
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR
      OLD.stage IS DISTINCT FROM NEW.stage)
EXECUTE FUNCTION track_stage_change();
```

### MongoDB Collections

```typescript
// ============================================
// activity_logs collection
// High-volume writes, time-series data
// ============================================

interface ActivityLog {
  _id: ObjectId;

  // Tenant & Lead reference
  tenant_id: string; // UUID from PostgreSQL
  lead_id: string; // UUID from PostgreSQL
  contact_id?: string;
  user_id: string; // Who performed the activity

  // Activity details
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'whatsapp' | 'form_submission' | 'page_view';
  timestamp: Date;

  // Type-specific data
  subject?: string;
  description?: string;
  duration_seconds?: number; // For calls, meetings
  outcome?: string; // 'positive', 'neutral', 'negative', 'no_answer'

  // Call-specific
  call_direction?: 'inbound' | 'outbound';
  call_recording_url?: string;

  // Email-specific
  email_direction?: 'sent' | 'received';
  email_subject?: string;
  email_thread_id?: string;

  // Meeting-specific
  meeting_location?: string;
  meeting_attendees?: string[];

  // Task-specific
  task_due_date?: Date;
  task_completed?: boolean;

  // WhatsApp-specific
  whatsapp_conversation_id?: string;
  whatsapp_message_id?: string;

  // Metadata
  metadata: Record<string, any>;
  source: string; // 'manual', 'api', 'automation', 'integration'

  // TTL - auto-delete after 90 days
  expires_at: Date;
}

// Indexes
db.activity_logs.createIndexes([
  // Query by lead (most common)
  { key: { tenant_id: 1, lead_id: 1, timestamp: -1 } },

  // Query by user (for user activity feed)
  { key: { tenant_id: 1, user_id: 1, timestamp: -1 } },

  // Query by type (for analytics)
  { key: { tenant_id: 1, activity_type: 1, timestamp: -1 } },

  // TTL index (auto-cleanup)
  { key: { expires_at: 1 }, expireAfterSeconds: 0 },

  // Search by subject/description (text index)
  { key: { subject: 'text', description: 'text' } },
]);


// ============================================
// lead_engagement_metrics collection
// Aggregated engagement data (updated periodically)
// ============================================

interface LeadEngagementMetrics {
  _id: ObjectId;
  tenant_id: string;
  lead_id: string;

  // Aggregated counts (last 90 days)
  total_activities: number;
  calls_count: number;
  emails_count: number;
  meetings_count: number;
  whatsapp_count: number;

  // Engagement score components
  recency_score: number; // 0-30 (days since last activity)
  frequency_score: number; // 0-40 (number of activities)
  quality_score: number; // 0-30 (type of activities)

  // Total engagement score
  engagement_score: number; // 0-100

  // Last updated
  last_calculated_at: Date;

  // TTL - recalculate if older than 24 hours
  expires_at: Date;
}

db.lead_engagement_metrics.createIndexes([
  { key: { tenant_id: 1, lead_id: 1 }, unique: true },
  { key: { tenant_id: 1, engagement_score: -1 } },
  { key: { expires_at: 1 }, expireAfterSeconds: 0 },
]);
```

---

## 🌐 API Design

### RESTful Endpoints

```yaml
Base URL: /api/v1/leads

# ============================================
# LEADS CRUD
# ============================================

POST /api/v1/leads
Description: Create a new lead
Authentication: Required (JWT)
Authorization: create:leads
Request Body:
  {
    "contact": {
      "firstName": "Juan",
      "lastName": "Pérez",
      "email": "juan.perez@empresa.com",
      "phone": "+52 55 1234 5678",
      "jobTitle": "Director de TI"
    },
    "company": {
      "name": "Empresa SA de CV",
      "industry": "Technology",
      "employeeCount": 50,
      "annualRevenue": 5000000,
      "website": "https://empresa.com"
    },
    "sourceId": "uuid",
    "ownerId": "uuid", // Optional, auto-assign if not provided
    "customFields": {
      "budget": "50000-100000",
      "timeline": "Q1 2025"
    }
  }

Response: 201 Created
  {
    "id": "uuid",
    "tenantId": "uuid",
    "contact": { ... },
    "company": { ... },
    "status": "new",
    "stage": "prospect",
    "score": 0,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }

Errors:
  - 400: Validation error (invalid email, missing required fields)
  - 409: Duplicate detected (email already exists)
  - 429: Rate limit exceeded


GET /api/v1/leads
Description: List leads with pagination and filtering
Authentication: Required
Authorization: read:leads
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 50, max: 100)
  - status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  - stage: 'prospect' | 'mql' | 'sql' | 'opportunity'
  - ownerId: uuid
  - sourceId: uuid
  - minScore: number (0-100)
  - maxScore: number (0-100)
  - sortBy: 'createdAt' | 'updatedAt' | 'score' | 'lastActivityAt'
  - sortOrder: 'asc' | 'desc'
  - search: string (full-text search on company name, contact name)

Response: 200 OK
  {
    "data": [
      { "id": "uuid", ... },
      { "id": "uuid", ... }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }


GET /api/v1/leads/:id
Description: Get lead by ID
Authentication: Required
Authorization: read:leads
Response: 200 OK
  {
    "id": "uuid",
    "tenantId": "uuid",
    "contact": {
      "id": "uuid",
      "firstName": "Juan",
      "lastName": "Pérez",
      "email": "juan.perez@empresa.com",
      "phone": "+52 55 1234 5678",
      "jobTitle": "Director de TI"
    },
    "company": {
      "name": "Empresa SA de CV",
      "industry": "Technology",
      "employeeCount": 50,
      "annualRevenue": 5000000,
      "website": "https://empresa.com"
    },
    "source": {
      "id": "uuid",
      "name": "Website Form",
      "type": "website"
    },
    "owner": {
      "id": "uuid",
      "name": "María González",
      "email": "maria@zuclubit.com"
    },
    "status": "contacted",
    "stage": "mql",
    "score": 65,
    "scoreUpdatedAt": "2025-01-15T14:20:00Z",
    "lastActivityAt": "2025-01-15T09:00:00Z",
    "nextFollowUpAt": "2025-01-16T10:00:00Z",
    "activitiesCount": 8,
    "customFields": {
      "budget": "50000-100000",
      "timeline": "Q1 2025"
    },
    "createdAt": "2025-01-10T10:30:00Z",
    "updatedAt": "2025-01-15T14:20:00Z"
  }

Errors:
  - 404: Lead not found


PUT /api/v1/leads/:id
Description: Update lead
Authentication: Required
Authorization: update:leads
Request Body: (partial update)
  {
    "company": {
      "employeeCount": 75
    },
    "ownerId": "new-owner-uuid",
    "customFields": {
      "budget": "100000-200000"
    }
  }

Response: 200 OK
  { ... updated lead ... }

Errors:
  - 404: Lead not found
  - 400: Validation error
  - 409: Conflict (e.g., trying to update converted lead)


DELETE /api/v1/leads/:id
Description: Delete lead (soft delete)
Authentication: Required
Authorization: delete:leads
Response: 204 No Content

Errors:
  - 404: Lead not found
  - 403: Cannot delete converted lead


# ============================================
# LEAD ACTIONS
# ============================================

POST /api/v1/leads/:id/qualify
Description: Qualify a lead
Authentication: Required
Authorization: qualify:leads
Request Body:
  {
    "criteria": {
      "hasBudget": true,
      "hasAuthority": true,
      "hasNeed": true,
      "hasTimeline": true
    },
    "notes": "Cliente confirmó presupuesto de $100K para Q1"
  }

Response: 200 OK
  {
    "id": "uuid",
    "status": "qualified",
    "stage": "sql",
    "qualifiedAt": "2025-01-15T15:00:00Z"
  }

Errors:
  - 400: Qualification criteria not met
  - 409: Lead already qualified


POST /api/v1/leads/:id/convert
Description: Convert lead to customer
Authentication: Required
Authorization: convert:leads
Request Body:
  {
    "createOpportunity": true,
    "opportunityValue": 100000
  }

Response: 200 OK
  {
    "id": "uuid",
    "status": "converted",
    "convertedAt": "2025-01-15T16:00:00Z",
    "customerId": "uuid",
    "opportunityId": "uuid"
  }


POST /api/v1/leads/:id/assign
Description: Assign lead to user
Authentication: Required
Authorization: assign:leads
Request Body:
  {
    "ownerId": "uuid",
    "reason": "Territory assignment"
  }

Response: 200 OK
  {
    "id": "uuid",
    "ownerId": "uuid",
    "owner": {
      "id": "uuid",
      "name": "María González",
      "email": "maria@zuclubit.com"
    }
  }


POST /api/v1/leads/:id/score
Description: Manually update lead score
Authentication: Required
Authorization: score:leads
Request Body:
  {
    "score": 85,
    "reason": "Increased company size, signed enterprise contract elsewhere"
  }

Response: 200 OK
  {
    "id": "uuid",
    "score": 85,
    "scoreUpdatedAt": "2025-01-15T17:00:00Z"
  }


# ============================================
# LEAD ACTIVITIES
# ============================================

POST /api/v1/leads/:id/activities
Description: Log activity for lead
Authentication: Required
Authorization: create:activities
Request Body:
  {
    "type": "call",
    "subject": "Follow-up call",
    "description": "Discussed pricing and timeline",
    "duration": 1800, // seconds (30 minutes)
    "outcome": "positive",
    "timestamp": "2025-01-15T14:00:00Z"
  }

Response: 201 Created
  {
    "id": "mongodb-objectid",
    "leadId": "uuid",
    "type": "call",
    "subject": "Follow-up call",
    "timestamp": "2025-01-15T14:00:00Z",
    "createdAt": "2025-01-15T14:05:00Z"
  }


GET /api/v1/leads/:id/activities
Description: Get lead activity timeline
Authentication: Required
Authorization: read:activities
Query Parameters:
  - type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'whatsapp'
  - startDate: ISO date
  - endDate: ISO date
  - limit: number (default: 50)
  - offset: number (default: 0)

Response: 200 OK
  {
    "data": [
      {
        "id": "mongodb-objectid",
        "type": "call",
        "subject": "Follow-up call",
        "description": "Discussed pricing",
        "duration": 1800,
        "outcome": "positive",
        "timestamp": "2025-01-15T14:00:00Z",
        "user": {
          "id": "uuid",
          "name": "María González"
        }
      },
      ...
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 120
    }
  }


# ============================================
# LEAD ANALYTICS
# ============================================

GET /api/v1/leads/stats
Description: Get lead statistics
Authentication: Required
Authorization: read:analytics
Query Parameters:
  - startDate: ISO date
  - endDate: ISO date
  - groupBy: 'status' | 'stage' | 'source' | 'owner'

Response: 200 OK
  {
    "totalLeads": 1250,
    "byStatus": {
      "new": 450,
      "contacted": 320,
      "qualified": 180,
      "converted": 250,
      "lost": 50
    },
    "conversionRate": 20.0, // percentage
    "averageScore": 58.5,
    "averageTimeToQualify": 14.2, // days
    "averageTimeToConvert": 32.7 // days
  }


GET /api/v1/leads/:id/duplicates
Description: Find potential duplicate leads
Authentication: Required
Authorization: read:leads
Response: 200 OK
  {
    "duplicates": [
      {
        "leadId": "uuid",
        "companyName": "Empresa SA",
        "contactEmail": "juan.perez@empresa.com",
        "confidence": 95,
        "reason": "Exact email match",
        "createdAt": "2025-01-10T10:30:00Z"
      }
    ]
  }
```

### API Error Handling

```typescript
// Standard error response format
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    correlationId: string;
  };
}

// Error codes
enum ErrorCode {
  // Validation (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_LEAD = 'DUPLICATE_LEAD',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',

  // Authorization (4xx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EVENT_PUBLISH_FAILED = 'EVENT_PUBLISH_FAILED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

// Example error responses

// 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "fields": {
        "email": "Invalid email format",
        "companyName": "Company name is required"
      }
    },
    "correlationId": "abc123-def456"
  }
}

// 404 Not Found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Lead with id 'xyz' not found",
    "correlationId": "abc123-def456"
  }
}

// 409 Conflict
{
  "error": {
    "code": "DUPLICATE_LEAD",
    "message": "Lead with email 'juan@empresa.com' already exists",
    "details": {
      "existingLeadId": "uuid",
      "confidence": 100,
      "reason": "Exact email match"
    },
    "correlationId": "abc123-def456"
  }
}

// 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again in 60 seconds",
    "details": {
      "limit": 100,
      "window": "1m",
      "retryAfter": 60
    },
    "correlationId": "abc123-def456"
  }
}

// 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "correlationId": "abc123-def456"
  }
}
```

---

## 🔄 Event-Driven Flows

### Flow 1: Lead Creation with AI Scoring

```
[User/API]
    │
    │ POST /api/v1/leads
    ▼
[Lead Service - API Handler]
    │
    ├─► Validate request (schema validation)
    ├─► Check duplicates (Redis cache, then PostgreSQL)
    ├─► Create Contact entity
    ├─► Create Lead entity
    ├─► Save to PostgreSQL (transaction)
    │
    ├─► Publish Lead.Created event (NATS)
    │   {
    │     type: "Lead.Created",
    │     data: {
    │       leadId, contactId, companyName, industry, score
    │     }
    │   }
    │
    └─► Return 201 Created response

[NATS JetStream]
    │
    │ Lead.Created event
    ▼
[AI Automation Service - Consumer]
    │
    ├─► Extract features (company size, industry, source)
    ├─► Call SageMaker endpoint
    ├─► Get score prediction (0-100)
    │
    └─► Publish AI.LeadScored event
        {
          type: "AI.LeadScored",
          data: {
            leadId, newScore: 75, reason: "ML model prediction"
          }
        }

[NATS JetStream]
    │
    │ AI.LeadScored event
    ▼
[Lead Service - Event Consumer]
    │
    ├─► Update lead score in PostgreSQL
    ├─► Check if score > threshold (70)
    │   └─► If yes, trigger auto-qualification
    │
    └─► Publish Lead.ScoreChanged event
        {
          type: "Lead.ScoreChanged",
          data: {
            leadId, oldScore: 0, newScore: 75, autoQualified: true
          }
        }

[NATS JetStream]
    │
    │ Lead.ScoreChanged event
    ▼
[Notification Service - Consumer]
    │
    └─► Send notification to owner
        "High-value lead: Empresa SA (score: 75)"
```

### Flow 2: Lead Qualification & Conversion

```
[Sales Rep]
    │
    │ POST /api/v1/leads/:id/qualify
    ▼
[Lead Service - API Handler]
    │
    ├─► Load Lead aggregate
    ├─► Call lead.qualify(criteria)
    │   ├─► Check BANT criteria
    │   ├─► Check score >= threshold
    │   └─► Update status to 'qualified'
    │
    ├─► Save to PostgreSQL
    │
    ├─► Publish Lead.Qualified event
    │   {
    │     type: "Lead.Qualified",
    │     data: {
    │       leadId, score: 85, qualifiedAt, criteria
    │     }
    │   }
    │
    └─► Return 200 OK

[NATS JetStream]
    │
    │ Lead.Qualified event
    ▼
[Proposal Service - Consumer]
    │
    └─► Auto-create proposal draft
        (if configured for this tenant)

[Sales Rep]
    │
    │ POST /api/v1/leads/:id/convert
    ▼
[Lead Service - API Handler]
    │
    ├─► Load Lead aggregate
    ├─► Call lead.convert()
    │   ├─► Check status == 'qualified'
    │   └─► Update status to 'converted'
    │
    ├─► Save to PostgreSQL
    │
    ├─► Publish Lead.Converted event
    │   {
    │     type: "Lead.Converted",
    │     data: {
    │       leadId, contactId, companyName, convertedAt
    │     }
    │   }
    │
    └─► Return 200 OK

[NATS JetStream]
    │
    │ Lead.Converted event
    ▼
[Customer Service - Consumer]
    │
    ├─► Create Customer entity
    ├─► Link contact to customer
    ├─► Copy custom fields
    │
    └─► Publish Customer.Created event
        {
          type: "Customer.Created",
          data: {
            customerId, leadId, companyName
          }
        }
```

### Flow 3: Activity Logging & Engagement Scoring

```
[Sales Rep / Integration]
    │
    │ POST /api/v1/leads/:id/activities
    ▼
[Lead Service - API Handler]
    │
    ├─► Validate activity data
    │
    ├─► Save to MongoDB (activity_logs collection)
    │   {
    │     tenant_id, lead_id, type: "call",
    │     subject, duration: 1800, outcome: "positive",
    │     timestamp, expires_at
    │   }
    │
    ├─► Update lead.last_activity_at (PostgreSQL)
    ├─► Increment lead.activities_count
    │
    ├─► Publish Activity.Logged event
    │   {
    │     type: "Activity.Logged",
    │     data: {
    │       leadId, activityType: "call", timestamp
    │     }
    │   }
    │
    └─► Return 201 Created

[NATS JetStream]
    │
    │ Activity.Logged event
    ▼
[Lead Service - Engagement Calculator]
    │
    ├─► Load activities from MongoDB (last 90 days)
    ├─► Calculate engagement score:
    │   ├─► Recency: 30 points (activity within 7 days)
    │   ├─► Frequency: 40 points (8 activities)
    │   └─► Quality: 30 points (2 calls, 3 meetings)
    │   Total: 75/100
    │
    ├─► Update engagement_score in MongoDB cache
    │
    └─► Trigger re-scoring (AI Service)
        Engagement is a feature for ML model
```

### Flow 4: Duplicate Detection

```
[User]
    │
    │ POST /api/v1/leads (with email)
    ▼
[Lead Service - API Handler]
    │
    ├─► Extract deduplication keys:
    │   ├─► Email: juan@empresa.com
    │   ├─► Phone: +52 55 1234 5678
    │   └─► Company + Name: "Empresa SA Juan Perez"
    │
    ├─► Check Redis cache (key: "dup:juan@empresa.com")
    │   └─► Cache miss
    │
    ├─► Query PostgreSQL for duplicates:
    │   ├─► Exact email match (100% confidence)
    │   ├─► Phone match (90% confidence)
    │   └─► Fuzzy company+name match (using pg_trgm)
    │
    ├─► Found duplicate with 100% confidence
    │   (exact email match)
    │
    ├─► Cache result in Redis (TTL: 1 hour)
    │
    └─► Return 409 Conflict
        {
          "error": {
            "code": "DUPLICATE_LEAD",
            "message": "Lead with email already exists",
            "details": {
              "existingLeadId": "uuid",
              "confidence": 100,
              "reason": "Exact email match",
              "createdAt": "2025-01-10T10:30:00Z"
            }
          }
        }

[User can then]:
    Option 1: Force create new lead (override)
    Option 2: Merge with existing lead
    Option 3: Update existing lead
```

---

## 🛠️ Patrones de Implementación

### Pattern 1: Repository Pattern

```typescript
// ============================================
// Repository Interface (Port)
// ============================================

export interface ILeadRepository {
  // Basic CRUD
  save(lead: Lead): Promise<Result<void>>;
  findById(id: LeadId, tenantId: TenantId): Promise<Result<Lead>>;
  findByEmail(email: Email, tenantId: TenantId): Promise<Result<Lead[]>>;
  update(lead: Lead): Promise<Result<void>>;
  delete(id: LeadId, tenantId: TenantId): Promise<Result<void>>;

  // Queries
  findAll(params: FindAllParams, tenantId: TenantId): Promise<PaginatedResult<Lead>>;
  findByStatus(status: LeadStatus, tenantId: TenantId): Promise<Result<Lead[]>>;
  findByOwner(ownerId: UserId, tenantId: TenantId): Promise<Result<Lead[]>>;

  // Complex queries
  findByFuzzyMatch(
    companyName: string,
    contactName: string,
    tenantId: TenantId
  ): Promise<Result<FuzzyMatch[]>>;

  // Aggregations
  countByStatus(tenantId: TenantId): Promise<Result<StatusCount>>;
  getConversionRate(startDate: Date, endDate: Date, tenantId: TenantId): Promise<Result<number>>;
}

// ============================================
// Repository Implementation (Adapter)
// ============================================

export class PostgresLeadRepository implements ILeadRepository {
  constructor(private pool: Pool) {}

  async save(lead: Lead): Promise<Result<void>> {
    try {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        // Save contact first
        const contactQuery = `
          INSERT INTO contacts (id, tenant_id, first_name, last_name, email, phone, job_title)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (tenant_id, email) DO UPDATE
          SET first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              phone = EXCLUDED.phone,
              updated_at = NOW()
          RETURNING id
        `;

        await client.query(contactQuery, [
          lead.contactId.value,
          lead.tenantId.value,
          lead.contact.firstName?.value,
          lead.contact.lastName?.value,
          lead.contact.email.value,
          lead.contact.phone?.value,
          lead.contact.jobTitle?.value,
        ]);

        // Save lead
        const leadQuery = `
          INSERT INTO leads (
            id, tenant_id, contact_id, source_id, owner_id,
            company_name, industry, employee_count, annual_revenue, website,
            status, stage, score, custom_fields,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
        `;

        await client.query(leadQuery, [
          lead.id.value,
          lead.tenantId.value,
          lead.contactId.value,
          lead.sourceId?.value,
          lead.ownerId?.value,
          lead.companyName.value,
          lead.industry?.value,
          lead.employeeCount?.value,
          lead.annualRevenue?.amount,
          lead.website?.value,
          lead.status,
          lead.stage,
          lead.score.value,
          JSON.stringify(lead.customFields),
          lead.createdAt,
          lead.updatedAt,
        ]);

        await client.query('COMMIT');

        return Result.ok();
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      return Result.fail('Failed to save lead');
    }
  }

  async findById(id: LeadId, tenantId: TenantId): Promise<Result<Lead>> {
    try {
      const query = `
        SELECT
          l.*,
          c.first_name, c.last_name, c.email, c.phone, c.job_title,
          s.name as source_name, s.type as source_type,
          u.name as owner_name, u.email as owner_email
        FROM leads l
        JOIN contacts c ON l.contact_id = c.id
        LEFT JOIN lead_sources s ON l.source_id = s.id
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.id = $1 AND l.tenant_id = $2
      `;

      const result = await this.pool.query(query, [id.value, tenantId.value]);

      if (result.rows.length === 0) {
        return Result.fail('Lead not found');
      }

      const row = result.rows[0];
      const lead = this.mapRowToLead(row);

      return Result.ok(lead);
    } catch (error) {
      console.error('Error finding lead:', error);
      return Result.fail('Failed to find lead');
    }
  }

  async findByFuzzyMatch(
    companyName: string,
    contactName: string,
    tenantId: TenantId
  ): Promise<Result<FuzzyMatch[]>> {
    try {
      // Use PostgreSQL trigram similarity
      const query = `
        SELECT
          l.id,
          l.company_name,
          c.first_name || ' ' || c.last_name as contact_name,
          SIMILARITY(l.company_name, $1) as company_similarity,
          SIMILARITY(c.first_name || ' ' || c.last_name, $2) as name_similarity,
          (
            SIMILARITY(l.company_name, $1) * 0.6 +
            SIMILARITY(c.first_name || ' ' || c.last_name, $2) * 0.4
          ) as overall_similarity
        FROM leads l
        JOIN contacts c ON l.contact_id = c.id
        WHERE l.tenant_id = $3
          AND (
            SIMILARITY(l.company_name, $1) > 0.3
            OR SIMILARITY(c.first_name || ' ' || c.last_name, $2) > 0.3
          )
        ORDER BY overall_similarity DESC
        LIMIT 10
      `;

      const result = await this.pool.query(query, [
        companyName,
        contactName,
        tenantId.value,
      ]);

      const matches = result.rows.map(row => ({
        leadId: LeadId.create(row.id),
        similarity: row.overall_similarity,
        companyName: row.company_name,
        contactName: row.contact_name,
      }));

      return Result.ok(matches);
    } catch (error) {
      console.error('Error finding fuzzy matches:', error);
      return Result.fail('Failed to find matches');
    }
  }

  private mapRowToLead(row: any): Lead {
    // Map database row to Lead entity
    // Implementation details...
    return lead;
  }
}
```

### Pattern 2: Outbox Pattern (Reliable Event Publishing)

```typescript
// ============================================
// Outbox Pattern for Reliable Event Publishing
// Problem: Ensure events are published even if NATS is down
// Solution: Store events in PostgreSQL, then publish asynchronously
// ============================================

// Outbox table
CREATE TABLE event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Event data (CloudEvents format)
  event_type VARCHAR(255) NOT NULL,
  event_id UUID NOT NULL,
  event_source VARCHAR(255) NOT NULL,
  event_data JSONB NOT NULL,
  event_time TIMESTAMP NOT NULL,

  -- Processing status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'published', 'failed'
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  error_message TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,

  -- Index for processing
  INDEX idx_outbox_pending (status, created_at) WHERE status = 'pending'
);

// ============================================
// Application Layer: Command Handler with Outbox
// ============================================

export class CreateLeadHandler {
  constructor(
    private leadRepo: ILeadRepository,
    private outboxRepo: IEventOutboxRepository,
    private eventPublisher: IEventPublisher
  ) {}

  async execute(command: CreateLeadCommand): Promise<Result<LeadId>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Create Lead entity (domain logic)
      const leadResult = Lead.create({
        tenantId: command.tenantId,
        contactId: command.contactId,
        companyName: command.companyName,
        industry: command.industry,
      });

      if (leadResult.isFailure) {
        return Result.fail(leadResult.error);
      }

      const lead = leadResult.value;

      // 2. Save Lead to database (within transaction)
      await this.leadRepo.save(lead, client);

      // 3. Create domain event
      const event: LeadCreatedEvent = {
        specversion: '1.0',
        type: 'Lead.Created',
        source: 'lead-service',
        id: uuidv4(),
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        data: {
          leadId: lead.id.value,
          contactId: lead.contactId.value,
          companyName: lead.companyName.value,
          industry: lead.industry?.value,
          score: lead.score.value,
        },
        tenantId: lead.tenantId.value,
        userId: command.userId,
        correlationId: command.correlationId,
      };

      // 4. Save event to outbox (within same transaction)
      await this.outboxRepo.save(event, client);

      // 5. Commit transaction
      await client.query('COMMIT');

      // 6. Try to publish immediately (best effort)
      // If this fails, background job will retry
      try {
        await this.eventPublisher.publish(event);
        await this.outboxRepo.markAsPublished(event.id);
      } catch (error) {
        // Log error, but don't fail the request
        // Background job will retry
        console.error('Failed to publish event immediately:', error);
      }

      return Result.ok(lead.id);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating lead:', error);
      return Result.fail('Failed to create lead');
    } finally {
      client.release();
    }
  }
}

// ============================================
// Background Job: Outbox Processor
// Runs every 10 seconds to process pending events
// ============================================

export class OutboxProcessor {
  constructor(
    private outboxRepo: IEventOutboxRepository,
    private eventPublisher: IEventPublisher
  ) {}

  async process(): Promise<void> {
    // Get pending events (LIMIT 100 for batch processing)
    const pendingEvents = await this.outboxRepo.findPending(100);

    for (const event of pendingEvents) {
      try {
        // Publish to NATS
        await this.eventPublisher.publish(event);

        // Mark as published
        await this.outboxRepo.markAsPublished(event.id);

        console.log(`Event published: ${event.type} (${event.id})`);
      } catch (error) {
        // Increment attempt count
        await this.outboxRepo.incrementAttempts(event.id, error.message);

        // If too many attempts, mark as failed
        if (event.attempts >= 5) {
          await this.outboxRepo.markAsFailed(event.id);
          console.error(`Event failed after 5 attempts: ${event.id}`);

          // Send alert to ops team
          // await this.alertService.sendAlert(...);
        }
      }
    }
  }
}

// Schedule outbox processor
setInterval(() => {
  outboxProcessor.process();
}, 10000); // Every 10 seconds
```

### Pattern 3: CQRS (Command Query Responsibility Segregation)

```typescript
// ============================================
// CQRS Pattern: Separate Read and Write Models
// Write: Optimize for business logic and consistency
// Read: Optimize for query performance (denormalized views)
// ============================================

// ============================================
// WRITE MODEL (Commands)
// ============================================

// Command: Represents user intent
export class CreateLeadCommand {
  constructor(
    public readonly tenantId: TenantId,
    public readonly contactEmail: Email,
    public readonly companyName: CompanyName,
    public readonly industry: Industry | null,
    public readonly sourceId: LeadSourceId | null,
    public readonly userId: UserId,
    public readonly correlationId: string
  ) {}
}

// Command Handler: Executes business logic
export class CreateLeadCommandHandler {
  constructor(
    private leadRepo: ILeadRepository,
    private eventPublisher: IEventPublisher
  ) {}

  async execute(command: CreateLeadCommand): Promise<Result<LeadId>> {
    // 1. Check duplicates
    const duplicates = await this.leadRepo.findByEmail(
      command.contactEmail,
      command.tenantId
    );

    if (duplicates.isSuccess && duplicates.value.length > 0) {
      return Result.fail('Duplicate lead found');
    }

    // 2. Create Lead entity (domain logic)
    const leadResult = Lead.create({
      tenantId: command.tenantId,
      contactEmail: command.contactEmail,
      companyName: command.companyName,
      industry: command.industry,
    });

    if (leadResult.isFailure) {
      return Result.fail(leadResult.error);
    }

    const lead = leadResult.value;

    // 3. Save to write database (PostgreSQL)
    await this.leadRepo.save(lead);

    // 4. Publish event
    const event = LeadCreatedEvent.create(lead);
    await this.eventPublisher.publish(event);

    return Result.ok(lead.id);
  }
}

// ============================================
// READ MODEL (Queries)
// ============================================

// Query: Represents what user wants to see
export class GetLeadByIdQuery {
  constructor(
    public readonly leadId: LeadId,
    public readonly tenantId: TenantId
  ) {}
}

// Query Handler: Retrieves denormalized data
export class GetLeadByIdQueryHandler {
  constructor(
    private readRepo: ILeadReadRepository // Different from write repo!
  ) {}

  async execute(query: GetLeadByIdQuery): Promise<Result<LeadDTO>> {
    // Read from optimized read model (could be cache, denormalized view)
    const lead = await this.readRepo.findById(
      query.leadId,
      query.tenantId
    );

    if (lead.isFailure) {
      return Result.fail('Lead not found');
    }

    // Return DTO (Data Transfer Object) - optimized for frontend
    return Result.ok(LeadDTO.fromEntity(lead.value));
  }
}

// ============================================
// Read Repository (Optimized for Queries)
// ============================================

export class PostgresLeadReadRepository implements ILeadReadRepository {
  constructor(
    private pool: Pool,
    private cache: RedisCache
  ) {}

  async findById(id: LeadId, tenantId: TenantId): Promise<Result<LeadDTO>> {
    // 1. Try cache first
    const cacheKey = `lead:${tenantId.value}:${id.value}`;
    const cached = await this.cache.get<LeadDTO>(cacheKey);

    if (cached) {
      console.log('Cache hit:', cacheKey);
      return Result.ok(cached);
    }

    // 2. Query from database (with JOINs for denormalization)
    const query = `
      SELECT
        l.*,
        c.first_name, c.last_name, c.email, c.phone, c.job_title,
        s.name as source_name, s.type as source_type,
        u.name as owner_name, u.email as owner_email,
        (
          SELECT COUNT(*) FROM activity_logs
          WHERE lead_id = l.id AND timestamp > NOW() - INTERVAL '30 days'
        ) as recent_activities_count
      FROM leads l
      JOIN contacts c ON l.contact_id = c.id
      LEFT JOIN lead_sources s ON l.source_id = s.id
      LEFT JOIN users u ON l.owner_id = u.id
      WHERE l.id = $1 AND l.tenant_id = $2
    `;

    const result = await this.pool.query(query, [id.value, tenantId.value]);

    if (result.rows.length === 0) {
      return Result.fail('Lead not found');
    }

    const leadDTO = this.mapRowToDTO(result.rows[0]);

    // 3. Cache for 5 minutes
    await this.cache.set(cacheKey, leadDTO, 300);

    return Result.ok(leadDTO);
  }

  // Complex query optimized for listing
  async findAll(params: FindAllParams, tenantId: TenantId): Promise<PaginatedResult<LeadDTO>> {
    // Use materialized view for better performance
    const query = `
      SELECT * FROM lead_list_view
      WHERE tenant_id = $1
        AND ($2::varchar IS NULL OR status = $2)
        AND ($3::integer IS NULL OR score >= $3)
      ORDER BY ${params.sortBy} ${params.sortOrder}
      LIMIT $4 OFFSET $5
    `;

    const result = await this.pool.query(query, [
      tenantId.value,
      params.status,
      params.minScore,
      params.limit,
      params.offset,
    ]);

    const leads = result.rows.map(row => this.mapRowToDTO(row));

    const totalQuery = `SELECT COUNT(*) FROM lead_list_view WHERE tenant_id = $1`;
    const totalResult = await this.pool.query(totalQuery, [tenantId.value]);
    const total = parseInt(totalResult.rows[0].count);

    return {
      data: leads,
      pagination: {
        page: Math.floor(params.offset / params.limit) + 1,
        limit: params.limit,
        total: total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }
}

// ============================================
// Materialized View for Read Performance
// ============================================

CREATE MATERIALIZED VIEW lead_list_view AS
SELECT
  l.id,
  l.tenant_id,
  l.company_name,
  l.status,
  l.stage,
  l.score,
  l.last_activity_at,
  l.created_at,
  c.email,
  c.first_name || ' ' || c.last_name as contact_name,
  u.name as owner_name,
  s.name as source_name,
  COUNT(DISTINCT al.id) FILTER (WHERE al.timestamp > NOW() - INTERVAL '30 days') as recent_activities
FROM leads l
JOIN contacts c ON l.contact_id = c.id
LEFT JOIN users u ON l.owner_id = u.id
LEFT JOIN lead_sources s ON l.source_id = s.id
LEFT JOIN activity_logs al ON al.lead_id = l.id
GROUP BY l.id, c.id, u.id, s.id;

CREATE INDEX idx_lead_list_view_tenant ON lead_list_view(tenant_id);
CREATE INDEX idx_lead_list_view_status ON lead_list_view(tenant_id, status);

-- Refresh materialized view every 5 minutes
CREATE OR REPLACE FUNCTION refresh_lead_list_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY lead_list_view;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule('refresh-lead-list-view', '*/5 * * * *',
  'SELECT refresh_lead_list_view()');
```

### Pattern 4: Circuit Breaker (External Service Resilience)

```typescript
// ============================================
// Circuit Breaker Pattern for AI Service calls
// Problem: AI Service may be slow or down
// Solution: Fail fast when service is unhealthy
// ============================================

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Service is down, reject requests immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly successThreshold: number = 2,
    private readonly timeout: number = 60000, // 60 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<Result<T>> {
    if (this.state === CircuitState.OPEN) {
      // Check if timeout elapsed
      if (Date.now() - this.lastFailureTime! > this.timeout) {
        console.log('Circuit breaker: OPEN → HALF_OPEN (timeout elapsed)');
        this.state = CircuitState.HALF_OPEN;
      } else {
        // Fail fast
        return Result.fail('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      this.onSuccess();

      return Result.ok(result);
    } catch (error) {
      this.onFailure();

      return Result.fail(error.message);
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        console.log('Circuit breaker: HALF_OPEN → CLOSED (success threshold met)');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      console.log('Circuit breaker: HALF_OPEN → OPEN (failure in test)');
      this.state = CircuitState.OPEN;
      this.successCount = 0;
    } else if (this.failureCount >= this.failureThreshold) {
      console.log('Circuit breaker: CLOSED → OPEN (failure threshold met)');
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// ============================================
// Usage: AI Service Client with Circuit Breaker
// ============================================

export class AIServiceClient {
  private circuitBreaker: CircuitBreaker;

  constructor(private httpClient: AxiosInstance) {
    this.circuitBreaker = new CircuitBreaker(
      5,     // Open after 5 failures
      2,     // Close after 2 successes
      60000  // Test after 60 seconds
    );
  }

  async scoreLeadAsync(leadId: string, features: LeadFeatures): Promise<Result<number>> {
    const result = await this.circuitBreaker.execute(async () => {
      const response = await this.httpClient.post('/score/lead', {
        leadId,
        features,
      }, {
        timeout: 5000, // 5 second timeout
      });

      return response.data.score;
    });

    if (result.isFailure) {
      // Fallback: Use rule-based scoring
      console.warn('AI Service unavailable, using fallback scoring');
      const fallbackScore = this.calculateFallbackScore(features);
      return Result.ok(fallbackScore);
    }

    return result;
  }

  private calculateFallbackScore(features: LeadFeatures): number {
    let score = 50; // Base score

    // Simple rule-based scoring
    if (features.employeeCount > 100) score += 20;
    if (features.industry === 'Technology') score += 10;
    if (features.recentActivities > 5) score += 20;

    return Math.min(score, 100);
  }
}
```

---

## ⚠️ Manejo de Errores

### Error Hierarchy

```typescript
// ============================================
// Domain Errors
// ============================================

export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 'NOT_FOUND');
  }
}

export class DuplicateError extends DomainError {
  constructor(
    resource: string,
    public readonly existingId: string,
    public readonly confidence: number
  ) {
    super(`Duplicate ${resource} found`, 'DUPLICATE_ERROR');
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(
    public readonly currentState: string,
    public readonly attemptedState: string
  ) {
    super(
      `Cannot transition from '${currentState}' to '${attemptedState}'`,
      'INVALID_STATE_TRANSITION'
    );
  }
}

// ============================================
// Infrastructure Errors
// ============================================

export class DatabaseError extends Error {
  constructor(message: string, public readonly originalError: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class EventPublishError extends Error {
  constructor(
    public readonly eventType: string,
    public readonly originalError: Error
  ) {
    super(`Failed to publish event: ${eventType}`);
    this.name = 'EventPublishError';
  }
}

export class ExternalServiceError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(`${serviceName} error (${statusCode}): ${message}`);
    this.name = 'ExternalServiceError';
  }
}
```

### Global Error Handler (Express Middleware)

```typescript
// ============================================
// Global Error Handler Middleware
// ============================================

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Log error with context
  logger.error('Request error', error, {
    correlationId,
    tenantId: req.tenantId,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
  });

  // Map domain errors to HTTP responses
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: {
        code: error.code,
        message: error.message,
        details: { fields: error.fields },
        correlationId,
      },
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: {
        code: error.code,
        message: error.message,
        correlationId,
      },
    });
  }

  if (error instanceof DuplicateError) {
    return res.status(409).json({
      error: {
        code: error.code,
        message: error.message,
        details: {
          existingId: error.existingId,
          confidence: error.confidence,
        },
        correlationId,
      },
    });
  }

  if (error instanceof InvalidStateTransitionError) {
    return res.status(400).json({
      error: {
        code: error.code,
        message: error.message,
        details: {
          currentState: error.currentState,
          attemptedState: error.attemptedState,
        },
        correlationId,
      },
    });
  }

  // Database errors
  if (error instanceof DatabaseError) {
    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        correlationId,
      },
    });
  }

  // External service errors (with retry indication)
  if (error instanceof ExternalServiceError) {
    return res.status(502).json({
      error: {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: `${error.serviceName} is temporarily unavailable`,
        details: {
          serviceName: error.serviceName,
          retryable: error.statusCode >= 500,
        },
        correlationId,
      },
    });
  }

  // Unknown errors (don't leak internal details)
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      correlationId,
    },
  });
}
```

### Retry Logic with Exponential Backoff

```typescript
// ============================================
// Retry with Exponential Backoff
// ============================================

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: Array<new (...args: any[]) => Error>;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryableErrors = [],
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = retryableErrors.length === 0 ||
        retryableErrors.some(ErrorClass => error instanceof ErrorClass);

      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
const lead = await retryWithBackoff(
  () => this.leadRepo.findById(leadId, tenantId),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    retryableErrors: [DatabaseError, NetworkError],
  }
);
```

---

## 🔒 Seguridad

### Authentication Middleware

```typescript
// ============================================
// JWT Authentication Middleware
// ============================================

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Verify JWT with Supabase
    const user = await supabaseAuth.verifyToken(token);

    if (!user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      tenantId: user.user_metadata.tenant_id,
      role: user.user_metadata.role,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
        },
      });
    }

    next(error);
  }
}
```

### Authorization (RBAC) Middleware

```typescript
// ============================================
// Role-Based Access Control Middleware
// ============================================

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Check if role has permission
    const hasPermission = checkPermission(userRole, permission);

    if (!hasPermission) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Permission '${permission}' required`,
        },
      });
    }

    next();
  };
}

// Permission matrix
const PERMISSIONS: Record<string, string[]> = {
  'admin': [
    'read:leads', 'create:leads', 'update:leads', 'delete:leads',
    'qualify:leads', 'convert:leads', 'assign:leads', 'score:leads',
    'read:activities', 'create:activities', 'read:analytics',
  ],
  'manager': [
    'read:leads', 'create:leads', 'update:leads',
    'qualify:leads', 'convert:leads', 'assign:leads',
    'read:activities', 'create:activities', 'read:analytics',
  ],
  'sales_rep': [
    'read:leads', 'create:leads', 'update:leads',
    'qualify:leads', 'read:activities', 'create:activities',
  ],
  'read_only': [
    'read:leads', 'read:activities',
  ],
};

function checkPermission(role: string, permission: string): boolean {
  const rolePermissions = PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
}

// Usage in routes
router.post('/leads',
  authMiddleware,
  requirePermission('create:leads'),
  createLeadHandler
);
```

### Input Validation (Zod)

```typescript
// ============================================
// Input Validation with Zod
// ============================================

import { z } from 'zod';

export const CreateLeadSchema = z.object({
  contact: z.object({
    firstName: z.string().min(1).max(255).optional(),
    lastName: z.string().min(1).max(255).optional(),
    email: z.string().email(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    jobTitle: z.string().max(255).optional(),
  }),
  company: z.object({
    name: z.string().min(1).max(255),
    industry: z.string().max(100).optional(),
    employeeCount: z.number().int().positive().optional(),
    annualRevenue: z.number().positive().optional(),
    website: z.string().url().optional(),
  }),
  sourceId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  customFields: z.record(z.any()).optional(),
});

export type CreateLeadDTO = z.infer<typeof CreateLeadSchema>;

// Validation middleware
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};

        for (const issue of error.issues) {
          const path = issue.path.join('.');
          fieldErrors[path] = issue.message;
        }

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: { fields: fieldErrors },
          },
        });
      }

      next(error);
    }
  };
}

// Usage
router.post('/leads',
  authMiddleware,
  validateRequest(CreateLeadSchema),
  requirePermission('create:leads'),
  createLeadHandler
);
```

### Rate Limiting

```typescript
// ============================================
// Rate Limiting Middleware (Redis-based)
// ============================================

export function rateLimit(options: {
  maxRequests: number;
  windowSeconds: number;
  keyGenerator?: (req: Request) => string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : `ratelimit:${req.user?.id || req.ip}`;

    const allowed = await redis.checkRateLimit(
      key,
      options.maxRequests,
      options.windowSeconds
    );

    if (!allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          details: {
            limit: options.maxRequests,
            window: `${options.windowSeconds}s`,
            retryAfter: options.windowSeconds,
          },
        },
      });
    }

    next();
  };
}

// Usage: Different limits per endpoint
router.post('/leads',
  authMiddleware,
  rateLimit({ maxRequests: 100, windowSeconds: 60 }), // 100/min
  createLeadHandler
);

router.get('/leads',
  authMiddleware,
  rateLimit({ maxRequests: 1000, windowSeconds: 60 }), // 1000/min
  listLeadsHandler
);
```

---

## 📊 Observabilidad

### Structured Logging

```typescript
// ============================================
// Structured Logger
// ============================================

import { createLogger } from '@zuclubit/logger';

const logger = createLogger('lead-service');

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log request
  logger.info('HTTP request started', {
    method: req.method,
    path: req.path,
    correlationId: req.headers['x-correlation-id'],
    tenantId: req.tenantId,
    userId: req.user?.id,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('HTTP request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId: req.headers['x-correlation-id'],
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
  });

  next();
}

// Business event logging
export class CreateLeadHandler {
  async execute(command: CreateLeadCommand): Promise<Result<LeadId>> {
    logger.info('Creating lead', {
      tenantId: command.tenantId.value,
      companyName: command.companyName.value,
      correlationId: command.correlationId,
    });

    // ... business logic ...

    logger.info('Lead created successfully', {
      leadId: lead.id.value,
      tenantId: command.tenantId.value,
      correlationId: command.correlationId,
    });

    return Result.ok(lead.id);
  }
}
```

### Distributed Tracing (Correlation IDs)

```typescript
// ============================================
// Correlation ID Middleware
// ============================================

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Get or generate correlation ID
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Attach to request
  req.correlationId = correlationId;

  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  next();
}

// Propagate correlation ID in events
export async function publishEvent<T>(event: DomainEvent<T>): Promise<void> {
  // Automatically add correlation ID from async local storage
  const correlationId = AsyncLocalStorage.getStore()?.correlationId || uuidv4();

  const enrichedEvent = {
    ...event,
    correlationId,
  };

  await natsClient.publish(enrichedEvent);

  logger.info('Event published', {
    eventType: event.type,
    eventId: event.id,
    correlationId,
  });
}
```

### Metrics Collection

```typescript
// ============================================
// Metrics Collection (Prometheus format)
// ============================================

import promClient from 'prom-client';

// Define metrics
export const metrics = {
  // HTTP metrics
  httpRequestDuration: new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 1, 3, 5, 10],
  }),

  httpRequestTotal: new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),

  // Business metrics
  leadsCreated: new promClient.Counter({
    name: 'leads_created_total',
    help: 'Total number of leads created',
    labelNames: ['tenant_id', 'source'],
  }),

  leadsQualified: new promClient.Counter({
    name: 'leads_qualified_total',
    help: 'Total number of leads qualified',
    labelNames: ['tenant_id'],
  }),

  leadScore: new promClient.Histogram({
    name: 'lead_score',
    help: 'Distribution of lead scores',
    labelNames: ['tenant_id'],
    buckets: [0, 20, 40, 60, 80, 100],
  }),

  // Database metrics
  databaseQueryDuration: new promClient.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  }),
};

// Metrics middleware
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;

    metrics.httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode,
      },
      duration
    );

    metrics.httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });

  next();
}

// Expose metrics endpoint
router.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

### Health Checks

```typescript
// ============================================
// Health Check Endpoint
// ============================================

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'lead-service',
    version: process.env.APP_VERSION || '1.0.0',
    checks: {
      postgres: 'unknown',
      mongodb: 'unknown',
      nats: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Check PostgreSQL
    await pool.query('SELECT 1');
    health.checks.postgres = 'healthy';
  } catch (error) {
    health.checks.postgres = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Check MongoDB
    await mongoClient.db().command({ ping: 1 });
    health.checks.mongodb = 'healthy';
  } catch (error) {
    health.checks.mongodb = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Check NATS
    const natsStatus = natsClient.status();
    health.checks.nats = natsStatus.connected ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.checks.nats = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Check Redis
    await redis.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## ⚡ Escalabilidad

### Caching Strategy

```typescript
// ============================================
// Multi-Level Caching Strategy
// ============================================

// Level 1: In-memory cache (per Lambda instance)
const localCache = new Map<string, { data: any; expires: number }>();

function getFromLocalCache<T>(key: string): T | null {
  const cached = localCache.get(key);

  if (!cached) return null;

  if (Date.now() > cached.expires) {
    localCache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setLocalCache(key: string, data: any, ttlSeconds: number): void {
  localCache.set(key, {
    data,
    expires: Date.now() + (ttlSeconds * 1000),
  });

  // Limit cache size (LRU eviction)
  if (localCache.size > 100) {
    const firstKey = localCache.keys().next().value;
    localCache.delete(firstKey);
  }
}

// Level 2: Redis cache (shared across instances)
export class CachedLeadRepository implements ILeadRepository {
  constructor(
    private readonly leadRepo: PostgresLeadRepository,
    private readonly redis: RedisCache
  ) {}

  async findById(id: LeadId, tenantId: TenantId): Promise<Result<Lead>> {
    const cacheKey = `lead:${tenantId.value}:${id.value}`;

    // Try local cache first (fastest)
    const localCached = getFromLocalCache<Lead>(cacheKey);
    if (localCached) {
      console.log('Local cache hit:', cacheKey);
      return Result.ok(localCached);
    }

    // Try Redis cache (fast)
    const redisCached = await this.redis.get<Lead>(cacheKey);
    if (redisCached) {
      console.log('Redis cache hit:', cacheKey);
      // Populate local cache
      setLocalCache(cacheKey, redisCached, 60); // 1 minute
      return Result.ok(redisCached);
    }

    // Cache miss - query database (slow)
    console.log('Cache miss, querying database:', cacheKey);
    const result = await this.leadRepo.findById(id, tenantId);

    if (result.isSuccess) {
      const lead = result.value;

      // Cache in Redis (5 minutes)
      await this.redis.set(cacheKey, lead, 300);

      // Cache locally (1 minute)
      setLocalCache(cacheKey, lead, 60);
    }

    return result;
  }

  async update(lead: Lead): Promise<Result<void>> {
    // Update database
    const result = await this.leadRepo.update(lead);

    if (result.isSuccess) {
      // Invalidate cache (write-through)
      const cacheKey = `lead:${lead.tenantId.value}:${lead.id.value}`;
      await this.redis.del(cacheKey);
      localCache.delete(cacheKey);
    }

    return result;
  }
}
```

### Database Connection Pooling

```typescript
// ============================================
// Optimized Connection Pool Configuration
// ============================================

import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Pool size
  max: 20, // Maximum connections
  min: 2,  // Minimum idle connections

  // Connection lifecycle
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout if can't get connection

  // Query timeout
  statement_timeout: 10000, // 10 second query timeout

  // Keepalive (for Lambda long-lived connections)
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,

  // SSL
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
});

// Connection pool monitoring
pool.on('connect', () => {
  metrics.databaseConnections.inc({ state: 'active' });
});

pool.on('remove', () => {
  metrics.databaseConnections.dec({ state: 'active' });
});

pool.on('error', (err) => {
  logger.error('Database pool error', err);
});
```

### Read Replicas for Queries

```typescript
// ============================================
// Read Replica Strategy
// ============================================

// Write pool (primary)
const writePool = new Pool({
  connectionString: process.env.DATABASE_WRITE_URL,
  max: 10,
});

// Read pool (replica)
const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL,
  max: 30, // More connections for read-heavy workload
});

export class LeadRepository {
  async save(lead: Lead): Promise<Result<void>> {
    // Always write to primary
    return this.executeWrite(async (client) => {
      await client.query(/* INSERT */);
    });
  }

  async findById(id: LeadId): Promise<Result<Lead>> {
    // Read from replica
    return this.executeRead(async (client) => {
      const result = await client.query(/* SELECT */);
      return this.mapRowToLead(result.rows[0]);
    });
  }

  async findAll(params: FindAllParams): Promise<PaginatedResult<Lead>> {
    // Read from replica
    return this.executeRead(async (client) => {
      const result = await client.query(/* SELECT with pagination */);
      return this.mapRowsToLeads(result.rows);
    });
  }

  private async executeWrite<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await writePool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  private async executeRead<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await readPool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }
}
```

### Batch Processing for Events

```typescript
// ============================================
// Batch Event Processing
// ============================================

export class LeadScoreUpdater {
  private queue: Array<{ leadId: string; score: number }> = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    // Flush queue periodically
    setInterval(() => this.flush(), this.flushInterval);
  }

  async updateScore(leadId: string, score: number): Promise<void> {
    this.queue.push({ leadId, score });

    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);

    try {
      // Batch update (single query)
      await this.batchUpdateScores(batch);

      logger.info('Batch score update completed', {
        batchSize: batch.length,
      });
    } catch (error) {
      logger.error('Batch score update failed', error, {
        batchSize: batch.length,
      });

      // Re-queue failed items
      this.queue.push(...batch);
    }
  }

  private async batchUpdateScores(
    batch: Array<{ leadId: string; score: number }>
  ): Promise<void> {
    // Use PostgreSQL UPDATE with VALUES
    const query = `
      UPDATE leads
      SET score = v.score, score_updated_at = NOW()
      FROM (VALUES ${batch.map((_, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::integer)`).join(',')})
        AS v(id, score)
      WHERE leads.id = v.id
    `;

    const values = batch.flatMap(item => [item.leadId, item.score]);

    await pool.query(query, values);
  }
}
```

---

**Documento creado**: Enero 2025
**Service**: Lead Service
**Status**: ✅ Design Complete
**Próximo paso**: Implementación


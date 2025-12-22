# FASE 6.0 - AI Engine Foundation

**Version**: 1.1.0
**Date**: 2025-12-07
**Status**: Complete

---

## Overview

FASE 6.0 introduces the AI Engine Foundation for Zuclubit Smart CRM, providing intelligent lead scoring, summarization, classification, predictions, insights, and data enrichment capabilities powered by multiple AI providers.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React)                            │
├─────────────────────────────────────────────────────────────────┤
│  hooks.ts       │  React Query hooks for AI operations          │
│  - useLeadSummary, useLeadScore, useInsights, etc.              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    API Routes (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│  /api/ai/summary   │  Lead and note summarization               │
│  /api/ai/score     │  Lead scoring (single & batch)             │
│  /api/ai/classify  │  Lead classification                       │
│  /api/ai/predict   │  Stage & conversion predictions            │
│  /api/ai/insights  │  AI-generated insights                     │
│  /api/ai/enrich    │  Data enrichment                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      AI Engine Core                              │
├─────────────────────────────────────────────────────────────────┤
│  engine.ts    │  Main AI functions                              │
│  provider.ts  │  Multi-provider abstraction                     │
│  context.ts   │  Data preparation & context building            │
│  security.ts  │  Rate limiting, content policy, audit           │
│  types.ts     │  TypeScript type definitions                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    AI Providers                                  │
├─────────────────────────────────────────────────────────────────┤
│  OpenAI       │  GPT-4, GPT-3.5 Turbo                           │
│  Anthropic    │  Claude 3 Sonnet, Claude 3 Opus                 │
│  Groq         │  Mixtral 8x7B (fast inference)                  │
│  Azure OpenAI │  Enterprise GPT deployments                     │
│  Local        │  Ollama, local LLM endpoints                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Types (`types.ts`)

Comprehensive TypeScript definitions for all AI operations:

```typescript
// Core types
type AIProvider = 'openai' | 'anthropic' | 'groq' | 'azure-openai' | 'local';

interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: AIError;
  metadata: AIResponseMetadata;
}

// Domain-specific types
interface AILeadSummary { ... }
interface AILeadScore { ... }
interface AILeadClassification { ... }
interface AIInsight { ... }
interface AIEnrichment { ... }
interface AIPrediction<T> { ... }
```

### 2. Provider Layer (`provider.ts`)

Multi-provider abstraction with:
- Automatic provider selection
- Retry logic with exponential backoff
- Timeout handling
- Error normalization

```typescript
import { callLLM, getDefaultProvider, isProviderAvailable } from '@/lib/ai';

const response = await callLLM('openai', {
  messages: [
    { role: 'system', content: 'You are a CRM assistant.' },
    { role: 'user', content: 'Summarize this lead...' },
  ],
  temperature: 0.3,
  maxTokens: 1024,
});
```

### 3. Engine Functions (`engine.ts`)

High-level AI operations for CRM:

| Function | Description |
|----------|-------------|
| `generateLeadSummary()` | Generate AI summary for a lead |
| `generateNoteSummary()` | Summarize multiple notes |
| `classifyLead()` | Classify lead by industry, size, persona |
| `scoreLead()` | AI-powered lead scoring (0-100) |
| `predictStageChange()` | Predict next pipeline stage |
| `predictConversion()` | Predict conversion likelihood |
| `generateInsights()` | Generate actionable insights |
| `enrichLead()` | Enrich lead data with AI inference |
| `scoreLeadsBatch()` | Batch lead scoring |

### 4. React Query Hooks (`hooks.ts`)

Ready-to-use React hooks:

```typescript
// Query hooks (with caching)
const { data, isLoading } = useLeadScore({ lead, enabled: true });
const { data: summary } = useLeadSummary({ text, leadId });
const { data: insights } = useInsights({ context });

// Mutation hooks (on-demand)
const scoreMutation = useScoreLeadMutation();
const enrichMutation = useEnrichLeadMutation();

// Batch operations
const batchScore = useBatchScoreLeadsMutation();
```

### 5. Context Builder (`context.ts`)

Prepare CRM data for AI processing:

```typescript
import { CRMContextBuilder, prepareLeadForAI } from '@/lib/ai';

const context = new CRMContextBuilder()
  .setIdentifiers(tenantId, userId)
  .setEntity('lead', leadId)
  .addNotes(notes)
  .addActivities(activities)
  .setPipelineContext(currentStage, stageHistory, createdAt)
  .build();

const leadText = prepareLeadForAI(lead);
```

### 6. Security Module (`security.ts`)

Comprehensive security features:

#### Rate Limiting
```typescript
import { checkRateLimit, recordRequest } from '@/lib/ai';

const check = checkRateLimit(tenantId, 'openai', estimatedTokens);
if (!check.allowed) {
  throw new Error(check.reason);
}
```

#### Content Policy
```typescript
import { validateInput, sanitizeOutput } from '@/lib/ai';

const validation = validateInput(userInput);
if (!validation.valid) {
  throw new Error(validation.reason);
}
```

#### Prompt Injection Protection
```typescript
import { detectPromptInjection, sanitizeInput } from '@/lib/ai';

const injection = detectPromptInjection(input);
if (injection.detected) {
  logSecurityEvent('prompt_injection_attempt', injection);
  throw new Error('Invalid input detected');
}

const safeInput = sanitizeInput(input);
```

#### Audit Logging
```typescript
import { logAIOperation, getUsageStats } from '@/lib/ai';

logAIOperation({
  tenantId,
  userId,
  operation: 'scoreLead',
  provider: 'openai',
  model: 'gpt-4',
  inputTokens: 100,
  outputTokens: 150,
  latencyMs: 1200,
  success: true,
});

const stats = getUsageStats(tenantId);
```

---

## API Endpoints

### POST /api/ai/summary

Generate lead or note summaries.

```json
// Request - Lead Summary
{
  "type": "lead",
  "leadId": "lead-123",
  "text": "John Doe, CEO at TechCorp...",
  "options": { "provider": "openai" }
}

// Request - Notes Summary
{
  "type": "notes",
  "notes": [
    { "id": "n1", "content": "...", "createdAt": "2024-01-15" }
  ]
}

// Response
{
  "success": true,
  "data": {
    "summary": "High-value enterprise lead...",
    "keyPoints": ["..."],
    "sentiment": "positive",
    "urgency": "high",
    "nextActions": [...]
  },
  "metadata": { "provider": "openai", "latencyMs": 1200 }
}
```

### POST /api/ai/score

Score leads (single or batch).

```json
// Single Lead
{ "lead": { "id": "...", "company": "TechCorp", ... } }

// Batch
{ "leads": [...], "options": { "concurrency": 3 } }
```

### POST /api/ai/classify

Classify lead by industry, size, persona.

```json
{
  "text": "TechCorp, 500 employees, looking for enterprise CRM"
}
```

### POST /api/ai/predict

Predict stage changes or conversion.

```json
// Stage prediction
{ "type": "stage", "lead": {...}, "stageHistory": [...] }

// Conversion prediction
{ "type": "conversion", "lead": {...} }
```

### POST /api/ai/insights

Generate actionable insights.

```json
{
  "context": {
    "tenantId": "...",
    "userId": "...",
    "entityType": "lead",
    "entityId": "...",
    "relatedData": { "notes": [...], "activities": [...] }
  }
}
```

### POST /api/ai/enrich

Enrich lead data.

```json
{
  "lead": { "id": "...", "email": "john@techcorp.com" }
}
```

---

## Configuration

### Environment Variables

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Groq
GROQ_API_KEY=gsk-...

# Azure OpenAI
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Local LLM
LOCAL_LLM_URL=http://localhost:11434/api
```

### Provider Priority

The system automatically selects the best available provider:
1. OpenAI (default)
2. Anthropic
3. Groq
4. Azure OpenAI
5. Local

---

## Security Features

### Rate Limits (per provider)

| Provider | Requests/min | Requests/hr | Tokens/min | Tokens/hr |
|----------|-------------|-------------|------------|-----------|
| OpenAI | 60 | 1,000 | 90,000 | 1,000,000 |
| Anthropic | 50 | 500 | 100,000 | 800,000 |
| Groq | 30 | 200 | 60,000 | 500,000 |

### Content Policy

- Max input: 50,000 characters
- Max output: 10,000 characters
- Blocked patterns: SSN, credit cards, jailbreak attempts
- Auto-redaction of PII in outputs

### Prompt Injection Protection

Detects and blocks:
- Instruction override attempts
- Role manipulation
- System prompt extraction
- Safety bypass attempts

---

## Testing

66 tests covering:
- Engine functions (11 tests)
- Security features (25 tests)
- Context preparation (30 tests)

```bash
npm run test:run -- src/lib/ai/__tests__/
```

---

## Usage Examples

### Lead Scoring in Component

```tsx
import { useLeadScore, useScoreLeadMutation } from '@/lib/ai';

function LeadScoreCard({ lead }) {
  // Automatic scoring with caching
  const { data: score, isLoading } = useLeadScore({
    lead,
    enabled: true
  });

  // Or on-demand scoring
  const scoreMutation = useScoreLeadMutation();

  const handleRescore = () => {
    scoreMutation.mutate({ lead });
  };

  if (isLoading) return <Skeleton />;

  return (
    <Card>
      <Score value={score?.score} grade={score?.grade} />
      <Recommendation type={score?.recommendation} />
      <Button onClick={handleRescore}>Rescore</Button>
    </Card>
  );
}
```

### Generating Insights

```tsx
import { useInsights, CRMContextBuilder } from '@/lib/ai';

function LeadInsights({ lead, notes, activities }) {
  const context = new CRMContextBuilder()
    .setIdentifiers(tenantId, userId)
    .setEntity('lead', lead.id)
    .addNotes(notes)
    .addActivities(activities)
    .build();

  const { data: insights } = useInsights({ context });

  return (
    <InsightsList>
      {insights?.map(insight => (
        <InsightCard
          key={insight.id}
          type={insight.type}
          title={insight.title}
          actions={insight.suggestedActions}
        />
      ))}
    </InsightsList>
  );
}
```

---

## Files Created

```
apps/web/src/lib/ai/
├── index.ts              # Central exports
├── types.ts              # Type definitions
├── provider.ts           # Provider abstraction
├── engine.ts             # AI engine functions
├── hooks.ts              # React Query hooks
├── context.ts            # Context & data prep
├── security.ts           # Security module
└── __tests__/
    ├── engine.test.ts    # Engine tests
    ├── context.test.ts   # Context tests
    └── security.test.ts  # Security tests

apps/web/src/app/api/ai/
├── summary/route.ts      # Summary endpoint
├── score/route.ts        # Scoring endpoint
├── classify/route.ts     # Classification endpoint
├── predict/route.ts      # Prediction endpoint
├── insights/route.ts     # Insights endpoint
└── enrich/route.ts       # Enrichment endpoint
```

---

## Next Steps (FASE 6.1+)

1. **UI Components**: AI-powered widgets for lead cards
2. **Caching Layer**: Redis caching for AI responses
3. **Streaming**: Server-sent events for real-time AI updates
4. **Fine-tuning**: Custom model training on CRM data
5. **Analytics**: AI usage dashboards and cost tracking

---

## Changelog

### v1.1.0 (2025-12-07)
- Initial AI Engine Foundation
- Multi-provider support (OpenAI, Anthropic, Groq, Azure, Local)
- 6 API endpoints for AI operations
- React Query hooks with caching
- Rate limiting and content policy
- Prompt injection protection
- Audit logging
- 66 tests passing

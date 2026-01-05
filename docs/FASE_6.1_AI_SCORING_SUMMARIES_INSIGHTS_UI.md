# FASE 6.1 — AI Lead Scoring + Smart Insights UI Integration

## Overview

FASE 6.1 integrates the AI Engine (developed in FASE 6.0) directly into the CRM user experience, providing intelligent lead scoring, smart summaries, and actionable insights throughout the application.

## Features Implemented

### 1. AI UI Components (`/apps/web/src/components/ai/`)

#### Core Components
- **AIBadge** - Visual badges for temperature, intent, and urgency levels
- **AIScore** - Score gauge visualization with trend indicators
- **AISummary** - AI-generated summary display with sentiment and key points
- **AIInsightCard** - Individual insight cards with actions
- **AIClassificationCard** - Lead classification display (industry, persona, interests)
- **AIOpportunityPrediction** - Deal prediction visualization

#### Composite Panels
- **AIAssistantPanel** - Lead detail page AI integration (Score + Summary + Classification)
- **AIOpportunityPanel** - Opportunity AI insights panel
- **AIDashboardInsights** - Dashboard insights feed with RBAC filtering

#### Command Palette
- **AICommandPalette** - Global AI actions menu (⌘K)
- **AIActionsButton** - Toolbar button for AI actions
- **useAICommandPalette** - Hook for programmatic control

### 2. Lead Detail Page AI Panel (`/app/leads/[leadId]`)

The Lead Detail page includes an "AI Insights" tab with:

- **AI Score Card**
  - Visual score gauge (0-100)
  - Temperature badge (Hot/Warm/Cold)
  - Score factors with impact indicators
  - Trend visualization (vs previous score)
  - Confidence level

- **AI Summary**
  - Natural language summary
  - Key points extraction
  - Sentiment analysis (positive/neutral/negative/mixed)
  - Urgency level (low/medium/high/critical)
  - Recommended next actions

- **AI Classification**
  - Industry classification
  - Company size detection
  - Buyer persona identification
  - Intent level (low/medium/high)
  - Interest tags

### 3. Opportunity Detail Page AI Insights (`/app/opportunities/[id]`)

The Opportunity Detail page includes an "AI" tab with:

- **Deal Summary**
  - AI-generated deal analysis
  - Key decision factors
  - Risk assessment

- **Stage Prediction**
  - Predicted next stage
  - Probability percentage
  - Estimated timeframe
  - Contributing factors

- **Conversion Prediction**
  - Win probability
  - Potential value estimation
  - Risk factors
  - Positive indicators

### 4. Dashboard AI Insights Feed (`/app/dashboard`)

The dashboard includes an AI insights section with:

- Personalized insights based on user role
- RBAC-filtered content
- Actionable recommendations
- Real-time updates

### 5. AI Command Palette (⌘K)

Global command palette for quick AI actions:

#### Lead Actions (when viewing a lead)
- Score Lead
- Summarize Lead
- Classify Lead
- Predict Conversion
- Enrich Lead Data

#### Opportunity Actions (when viewing an opportunity)
- Analyze Opportunity
- Predict Stage Change
- Suggest Next Actions

#### Global Actions
- View AI Insights
- Bulk Score Leads
- Refresh AI Predictions
- Open AI Assistant

## Architecture

### Component Structure
```
/apps/web/src/
├── components/ai/
│   ├── ai-badge.tsx              # Temperature, intent, urgency badges
│   ├── ai-score.tsx              # Score gauge component
│   ├── ai-summary.tsx            # Summary display
│   ├── ai-insight-card.tsx       # Insight cards
│   ├── ai-classification-card.tsx # Classification display
│   ├── ai-opportunity-prediction.tsx # Deal predictions
│   ├── ai-assistant-panel.tsx    # Lead AI panel
│   ├── ai-opportunity-panel.tsx  # Opportunity AI panel
│   ├── ai-dashboard-insights.tsx # Dashboard insights
│   ├── ai-command-palette.tsx    # Command palette
│   └── index.ts                  # Exports
├── lib/ai/
│   ├── types.ts                  # AI type definitions
│   ├── engine.ts                 # AI engine functions
│   ├── provider.ts               # Provider abstraction
│   ├── security.ts               # Security & rate limiting
│   └── hooks.ts                  # React Query hooks
└── store/
    └── ui.store.ts               # UI state (command palette)
```

### AI Hooks

```typescript
// Available hooks from /lib/ai/hooks.ts
useLeadScore(leadId: string)
useLeadSummary(leadId: string)
useLeadClassify(leadId: string)
usePrediction(leadId: string)
useStagePrediction(leadId: string)
useInsights(context: CRMContext)
```

### Component Usage

```tsx
import {
  AIScore,
  AISummary,
  AIClassificationCard,
  AIAssistantPanel,
  AICommandPalette,
} from '@/components/ai';

// Score component
<AIScore
  score={85}
  previousScore={78}
  grade="A"
  factors={[...]}
  recommendation="pursue"
  onRefresh={() => refetch()}
/>

// Summary component
<AISummary
  summary="High-value enterprise lead..."
  keyPoints={['Budget confirmed', 'Decision maker involved']}
  sentiment="positive"
  urgency="high"
  nextActions={[...]}
/>

// Full panel
<AIAssistantPanel
  leadId={leadId}
  tenantId={tenantId}
  data={{ score, summary, classification }}
  onRefresh={handleRefresh}
/>

// Command palette (global)
<AICommandPalette leadId={leadId} />
```

## Security & Privacy

### Rate Limiting
- Per-tenant request limits (configured in `/lib/ai/security.ts`)
- Token limits per minute/hour
- Provider-specific configurations

### Content Moderation
- Input validation and sanitization
- Blocked pattern detection
- PII scrubbing in outputs
- Prompt injection protection

### Audit Logging
- All AI operations logged
- Usage metrics tracking
- Per-tenant statistics

## Design System

### Color Coding
- **Hot leads**: Red tones (#EF4444)
- **Warm leads**: Amber tones (#F59E0B)
- **Cold leads**: Blue tones (#3B82F6)
- **High intent**: Emerald tones (#10B981)
- **Critical urgency**: Red with pulse animation

### Dark Mode
All components fully support dark mode with appropriate contrast ratios.

## Testing

Tests located in `/lib/ai/__tests__/`:
- `engine.test.ts` - AI engine function tests
- `context.test.ts` - Context management tests
- `security.test.ts` - Security feature tests

Run tests:
```bash
npm run test
```

## Dependencies

- React Query (@tanstack/react-query) - Data fetching
- Zustand - State management
- Shadcn UI - Component primitives
- cmdk - Command palette
- Lucide React - Icons

## Future Enhancements

- Real-time AI insights via WebSocket
- Batch scoring interface
- AI model selection per tenant
- Custom insight templates
- Enhanced analytics dashboard

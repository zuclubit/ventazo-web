# Backend-Frontend Alignment Matrix

## Estado: COMPLETADO

**Fecha de Generacion:** 2025-12-07

---

## 1. RESUMEN VISUAL

```
LEYENDA:
  [===] = 100% Cubierto
  [== ] = 75% Cubierto
  [=  ] = 50% Cubierto
  [   ] = 0% Cubierto

MODULO               BACKEND    FRONTEND   ALINEACION
---------------------------------------------------------
Auth/Session         [===]      [   ]      0%   [CRITICO]
Leads CRUD           [===]      [== ]      76%  [BUENO]
Leads Advanced       [===]      [   ]      0%   [FALTANTE]
Customers            [===]      [===]      91%  [EXCELENTE]
Opportunities        [===]      [== ]      79%  [BUENO]
Tasks                [===]      [===]      100% [COMPLETO]
Services             [=  ]      [===]      100% [COMPLETO]
Workflows Basic      [===]      [== ]      62%  [PARCIAL]
Workflow Builder     [===]      [   ]      0%   [FALTANTE]
Notifications        [===]      [===]      100% [COMPLETO]
Messaging Channels   [===]      [   ]      0%   [FALTANTE]
Analytics Basic      [===]      [=  ]      40%  [PARCIAL]
Advanced Reports     [===]      [   ]      0%   [FALTANTE]
AI/ML Features       [===]      [   ]      0%   [FALTANTE]
RBAC/Permissions     [===]      [   ]      0%   [FALTANTE]
Teams/Territories    [===]      [   ]      0%   [FALTANTE]
Integrations         [===]      [   ]      0%   [FALTANTE]
GDPR/Compliance      [===]      [   ]      0%   [FALTANTE]
```

---

## 2. MATRIZ DETALLADA POR ENDPOINT

### 2.1 LEADS MODULE

| Backend Route | Method | Frontend Hook | UI Page | Status |
|---------------|--------|---------------|---------|--------|
| `/api/v1/leads` | GET | `useLeads()` | `/app/leads` | ALINEADO |
| `/api/v1/leads` | POST | `useCreateLead()` | Modal | ALINEADO |
| `/api/v1/leads/:id` | GET | `useLead()` | `/app/leads/[id]` | ALINEADO |
| `/api/v1/leads/:id` | PATCH | `useUpdateLead()` | Modal | ALINEADO |
| `/api/v1/leads/:id` | DELETE | `useDeleteLead()` | Dialog | ALINEADO |
| `/api/v1/leads/:id/assign` | POST | `useAssignLead()` | Modal | ALINEADO |
| `/api/v1/leads/:id/qualify` | POST | `useQualifyLead()` | Button | ALINEADO |
| `/api/v1/leads/:id/status` | PATCH | `useUpdateLeadStatus()` | Dropdown | ALINEADO |
| `/api/v1/leads/:id/score` | PATCH | `useUpdateLeadScore()` | Slider | ALINEADO |
| `/api/v1/leads/:id/convert` | POST | `useConvertLead()` | Modal | ALINEADO |
| `/api/v1/leads/:id/follow-up` | POST | `useScheduleFollowUp()` | Modal | ALINEADO |
| `/api/v1/leads/stats` | GET | `useLeadStatistics()` | Cards | ALINEADO |
| `/api/v1/leads/overdue-follow-ups` | GET | `useOverdueFollowUps()` | Widget | ALINEADO |
| `/api/v1/leads/bulk` | POST | - | - | GAP: P1 |
| `/api/v1/leads/:id/notes` | GET | - | - | GAP: P2 |
| `/api/v1/leads/:id/notes` | POST | - | - | GAP: P2 |
| `/api/v1/leads/:id/activity` | GET | - | - | GAP: P2 |

**Cobertura:** 13/17 = 76%

---

### 2.2 CUSTOMERS MODULE

| Backend Route | Method | Frontend Hook | UI Page | Status |
|---------------|--------|---------------|---------|--------|
| `/api/v1/customers` | GET | `useCustomers()` | `/app/customers` | ALINEADO |
| `/api/v1/customers` | POST | `useCreateCustomer()` | Modal | ALINEADO |
| `/api/v1/customers/:id` | GET | `useCustomer()` | `/app/customers/[id]` | ALINEADO |
| `/api/v1/customers/:id` | PATCH | `useUpdateCustomer()` | Modal | ALINEADO |
| `/api/v1/customers/:id` | DELETE | `useDeleteCustomer()` | Dialog | ALINEADO |
| `/api/v1/customers/statistics` | GET | `useCustomerStatistics()` | Cards | ALINEADO |
| `/api/v1/customers/:id/notes` | GET | `useCustomerNotes()` | Panel | ALINEADO |
| `/api/v1/customers/:id/notes` | POST | `useAddCustomerNote()` | Form | ALINEADO |
| `/api/v1/customers/:id/notes/:noteId` | PATCH | `useUpdateCustomerNote()` | Inline | ALINEADO |
| `/api/v1/customers/:id/notes/:noteId` | DELETE | `useDeleteCustomerNote()` | Button | ALINEADO |
| `/api/v1/customers/:id/activity` | GET | `useCustomerActivity()` | Timeline | ALINEADO |
| `/api/v1/customers/top-revenue` | GET | - | - | GAP: P3 |

**Cobertura:** 11/12 = 91%

---

### 2.3 OPPORTUNITIES MODULE

| Backend Route | Method | Frontend Hook | UI Page | Status |
|---------------|--------|---------------|---------|--------|
| `/api/v1/opportunities` | GET | `useOpportunities()` | `/app/opportunities` | ALINEADO |
| `/api/v1/opportunities` | POST | `useCreateOpportunity()` | Modal | ALINEADO |
| `/api/v1/opportunities/:id` | GET | `useOpportunity()` | `/app/opportunities/[id]` | ALINEADO |
| `/api/v1/opportunities/:id` | PATCH | `useUpdateOpportunity()` | Modal | ALINEADO |
| `/api/v1/opportunities/:id` | DELETE | `useDeleteOpportunity()` | Dialog | ALINEADO |
| `/api/v1/opportunities/statistics` | GET | `useOpportunityStatistics()` | Cards | ALINEADO |
| `/api/v1/opportunities/forecast` | GET | - | - | GAP: P1 |
| `/api/v1/opportunities/:id/win` | POST | `useMarkOpportunityWon()` | Modal | ALINEADO |
| `/api/v1/opportunities/:id/lose` | POST | `useMarkOpportunityLost()` | Modal | ALINEADO |
| `/api/v1/opportunities/:id/reopen` | POST | - | - | GAP: P2 |
| `/api/v1/opportunities/bulk` | POST | - | - | GAP: P1 |
| `/api/v1/opportunities/convert-lead` | POST | - | - | GAP: P2 |
| `/api/v1/opportunities/by-entity` | GET | - | - | GAP: P3 |
| `/api/v1/opportunities/:id/stage` | PATCH | `useUpdateOpportunityStage()` | Kanban | ALINEADO |
| `/api/v1/opportunities/:id/status` | PATCH | `useUpdateOpportunityStatus()` | Dropdown | ALINEADO |
| `/api/v1/opportunities/:id/owner` | PATCH | `useAssignOpportunityOwner()` | Modal | ALINEADO |
| `/api/v1/opportunities/pipeline/stages` | GET | `usePipelineStages()` | Kanban | ALINEADO |
| `/api/v1/opportunities/pipeline/stages` | POST | `useCreatePipelineStage()` | Modal | ALINEADO |
| `/api/v1/opportunities/pipeline/view` | GET | `usePipelineView()` | `/app/opportunities/pipeline` | ALINEADO |

**Cobertura:** 15/19 = 79%

---

### 2.4 TASKS MODULE

| Backend Route | Method | Frontend Hook | UI Page | Status |
|---------------|--------|---------------|---------|--------|
| `/api/v1/tasks` | GET | `useTasks()` | `/app/tasks` | ALINEADO |
| `/api/v1/tasks` | POST | `useCreateTask()` | Modal | ALINEADO |
| `/api/v1/tasks/:id` | GET | `useTask()` | `/app/tasks/[id]` | ALINEADO |
| `/api/v1/tasks/:id` | PATCH | `useUpdateTask()` | Modal | ALINEADO |
| `/api/v1/tasks/:id` | DELETE | `useDeleteTask()` | Dialog | ALINEADO |
| `/api/v1/tasks/:id/complete` | POST | `useCompleteTask()` | Button | ALINEADO |
| `/api/v1/tasks/:id/cancel` | POST | `useCancelTask()` | Button | ALINEADO |
| `/api/v1/tasks/upcoming` | GET | `useUpcomingTasks()` | Widget | ALINEADO |
| `/api/v1/tasks/statistics` | GET | `useTaskStatistics()` | Cards | ALINEADO |
| `/api/v1/tasks/by-entity` | GET | `useTasksByEntity()` | Panel | ALINEADO |
| `/api/v1/tasks/bulk` | POST | `useBulkTaskOperation()` | Toolbar | ALINEADO |

**Cobertura:** 11/11 = 100%

---

### 2.5 WORKFLOWS MODULE

| Backend Route | Method | Frontend Hook | UI Page | Status |
|---------------|--------|---------------|---------|--------|
| `/api/v1/workflows` | GET | `useWorkflows()` | `/app/workflows` | ALINEADO |
| `/api/v1/workflows` | POST | `useCreateWorkflow()` | Modal | ALINEADO |
| `/api/v1/workflows/:id` | GET | `useWorkflow()` | `/app/workflows/[id]` | ALINEADO |
| `/api/v1/workflows/:id` | PATCH | `useUpdateWorkflow()` | Modal | ALINEADO |
| `/api/v1/workflows/:id` | DELETE | `useDeleteWorkflow()` | Dialog | ALINEADO |
| `/api/v1/workflows/:id/activate` | POST | `useActivateWorkflow()` | Switch | ALINEADO |
| `/api/v1/workflows/:id/deactivate` | POST | `useDeactivateWorkflow()` | Switch | ALINEADO |
| `/api/v1/workflows/:id/executions` | GET | `useWorkflowExecutions()` | Table | ALINEADO |
| `/api/v1/workflow-builder/:id` | GET | - | - | GAP: P1 |
| `/api/v1/workflow-builder/:id/nodes` | POST | - | - | GAP: P1 |
| `/api/v1/workflow-builder/:id/nodes/:nodeId` | PATCH | - | - | GAP: P1 |
| `/api/v1/workflow-builder/:id/nodes/:nodeId` | DELETE | - | - | GAP: P1 |
| `/api/v1/workflow-builder/:id/edges` | POST | - | - | GAP: P1 |

**Cobertura:** 8/13 = 62%

---

### 2.6 MESSAGING MODULE

| Backend Route | Method | Frontend Hook | UI Page | Status |
|---------------|--------|---------------|---------|--------|
| Notifications CRUD | - | `useNotifications()` | `/app/notifications` | ALINEADO |
| Mark Read | - | `useMarkNotificationRead()` | Button | ALINEADO |
| Preferences | - | `useNotificationPreferences()` | `/app/settings/notifications` | ALINEADO |
| Templates | - | `useMessageTemplates()` | `/app/settings/messaging/templates` | ALINEADO |
| Message Logs | - | `useMessages()` | `/app/settings/messaging/logs` | ALINEADO |
| Send Message | - | `useSendMessage()` | Modal | ALINEADO |
| `/api/v1/sms/*` | ALL | - | - | GAP: P2 |
| `/api/v1/whatsapp/*` | ALL | - | - | GAP: P2 |
| `/api/v1/push/*` | ALL | - | - | GAP: P2 |
| `/api/v1/email-sync/*` | ALL | - | - | GAP: P2 |
| `/api/v1/email-tracking/*` | ALL | - | - | GAP: P2 |
| `/api/v1/unified-inbox/*` | ALL | - | - | GAP: P1 |

**Cobertura Notifications:** 8/8 = 100%
**Cobertura Messaging Channels:** 0/6 = 0%

---

### 2.7 ANALYTICS MODULE

| Backend Route | Method | Frontend Hook | UI Page | Status |
|---------------|--------|---------------|---------|--------|
| `/api/v1/analytics/dashboard` | GET | `useAnalyticsDashboard()` | `/app/dashboard` | ALINEADO |
| `/api/v1/analytics/leads` | GET | `useLeadAnalytics()` | `/app/analytics/leads` | ALINEADO |
| `/api/v1/analytics/opportunities` | GET | `useOpportunityAnalytics()` | `/app/analytics/opportunities` | ALINEADO |
| `/api/v1/analytics/tasks` | GET | `useTaskAnalytics()` | `/app/analytics/tasks` | ALINEADO |
| `/api/v1/analytics/services` | GET | `useServiceAnalytics()` | `/app/analytics/services` | ALINEADO |
| `/api/v1/analytics/workflows` | GET | `useWorkflowAnalytics()` | `/app/analytics/workflows` | ALINEADO |
| `/api/v1/analytics/revenue` | GET | - | - | GAP: P2 |
| `/api/v1/analytics/performance` | GET | - | - | GAP: P2 |
| `/api/v1/analytics/trends` | GET | - | - | GAP: P2 |
| `/api/v1/advanced-reports/reports` | ALL | - | - | GAP: P1 |
| `/api/v1/advanced-reports/dashboards` | ALL | - | - | GAP: P1 |
| `/api/v1/advanced-reports/export` | POST | - | - | GAP: P1 |
| `/api/v1/advanced-reports/schedule` | POST | - | - | GAP: P1 |
| `/api/v1/forecasting/*` | ALL | - | - | GAP: P1 |

**Cobertura Basic:** 6/9 = 67%
**Cobertura Advanced:** 0/5 = 0%

---

### 2.8 MODULOS SIN COBERTURA FRONTEND

| Backend Module | Endpoints | Priority | Required Frontend |
|----------------|-----------|----------|-------------------|
| auth.routes.ts | 8+ | P0 | Login, Register, Session pages |
| ai.routes.ts | 10+ | P1 | AI Panel, Suggestions widget |
| ml-scoring.routes.ts | 5+ | P1 | Score explanation, settings |
| enrichment.routes.ts | 5+ | P1 | Enrichment status, results |
| segmentation.routes.ts | 8+ | P1 | Segment builder UI |
| deduplication.routes.ts | 5+ | P1 | Duplicate finder, merge UI |
| custom-field.routes.ts | 6+ | P1 | Field builder, settings |
| calendar.routes.ts | 8+ | P2 | Calendar view, sync settings |
| gdpr.routes.ts | 6+ | P2 | Privacy center, DSR management |
| campaign.routes.ts | 10+ | P2 | Campaign builder, stats |
| drip-sequence.routes.ts | 8+ | P2 | Sequence editor, triggers |
| quote.routes.ts | 6+ | P2 | Quote builder, PDF export |
| contract.routes.ts | 6+ | P2 | Contract templates, signing |
| payment.routes.ts | 8+ | P2 | Payment settings, history |
| customer-success.routes.ts | 6+ | P2 | CS dashboard, health scores |
| subscription-analytics.routes.ts | 5+ | P2 | MRR, churn charts |
| permission.routes.ts | 8+ | P1 | Role editor, permission matrix |
| team.routes.ts | 8+ | P2 | Team management, territories |
| integration-connector.routes.ts | 10+ | P2 | Integration marketplace |
| integration-hub.routes.ts | 6+ | P2 | Connected apps list |
| audit.routes.ts | 4+ | P3 | Audit log viewer |
| cache.routes.ts | 3+ | P3 | Cache stats, invalidation |
| rate-limiting.routes.ts | 3+ | P3 | Rate limit settings |
| resilience.routes.ts | 4+ | P3 | Health check dashboard |
| tracing.routes.ts | 3+ | P3 | Trace viewer |
| locking.routes.ts | 2+ | P3 | Lock management |
| webhook-dlq.routes.ts | 4+ | P3 | Failed webhook retry |

---

## 3. COBERTURA POR PRIORIDAD

### P0 - Critico (Bloquea Produccion)
| Modulo | Backend | Frontend | Gap |
|--------|---------|----------|-----|
| Authentication | 100% | 0% | 100% |

### P1 - Alta (Funcionalidad Core)
| Modulo | Backend | Frontend | Gap |
|--------|---------|----------|-----|
| Workflow Builder | 100% | 0% | 100% |
| AI/ML Features | 100% | 0% | 100% |
| Advanced Reports | 100% | 0% | 100% |
| Unified Inbox | 100% | 0% | 100% |
| Segmentation | 100% | 0% | 100% |
| Custom Fields | 100% | 0% | 100% |
| RBAC | 100% | 0% | 100% |
| Forecasting | 100% | 0% | 100% |
| Bulk Operations | 100% | ~20% | 80% |

### P2 - Media (Mejora Experiencia)
| Modulo | Backend | Frontend | Gap |
|--------|---------|----------|-----|
| Calendar | 100% | 0% | 100% |
| GDPR | 100% | 0% | 100% |
| Campaigns | 100% | 0% | 100% |
| Drip Sequences | 100% | 0% | 100% |
| Quotes | 100% | 0% | 100% |
| Contracts | 100% | 0% | 100% |
| Payments | 100% | 0% | 100% |
| SMS/WhatsApp/Push | 100% | 0% | 100% |
| Team Management | 100% | ~20% | 80% |
| Lead Notes/Activity | 100% | 0% | 100% |

### P3 - Baja (Infraestructura)
| Modulo | Backend | Frontend | Gap |
|--------|---------|----------|-----|
| Audit | 100% | 0% | 100% |
| Cache | 100% | 0% | 100% |
| Rate Limiting | 100% | 0% | 100% |
| Resilience | 100% | 0% | 100% |
| Tracing | 100% | 0% | 100% |

---

## 4. FRONTEND PAGES VS BACKEND COVERAGE

| Page | Route | Backend Coverage | Status |
|------|-------|------------------|--------|
| Dashboard | `/app/dashboard` | 100% | OK |
| Leads List | `/app/leads` | 100% | OK |
| Lead Detail | `/app/leads/[id]` | 75% | PARTIAL |
| Lead Pipeline | `/app/leads/pipeline` | 100% | OK |
| Customers List | `/app/customers` | 100% | OK |
| Customer Detail | `/app/customers/[id]` | 100% | OK |
| Opportunities List | `/app/opportunities` | 100% | OK |
| Opportunity Detail | `/app/opportunities/[id]` | 80% | PARTIAL |
| Opportunity Pipeline | `/app/opportunities/pipeline` | 100% | OK |
| Tasks List | `/app/tasks` | 100% | OK |
| Task Detail | `/app/tasks/[id]` | 100% | OK |
| Services List | `/app/services` | 100% | OK |
| Service Detail | `/app/services/[id]` | 100% | OK |
| Service Categories | `/app/services/categories` | 100% | OK |
| Workflows List | `/app/workflows` | 100% | OK |
| Workflow Detail | `/app/workflows/[id]` | 60% | PARTIAL |
| Analytics Dashboard | `/app/analytics/*` | 60% | PARTIAL |
| Notifications | `/app/notifications` | 100% | OK |
| Messaging Templates | `/app/settings/messaging/templates` | 100% | OK |
| Messaging Logs | `/app/settings/messaging/logs` | 100% | OK |
| Notification Settings | `/app/settings/notifications` | 100% | OK |
| Profile Settings | `/app/settings/profile` | 50% | PARTIAL |
| Team Settings | `/app/settings/team` | 30% | PARTIAL |
| Activity Settings | `/app/settings/activity` | 20% | PARTIAL |

---

## 5. HOOKS VS BACKEND ENDPOINTS

### Fully Aligned Hooks (100% Backend Coverage)
- `useLeads()`, `useLead()`, `useCreateLead()`, `useUpdateLead()`, `useDeleteLead()`
- `useCustomers()`, `useCustomer()`, `useCreateCustomer()`, `useUpdateCustomer()`, `useDeleteCustomer()`
- `useOpportunities()`, `useOpportunity()`, `useCreateOpportunity()`, `useUpdateOpportunity()`, `useDeleteOpportunity()`
- `useTasks()`, `useTask()`, `useCreateTask()`, `useUpdateTask()`, `useDeleteTask()`
- `useWorkflows()`, `useWorkflow()`, `useCreateWorkflow()`, `useUpdateWorkflow()`, `useDeleteWorkflow()`
- `useNotifications()`, `useNotificationPreferences()`, `useMessageTemplates()`

### Partially Aligned Hooks (Backend exists but incomplete)
- `useLeadAnalytics()` - Missing advanced analytics endpoints
- `useWorkflowExecutions()` - Missing visual builder integration

### Missing Hooks (Backend exists, no frontend)
- AI/ML hooks (lead scoring, predictions, enrichment)
- Workflow builder hooks (nodes, edges, canvas)
- Advanced report hooks (custom reports, dashboards)
- Segmentation hooks (segment builder, rules)
- Auth hooks (login, register, session)
- RBAC hooks (roles, permissions)
- Calendar hooks (events, sync)
- Multi-channel messaging hooks (SMS, WhatsApp, push)

---

## 6. RECOMMENDED IMPLEMENTATION ORDER

```
SPRINT 1: Foundation
├── Auth Module (P0)
│   ├── Supabase Auth integration
│   ├── Login/Register pages
│   └── Protected route middleware
└── Session management

SPRINT 2: Core Enhancements
├── Lead Notes & Activity (P2)
├── Opportunity Reopen/Convert (P2)
└── Bulk Operations UI (P1)

SPRINT 3: Visual Builder
├── Workflow Builder UI (P1)
│   ├── React Flow integration
│   ├── Node palette
│   └── Edge connections
└── Workflow testing/preview

SPRINT 4: AI/ML Features
├── Lead Scoring Display (P1)
├── AI Suggestions Panel (P1)
└── Enrichment Status (P1)

SPRINT 5: Advanced Reports
├── Report Builder (P1)
├── Custom Dashboards (P1)
└── Export/Schedule (P1)

SPRINT 6: Communications
├── Unified Inbox (P1)
├── Multi-channel setup (P2)
└── Email tracking (P2)

SPRINT 7: Administration
├── RBAC Management (P1)
├── Team/Territory (P2)
└── Custom Fields (P1)
```

---

## 7. TECHNICAL DEBT ITEMS

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Mock auth to Supabase Auth | High | Medium | P0 |
| Add React Flow for workflows | High | High | P1 |
| Implement real-time with Supabase | Medium | Medium | P2 |
| Add chart library for analytics | Medium | Low | P2 |
| Implement drag-drop for Kanban | Low | Low | P3 |
| Add form validation improvements | Low | Low | P3 |

---

**BACKEND-FRONTEND ALIGNMENT MATRIX COMPLETADO**


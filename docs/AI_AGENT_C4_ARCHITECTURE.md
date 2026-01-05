# AI Agent Architecture - C4 Model

**Versión:** 1.0
**Fecha:** 2026-01-03
**Autor:** Staff Backend Engineer

Este documento describe la arquitectura del AI Agent usando el modelo C4 (Context, Container, Component, Code).

---

## 1. C4 Level 1: System Context Diagram

Muestra el sistema AI Agent y sus interacciones con usuarios y sistemas externos.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SYSTEM CONTEXT DIAGRAM                                │
│                           AI-Powered CRM Assistant                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌───────────────┐
                                    │  Sales Rep    │
                                    │   [Person]    │
                                    │               │
                                    │ Uses chat to  │
                                    │ manage leads, │
                                    │ tasks, opps   │
                                    └───────┬───────┘
                                            │
                                            │ Uses via Chat UI
                                            │
                    ┌───────────────────────▼───────────────────────┐
                    │                                               │
                    │           ZUCLUBIT SMART CRM                  │
                    │            [Software System]                  │
                    │                                               │
                    │  AI-powered CRM that allows users to          │
                    │  manage leads, opportunities, tasks,          │
                    │  and quotes via conversational chat           │
                    │                                               │
                    └─────────────────────┬─────────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
    ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
    │   LLM Provider  │       │    Supabase     │       │  Email/SMS      │
    │    [External]   │       │    [External]   │       │   [External]    │
    │                 │       │                 │       │                 │
    │  OpenAI/Gemini  │       │  PostgreSQL DB  │       │  Resend, Twilio │
    │  for NLU and    │       │  + Auth + Files │       │  for outbound   │
    │  generation     │       │                 │       │  communications │
    └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### PlantUML Version

```plantuml
@startuml C4_Context
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

LAYOUT_WITH_LEGEND()

title System Context Diagram - AI-Powered CRM Assistant

Person(salesRep, "Sales Representative", "Uses conversational AI to manage leads, tasks, and opportunities")
Person(manager, "Sales Manager", "Reviews team performance and pipeline via AI chat")

System(crmSystem, "Zuclubit Smart CRM", "AI-powered CRM that enables end-to-end sales management via conversational interface")

System_Ext(llmProvider, "LLM Provider", "OpenAI/Gemini - Natural language understanding and generation")
System_Ext(supabase, "Supabase", "PostgreSQL database, authentication, and file storage")
System_Ext(emailService, "Email Service", "Resend - Transactional emails and quotes")
System_Ext(smsService, "SMS/WhatsApp", "Twilio - SMS notifications and WhatsApp")

Rel(salesRep, crmSystem, "Manages sales via chat", "HTTPS/WebSocket")
Rel(manager, crmSystem, "Reviews pipeline via chat", "HTTPS/WebSocket")
Rel(crmSystem, llmProvider, "Processes natural language", "HTTPS/API")
Rel(crmSystem, supabase, "Stores data", "PostgreSQL")
Rel(crmSystem, emailService, "Sends emails", "HTTPS/API")
Rel(crmSystem, smsService, "Sends notifications", "HTTPS/API")

@enduml
```

---

## 2. C4 Level 2: Container Diagram

Muestra los containers (aplicaciones/servicios) que componen el sistema.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CONTAINER DIAGRAM                                     │
│                     Zuclubit Smart CRM - AI Agent Layer                          │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────────┐
    │                         FRONTEND LAYER                                │
    │  ┌─────────────────────┐  ┌─────────────────────┐                    │
    │  │    Web Application  │  │   Mobile App        │                    │
    │  │    [Next.js 14]     │  │   [React Native]    │                    │
    │  │                     │  │                     │                    │
    │  │  Chat UI, Dashboard │  │  Chat UI on mobile  │                    │
    │  └──────────┬──────────┘  └──────────┬──────────┘                    │
    │             │                        │                               │
    └─────────────┼────────────────────────┼───────────────────────────────┘
                  │ HTTPS/WSS              │ HTTPS/WSS
                  │                        │
    ┌─────────────▼────────────────────────▼───────────────────────────────┐
    │                         API GATEWAY LAYER                            │
    │                                                                      │
    │  ┌───────────────────────────────────────────────────────────────┐   │
    │  │                    Lead Service API                           │   │
    │  │                    [Fastify 4.29]                             │   │
    │  │                                                               │   │
    │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐  │   │
    │  │  │ REST Routes │ │ WebSocket   │ │    AI Chat Route        │  │   │
    │  │  │ /api/v1/*   │ │ Real-time   │ │    POST /api/v1/ai/chat │  │   │
    │  │  └─────────────┘ └─────────────┘ └────────────┬────────────┘  │   │
    │  │                                               │               │   │
    │  └───────────────────────────────────────────────┼───────────────┘   │
    │                                                  │                   │
    └──────────────────────────────────────────────────┼───────────────────┘
                                                       │
    ┌──────────────────────────────────────────────────▼───────────────────┐
    │                      AI AGENT LAYER (NEW)                            │
    │                                                                      │
    │  ┌──────────────────────────────────────────────────────────────┐    │
    │  │                   AI Agent Orchestrator                       │    │
    │  │                                                               │    │
    │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │    │
    │  │  │  Intent    │ │  Action    │ │  Tool      │ │  Response  │ │    │
    │  │  │ Classifier │ │  Planner   │ │  Executor  │ │  Generator │ │    │
    │  │  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └────────────┘ │    │
    │  │         │              │              │                       │    │
    │  │  ┌──────▼──────────────▼──────────────▼─────────────────┐    │    │
    │  │  │              Tool Registry                            │    │    │
    │  │  │  Lead Tools │ Task Tools │ Opp Tools │ Quote Tools    │    │    │
    │  │  └───────────────────────────────────────────────────────┘    │    │
    │  │                                                               │    │
    │  │  ┌─────────────────┐  ┌─────────────────┐                    │    │
    │  │  │  Confirmation   │  │   AI Audit      │                    │    │
    │  │  │  Gate (HITL)    │  │   Logger        │                    │    │
    │  │  └─────────────────┘  └─────────────────┘                    │    │
    │  │                                                               │    │
    │  └──────────────────────────────────────────────────────────────┘    │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘
                        │                              │
    ┌───────────────────▼──────────────────────────────▼───────────────────┐
    │                      APPLICATION LAYER (CQRS)                        │
    │                                                                      │
    │  ┌─────────────────────────────────────────────────────────────┐     │
    │  │   CommandBus          │    QueryBus     │   Event Publisher  │     │
    │  │                       │                 │                    │     │
    │  │   CreateLeadCommand   │  GetLeadQuery   │   LeadCreated      │     │
    │  │   UpdateLeadCommand   │  SearchLeads    │   LeadUpdated      │     │
    │  │   DeleteLeadCommand   │  GetPipeline    │   LeadDeleted      │     │
    │  │   ...                 │  ...            │   ...              │     │
    │  └─────────────────────────────────────────────────────────────┘     │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────▼──────────────────────────────────────┐
    │                      INFRASTRUCTURE LAYER                            │
    │                                                                      │
    │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
    │  │   Database   │ │    Cache     │ │   Events     │ │    Jobs      │ │
    │  │  PostgreSQL  │ │    Redis     │ │    NATS      │ │   BullMQ     │ │
    │  │  Drizzle ORM │ │              │ │  JetStream   │ │              │ │
    │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘
```

### PlantUML Version

```plantuml
@startuml C4_Container
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

LAYOUT_TOP_DOWN()
LAYOUT_WITH_LEGEND()

title Container Diagram - Zuclubit Smart CRM with AI Agent

Person(user, "CRM User", "Sales rep or manager")

System_Boundary(crmSystem, "Zuclubit Smart CRM") {
    Container(webApp, "Web Application", "Next.js 14", "Chat UI and CRM Dashboard")
    Container(mobileApp, "Mobile App", "React Native", "Mobile chat interface")

    Container(apiGateway, "Lead Service API", "Fastify 4.29", "REST API, WebSocket, AI Chat endpoint")

    Container(aiOrchestrator, "AI Agent Orchestrator", "TypeScript", "Processes chat messages, plans and executes actions")
    Container(toolRegistry, "Tool Registry", "TypeScript", "Registered tools for AI to execute CRM operations")
    Container(confirmationGate, "Confirmation Gate", "TypeScript", "Human-in-the-loop for critical actions")
    Container(aiAudit, "AI Audit Logger", "TypeScript", "Logs all AI actions for compliance")

    Container(commandBus, "Command Bus", "TypeScript/CQRS", "Handles mutations")
    Container(queryBus, "Query Bus", "TypeScript/CQRS", "Handles queries")

    ContainerDb(db, "Database", "PostgreSQL 16", "CRM data, users, tenants")
    ContainerDb(cache, "Cache", "Redis", "Session, context, rate limits")
    ContainerDb(events, "Event Bus", "NATS JetStream", "Async events")
}

System_Ext(llm, "LLM Provider", "OpenAI/Gemini")
System_Ext(supabase, "Supabase", "Auth & Storage")

Rel(user, webApp, "Uses", "HTTPS")
Rel(user, mobileApp, "Uses", "HTTPS")
Rel(webApp, apiGateway, "API calls", "HTTPS/WSS")
Rel(mobileApp, apiGateway, "API calls", "HTTPS/WSS")

Rel(apiGateway, aiOrchestrator, "Chat messages", "Internal")
Rel(aiOrchestrator, toolRegistry, "Get tools", "Internal")
Rel(aiOrchestrator, confirmationGate, "Request confirmation", "Internal")
Rel(aiOrchestrator, aiAudit, "Log actions", "Internal")
Rel(aiOrchestrator, llm, "NLU/Generation", "HTTPS")

Rel(toolRegistry, commandBus, "Execute commands", "Internal")
Rel(toolRegistry, queryBus, "Execute queries", "Internal")

Rel(commandBus, db, "Write", "SQL")
Rel(queryBus, db, "Read", "SQL")
Rel(commandBus, events, "Publish", "NATS")

Rel(aiOrchestrator, cache, "Store context", "Redis")
Rel(apiGateway, supabase, "Auth", "HTTPS")

@enduml
```

---

## 3. C4 Level 3: Component Diagram (AI Agent Layer)

Detalle de los componentes dentro del AI Agent Layer.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           COMPONENT DIAGRAM                                      │
│                        AI Agent Orchestrator Layer                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                           AI AGENT ORCHESTRATOR                                │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        AIAgentOrchestrator                              │  │
│  │                        [Main Entry Point]                               │  │
│  │                                                                         │  │
│  │  processMessage(input: AgentInput): Promise<AgentOutput>                │  │
│  │  processConfirmation(id, confirmed, user): Promise<AgentOutput>         │  │
│  │                                                                         │  │
│  └──────────────────────────────┬──────────────────────────────────────────┘  │
│                                 │                                              │
│      ┌──────────────────────────┼──────────────────────────┐                  │
│      │                          │                          │                  │
│      ▼                          ▼                          ▼                  │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐               │
│  │   Intent       │    │   Action       │    │   Response     │               │
│  │   Classifier   │    │   Planner      │    │   Generator    │               │
│  │                │    │                │    │                │               │
│  │ classify()     │    │ plan()         │    │ generate()     │               │
│  │                │    │ validate()     │    │ generateError()│               │
│  │ Uses LLM to    │    │ Creates action │    │ Formats output │               │
│  │ understand     │    │ plans from     │    │ for user       │               │
│  │ user intent    │    │ intents        │    │                │               │
│  └───────┬────────┘    └───────┬────────┘    └────────────────┘               │
│          │                     │                                               │
│          │                     ▼                                               │
│          │         ┌────────────────────────────────────────────────────┐     │
│          │         │               TOOL EXECUTION LAYER                  │     │
│          │         │                                                     │     │
│          │         │  ┌──────────────┐    ┌──────────────────────┐      │     │
│          │         │  │ Permission   │───▶│   Tool Executor      │      │     │
│          │         │  │ Validator    │    │                      │      │     │
│          │         │  │              │    │  execute(tool, params│      │     │
│          │         │  │ Checks RBAC  │    │  context)            │      │     │
│          │         │  │ before exec  │    │                      │      │     │
│          │         │  └──────────────┘    └───────────┬──────────┘      │     │
│          │         │                                  │                  │     │
│          │         │  ┌──────────────────────────────▼───────────────┐  │     │
│          │         │  │              Tool Registry                    │  │     │
│          │         │  │                                               │  │     │
│          │         │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐         │  │     │
│          │         │  │  │ Lead    │ │ Task    │ │Opportun-│         │  │     │
│          │         │  │  │ Tools   │ │ Tools   │ │ity Tools│         │  │     │
│          │         │  │  │         │ │         │ │         │         │  │     │
│          │         │  │  │-create  │ │-create  │ │-create  │         │  │     │
│          │         │  │  │-update  │ │-update  │ │-update  │         │  │     │
│          │         │  │  │-delete  │ │-complete│ │-win/lose│         │  │     │
│          │         │  │  │-search  │ │-assign  │ │-pipeline│         │  │     │
│          │         │  │  │-qualify │ │-search  │ │-search  │         │  │     │
│          │         │  │  └─────────┘ └─────────┘ └─────────┘         │  │     │
│          │         │  │                                               │  │     │
│          │         │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐         │  │     │
│          │         │  │  │ Quote   │ │ Search  │ │Analytics│         │  │     │
│          │         │  │  │ Tools   │ │ Tools   │ │ Tools   │         │  │     │
│          │         │  │  │         │ │         │ │         │         │  │     │
│          │         │  │  │-create  │ │-global  │ │-dashbrd │         │  │     │
│          │         │  │  │-send    │ │-filter  │ │-pipeline│         │  │     │
│          │         │  │  │-accept  │ │-entity  │ │-forecast│         │  │     │
│          │         │  │  └─────────┘ └─────────┘ └─────────┘         │  │     │
│          │         │  │                                               │  │     │
│          │         │  └───────────────────────────────────────────────┘  │     │
│          │         │                                                     │     │
│          │         └─────────────────────────────────────────────────────┘     │
│          │                                                                      │
│          └──────────────────────────────────────────────────────────────────┐  │
│                                                                              │  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │  │
│  │                     SUPPORT COMPONENTS                                 │  │  │
│  │                                                                        │  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │  │  │
│  │  │  Context        │  │  Confirmation   │  │   AI Audit      │        │  │  │
│  │  │  Manager        │  │  Gate           │  │   Logger        │        │  │  │
│  │  │                 │  │                 │  │                 │        │  │  │
│  │  │ Manages conver- │  │ Human-in-the-  │  │ Logs all AI     │        │  │  │
│  │  │ sation state    │  │ loop confirms  │  │ actions for     │        │  │  │
│  │  │ in Redis        │  │ for critical   │  │ audit/compliance│        │  │  │
│  │  │                 │  │ actions        │  │                 │        │  │  │
│  │  └────────┬────────┘  └────────┬───────┘  └────────┬────────┘        │  │  │
│  │           │                    │                   │                  │  │  │
│  │           ▼                    ▼                   ▼                  │  │  │
│  │        Redis              PostgreSQL          PostgreSQL              │  │  │
│  │   (context store)    (confirmations)      (ai_audit_logs)            │  │  │
│  │                                                                        │  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │  │
│                                                                              │  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Dependencies |
|-----------|---------------|--------------|
| **AIAgentOrchestrator** | Main entry point. Coordinates the entire AI processing pipeline. | IntentClassifier, ActionPlanner, ToolExecutor, ResponseGenerator |
| **IntentClassifier** | Uses LLM to understand user intent, extract entities and parameters. | LLM Provider, Context Manager |
| **ActionPlanner** | Creates execution plans from classified intents. Determines tool sequence. | Tool Registry, Confirmation Gate |
| **ToolExecutor** | Executes tools with permission validation and error handling. | Tool Registry, Permission Validator, AI Audit Logger |
| **ToolRegistry** | Maintains registry of available tools with their schemas and permissions. | None |
| **ResponseGenerator** | Formats execution results into user-friendly messages. | LLM Provider |
| **ContextManager** | Manages conversation state and entity references. | Redis |
| **ConfirmationGate** | Handles human-in-the-loop confirmations for critical actions. | PostgreSQL |
| **AIAuditLogger** | Logs all AI actions for compliance and debugging. | PostgreSQL |
| **PermissionValidator** | Validates user permissions before tool execution. | Auth Service |

---

## 4. C4 Level 4: Code Diagram (Key Interfaces)

Muestra las interfaces principales del código.

```typescript
// Core Orchestrator Interface
interface IAIAgentOrchestrator {
  processMessage(input: AgentInput): Promise<AgentOutput>;
  processConfirmation(id: string, confirmed: boolean, user: AIUserContext): Promise<AgentOutput>;
  getConversationHistory(conversationId: string, user: AIUserContext): Promise<AIMessage[]>;
  clearConversation(conversationId: string, user: AIUserContext): Promise<void>;
}

// Intent Classifier Interface
interface IIntentClassifier {
  classify(message: string, context: AIConversationContext): Promise<ClassifiedIntent>;
}

// Action Planner Interface
interface IActionPlanner {
  plan(intent: ClassifiedIntent, context: AIConversationContext): Promise<ActionPlan>;
  validate(plan: ActionPlan, context: AIConversationContext): Promise<{ valid: boolean; errors: string[] }>;
}

// Tool Registry Interface
interface IToolRegistry {
  register(tool: Tool, options?: ToolRegistrationOptions): void;
  get(name: string): Tool | undefined;
  getAccessibleTools(user: AIUserContext): Tool[];
  canExecute(toolName: string, user: AIUserContext): boolean;
}

// Tool Executor Interface
interface IToolExecutor {
  execute(toolName: string, params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionResult>;
  validateParameters(toolName: string, params: Record<string, unknown>): AIResult<Record<string, unknown>>;
  checkPermission(toolName: string, user: AIUserContext): AIResult<void>;
}

// Confirmation Gate Interface
interface IConfirmationGate {
  requiresConfirmation(action: PlannedAction, user: AIUserContext): Promise<boolean>;
  createRequest(action: PlannedAction, user: AIUserContext, conversationId: string): Promise<ConfirmationRequest>;
  processResponse(response: ConfirmationResponse, user: AIUserContext): Promise<ConfirmationResult>;
}

// AI Audit Logger Interface
interface IAIAuditLogger {
  logActionExecuted(conversationId: string, requestId: string, action: ExecutedAction, user: AIUserContext): Promise<void>;
  logError(conversationId: string, requestId: string, error: Error, context?: Record<string, unknown>): Promise<void>;
  getConversationLogs(conversationId: string): Promise<AIAuditLog[]>;
  generateActivityReport(tenantId: string, startDate: Date, endDate: Date): Promise<AIActivityReport>;
}
```

---

## 5. Sequence Diagram: AI Chat Request Flow

```
┌──────┐ ┌─────────┐ ┌────────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ ┌───────┐
│ User │ │ Web App │ │ API Gateway│ │Orchestr │ │Intent  │ │Planner   │ │Executor │ │ Audit │
└──┬───┘ └────┬────┘ └─────┬──────┘ └────┬────┘ └───┬────┘ └────┬─────┘ └────┬────┘ └───┬───┘
   │          │            │             │          │           │            │          │
   │ "Create  │            │             │          │           │            │          │
   │  a lead" │            │             │          │           │            │          │
   ├─────────▶│            │             │          │           │            │          │
   │          │ POST       │             │          │           │            │          │
   │          │ /ai/chat   │             │          │           │            │          │
   │          ├───────────▶│             │          │           │            │          │
   │          │            │ process     │          │           │            │          │
   │          │            │ Message()   │          │           │            │          │
   │          │            ├────────────▶│          │           │            │          │
   │          │            │             │ classify │           │            │          │
   │          │            │             │ Intent() │           │            │          │
   │          │            │             ├─────────▶│           │            │          │
   │          │            │             │          │ (LLM)     │            │          │
   │          │            │             │          ├─────────┐ │            │          │
   │          │            │             │          │         │ │            │          │
   │          │            │             │◀─────────┤◀────────┘ │            │          │
   │          │            │             │ Intent:  │           │            │          │
   │          │            │             │ CREATE   │           │            │          │
   │          │            │             │ LEAD     │           │            │          │
   │          │            │             │          │           │            │          │
   │          │            │             │ plan()   │           │            │          │
   │          │            │             ├──────────┼──────────▶│            │          │
   │          │            │             │          │           │ ActionPlan │          │
   │          │            │             │◀─────────┼───────────┤            │          │
   │          │            │             │          │           │            │          │
   │          │            │             │ execute()│           │            │          │
   │          │            │             ├──────────┼───────────┼───────────▶│          │
   │          │            │             │          │           │            │ log()    │
   │          │            │             │          │           │            ├─────────▶│
   │          │            │             │          │           │ Result     │          │
   │          │            │             │◀─────────┼───────────┼────────────┤          │
   │          │            │             │          │           │            │          │
   │          │            │             │ generate │           │            │          │
   │          │            │             │ Response │           │            │          │
   │          │            │             ├────────┐ │           │            │          │
   │          │            │             │        │ │           │            │          │
   │          │            │◀────────────┤◀───────┘ │           │            │          │
   │          │◀───────────┤ AgentOutput │          │           │            │          │
   │◀─────────┤            │             │          │           │            │          │
   │ "Lead    │            │             │          │           │            │          │
   │  created │            │             │          │           │            │          │
   │  success"│            │             │          │           │            │          │
   │          │            │             │          │           │            │          │
```

---

## 6. Deployment View

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DEPLOYMENT DIAGRAM                                    │
│                           Production Environment                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────────────────────┐
    │                          CLOUDFLARE                                        │
    │                                                                           │
    │  ┌─────────────────────────────────────────────────────────────────────┐  │
    │  │                    Cloudflare Pages                                  │  │
    │  │                    (crm.zuclubit.com)                               │  │
    │  │                                                                      │  │
    │  │                    Next.js Web App                                   │  │
    │  │                    - Chat UI                                         │  │
    │  │                    - Dashboard                                       │  │
    │  └─────────────────────────────────────────────────────────────────────┘  │
    │                                                                           │
    └───────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTPS
                                        │
    ┌───────────────────────────────────▼───────────────────────────────────────┐
    │                            FLY.IO                                         │
    │                                                                           │
    │  ┌─────────────────────────────────────────────────────────────────────┐  │
    │  │                    Lead Service                                      │  │
    │  │              (zuclubit-lead-service.fly.dev)                        │  │
    │  │                                                                      │  │
    │  │   ┌───────────────────────────────────────────────────────────┐     │  │
    │  │   │                 Fastify Application                        │     │  │
    │  │   │                                                            │     │  │
    │  │   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │     │  │
    │  │   │  │ REST Routes  │  │ WebSocket    │  │ AI Agent     │     │     │  │
    │  │   │  │              │  │ Server       │  │ Orchestrator │     │     │  │
    │  │   │  └──────────────┘  └──────────────┘  └──────────────┘     │     │  │
    │  │   │                                                            │     │  │
    │  │   └───────────────────────────────────────────────────────────┘     │  │
    │  │                                                                      │  │
    │  └─────────────────────────────────────────────────────────────────────┘  │
    │                                                                           │
    └───────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    │                               │
    ┌───────────────▼───────────────┐   ┌──────────▼───────────────────────────┐
    │         SUPABASE              │   │         EXTERNAL SERVICES            │
    │                               │   │                                      │
    │  ┌─────────────────────────┐  │   │  ┌──────────────┐ ┌──────────────┐   │
    │  │    PostgreSQL 16        │  │   │  │   OpenAI     │ │   Resend     │   │
    │  │    - CRM Data           │  │   │  │   API        │ │   Email      │   │
    │  │    - AI Audit Logs      │  │   │  └──────────────┘ └──────────────┘   │
    │  │    - Confirmations      │  │   │                                      │
    │  └─────────────────────────┘  │   │  ┌──────────────┐ ┌──────────────┐   │
    │                               │   │  │   Gemini     │ │   Twilio     │   │
    │  ┌─────────────────────────┐  │   │  │   API        │ │   SMS        │   │
    │  │    Auth                 │  │   │  └──────────────┘ └──────────────┘   │
    │  │    - JWT tokens         │  │   │                                      │
    │  │    - User sessions      │  │   └──────────────────────────────────────┘
    │  └─────────────────────────┘  │
    │                               │
    │  ┌─────────────────────────┐  │
    │  │    Storage              │  │
    │  │    - File uploads       │  │
    │  │    - Logos              │  │
    │  └─────────────────────────┘  │
    │                               │
    └───────────────────────────────┘
```

---

## 7. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW DIAGRAM                                     │
│                          AI Agent Data Processing                                │
└─────────────────────────────────────────────────────────────────────────────────┘

    User Message                    LLM Processing                   Tool Execution
    ─────────────                   ──────────────                   ──────────────
         │                               │                                │
         ▼                               │                                │
    ┌─────────────┐                      │                                │
    │ Input:      │                      │                                │
    │ "Crea un    │                      │                                │
    │  lead para  │                      │                                │
    │  Acme Corp" │                      │                                │
    └──────┬──────┘                      │                                │
           │                             │                                │
           ▼                             ▼                                │
    ┌─────────────┐              ┌─────────────┐                          │
    │ AgentInput  │─────────────▶│ Intent      │                          │
    │             │              │ Classifier  │                          │
    │ - message   │              │             │                          │
    │ - userId    │              │ Uses LLM to │                          │
    │ - tenantId  │              │ parse intent│                          │
    │ - context   │              └──────┬──────┘                          │
    └─────────────┘                     │                                 │
                                        ▼                                 │
                                 ┌─────────────┐                          │
                                 │ Classified  │                          │
                                 │ Intent      │                          │
                                 │             │                          │
                                 │ type: action│                          │
                                 │ entity: lead│                          │
                                 │ op: create  │                          │
                                 │ params: {   │                          │
                                 │   company:  │                          │
                                 │   "Acme"    │                          │
                                 │ }           │                          │
                                 └──────┬──────┘                          │
                                        │                                 │
                                        ▼                                 │
                                 ┌─────────────┐                          │
                                 │ Action      │                          │
                                 │ Planner     │                          │
                                 │             │                          │
                                 │ Creates plan│                          │
                                 │ with tools  │                          │
                                 └──────┬──────┘                          │
                                        │                                 │
                                        ▼                                 ▼
                                 ┌─────────────┐              ┌─────────────────┐
                                 │ ActionPlan  │──────────────▶│ Tool Executor   │
                                 │             │              │                 │
                                 │ [           │              │ 1. Check perms  │
                                 │   {         │              │ 2. Validate     │
                                 │     tool:   │              │ 3. Execute      │
                                 │     "lead.  │              │ 4. Log action   │
                                 │      create"│              │                 │
                                 │     params: │              └────────┬────────┘
                                 │     {...}   │                       │
                                 │   }         │                       ▼
                                 │ ]           │              ┌─────────────────┐
                                 └─────────────┘              │ CommandBus      │
                                                              │                 │
                                                              │ CreateLead      │
                                                              │ Command         │
                                                              └────────┬────────┘
                                                                       │
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │ PostgreSQL      │
                                                              │                 │
                                                              │ INSERT INTO     │
                                                              │ leads (...)     │
                                                              └────────┬────────┘
                                                                       │
                                        ┌──────────────────────────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ Execution   │
                                 │ Result      │
                                 │             │
                                 │ - status:   │
                                 │   success   │
                                 │ - leadId:   │
                                 │   "abc123"  │
                                 │ - data: {}  │
                                 └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ Response    │
                                 │ Generator   │
                                 │             │
                                 │ Formats     │
                                 │ result for  │
                                 │ user        │
                                 └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ AgentOutput │
                                 │             │
                                 │ "¡Listo!    │
                                 │  He creado  │
                                 │  el lead    │
                                 │  Acme Corp" │
                                 └─────────────┘
```

---

## 8. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, React, Tailwind | Chat UI, Dashboard |
| **API Gateway** | Fastify 4.29 | REST, WebSocket, AI Chat endpoint |
| **AI Orchestration** | TypeScript, Custom Framework | Intent → Plan → Execute → Respond |
| **LLM** | OpenAI GPT-4, Google Gemini | Natural language understanding |
| **Application** | TypeScript, CQRS | Commands, Queries, Events |
| **Database** | PostgreSQL 16, Drizzle ORM | CRM data, Audit logs |
| **Cache** | Redis | Conversation context, Rate limits |
| **Events** | NATS JetStream | Async event processing |
| **Jobs** | BullMQ | Background job processing |
| **Hosting** | Cloudflare Pages, Fly.io | Frontend CDN, Backend containers |
| **Auth** | Supabase Auth + Custom JWT | Authentication, Authorization |

---

## Next Steps

1. **Implementation Priority:**
   - AG-01: AIAgentOrchestrator Core
   - TR-01: Tool Registry
   - AG-02: Intent Classifier

2. **Integration Points:**
   - Connect to existing CQRS CommandBus/QueryBus
   - Integrate with existing auth middleware
   - Connect to existing AI Service for LLM calls

3. **Testing Strategy:**
   - Unit tests for each component
   - Integration tests for full flow
   - E2E tests with mock LLM responses

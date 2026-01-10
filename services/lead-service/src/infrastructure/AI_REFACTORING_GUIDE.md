# AI Refactoring Guide

## Objetivo
Eliminar TODA la lógica de AI/LLM directa del CRM. El CRM debe ser **AI-agnostic** y delegar toda la inteligencia al **Bot Management System**.

## Principios
1. **CRM no conoce proveedores de AI** (OpenAI, Anthropic, Gemini, etc.)
2. **CRM no contiene prompts** - Todos los prompts viven en Bot Management System
3. **CRM no hace routing de modelos** - Bot Management System decide
4. **CRM no gestiona memoria conversacional** - Bot Management System lo hace
5. **CRM solo conoce contratos** (`BotAgentRequest`, `BotAgentResponse`, etc.)

---

## Archivos Creados (NUEVA ARQUITECTURA)

### Bot Gateway (Interface limpio hacia Bot Management System)
```
infrastructure/bot-gateway/
├── types.ts              # Contratos limpios: BotAgentRequest, BotAgentResponse, etc.
├── bot-gateway.ts        # Implementación del gateway con HMAC auth
└── index.ts              # Exports del módulo
```

### AI Service Refactorizado
```
infrastructure/ai/
├── ai.service.refactored.ts      # Thin wrapper sobre BotGateway
└── index.refactored.ts           # Exports limpios
```

### Routes Refactorizadas
```
presentation/routes/
└── ai-stream.routes.refactored.ts    # SSE proxy a Bot Management System
```

---

## Archivos a ELIMINAR (VIOLACIONES)

### CRÍTICOS - Eliminar Inmediatamente
| Archivo | Razón | Líneas |
|---------|-------|--------|
| `infrastructure/ai/openai.provider.ts` | SDK directo OpenAI | 271 |
| `infrastructure/ai/gemini.provider.ts` | SDK directo Gemini | 344 |
| `infrastructure/ai/streaming/openai-stream.adapter.ts` | Streaming directo OpenAI | 354 |

### REEMPLAZAR - Usar versión refactorizada
| Archivo Viejo | Archivo Nuevo |
|---------------|---------------|
| `infrastructure/ai/ai.service.ts` | `infrastructure/ai/ai.service.refactored.ts` |
| `infrastructure/ai/index.ts` | `infrastructure/ai/index.refactored.ts` |
| `presentation/routes/ai-stream.routes.ts` | `presentation/routes/ai-stream.routes.refactored.ts` |

### A MIGRAR - Requieren trabajo adicional
| Archivo | Problema | Solución |
|---------|----------|----------|
| `infrastructure/ai-agent/orchestrator/intent-classifier.ts` | Prompts hardcodeados | Mover clasificación a Bot Management System |
| `infrastructure/ai-agent/orchestrator/action-planner.ts` | Prompts hardcodeados | Mover planificación a Bot Management System |
| `infrastructure/ai-agent/orchestrator/response-generator.ts` | Prompts hardcodeados | Mover generación a Bot Management System |

---

## Estrategia de Migración para AI-Agent

El AI-Agent orchestrator actualmente usa `AIService` para hacer llamadas LLM con prompts hardcodeados. Hay dos opciones:

### Opción A: Migrar completamente a Bot Management System (RECOMENDADO)
1. Mover toda la lógica del orquestador al Bot Management System
2. El CRM solo envía `BotAgentRequest` y recibe `BotAgentResponse`
3. El AI-Agent en CRM se convierte en thin proxy

```typescript
// Antes (VIOLACIÓN)
const intent = await this.intentClassifier.classify(message, context, user);
const plan = await this.actionPlanner.plan(intent, context, user);
const result = await this.toolExecutor.execute(plan);
const response = await this.responseGenerator.generate(result, context, user);

// Después (CORRECTO)
const response = await this.botGateway.processAgentRequest({
  message,
  conversationId,
  user,
  metadata: { currentView: context.metadata?.currentView }
});
```

### Opción B: Mantener orquestación local, delegar LLM
1. Mantener IntentClassifier, ActionPlanner, ResponseGenerator
2. Reemplazar llamadas a `AIService.chat()` por endpoints específicos en Bot Management System
3. Menos cambios pero sigue habiendo lógica distribuida

**Recomendación**: Opción A para arquitectura limpia.

---

## Pasos de Migración

### Paso 1: Activar nuevos archivos
```bash
# Renombrar archivos refactorizados
mv infrastructure/ai/ai.service.refactored.ts infrastructure/ai/ai.service.ts
mv infrastructure/ai/index.refactored.ts infrastructure/ai/index.ts
mv presentation/routes/ai-stream.routes.refactored.ts presentation/routes/ai-stream.routes.ts
```

### Paso 2: Eliminar providers directos
```bash
rm infrastructure/ai/openai.provider.ts
rm infrastructure/ai/gemini.provider.ts
rm infrastructure/ai/streaming/openai-stream.adapter.ts
rm infrastructure/ai/bot-helper.provider.ts  # Reemplazado por BotGateway
```

### Paso 3: Eliminar types obsoletos
Revisar `infrastructure/ai/types.ts` y eliminar:
- `IAIProvider`
- `AIProvider` (type union con 'openai' | 'gemini')
- Cualquier tipo relacionado con providers directos

### Paso 4: Actualizar imports en todo el proyecto
```bash
# Buscar y reemplazar imports
grep -r "from.*infrastructure/ai/openai.provider" --include="*.ts"
grep -r "from.*infrastructure/ai/gemini.provider" --include="*.ts"
grep -r "from.*infrastructure/ai/bot-helper.provider" --include="*.ts"
```

### Paso 5: Actualizar AI-Agent orchestrator
1. Cambiar inyección de `AIService` por `BotGateway`
2. Reemplazar llamadas internas por llamadas a Bot Management System
3. O bien, delegar todo el procesamiento al Bot Management System

### Paso 6: Actualizar DI container
```typescript
// Antes
container.register('AIService', { useClass: AIService });

// Después
container.register('BotGateway', { useFactory: () => getBotGateway() });
container.register('AIService', { useClass: AIService }); // Thin wrapper
```

### Paso 7: Actualizar environment config
```typescript
// config/environment.ts - getBotHelperConfig()
// Ya está correcto, solo asegurar que las variables estén configuradas
export function getBotHelperConfig() {
  return {
    isEnabled: !!process.env.BOT_HELPER_API_URL,
    apiUrl: process.env.BOT_HELPER_API_URL || '',
    sharedSecret: process.env.BOT_HELPER_SHARED_SECRET || '',
    timeout: parseInt(process.env.BOT_HELPER_TIMEOUT || '30000', 10),
    // NO hay preferredProvider ni preferredModel - Bot Management System decide
  };
}
```

---

## Validación Post-Migración

### Checklist
- [ ] No hay imports de `openai`, `@google/generative-ai`, `@anthropic-ai/sdk`
- [ ] No hay archivos `*.provider.ts` (excepto BotGateway)
- [ ] No hay prompts hardcodeados en el backend del CRM
- [ ] No hay referencias a modelos específicos (`gpt-4`, `claude-3`, etc.)
- [ ] No hay manejo de API keys de proveedores de AI
- [ ] `AIService` solo usa `BotGateway` internamente
- [ ] Streaming funciona via proxy a Bot Management System

### Comando de Verificación
```bash
# Buscar violaciones
grep -r "OPENAI_API_KEY\|GEMINI_API_KEY\|ANTHROPIC_API_KEY" --include="*.ts"
grep -r "gpt-4\|claude-3\|gemini" --include="*.ts" | grep -v "test\|spec"
grep -r "prompt.*=.*\`" --include="*.ts" | grep -v "test\|spec" | head -20
```

---

## Arquitectura Final

```
┌─────────────────────────────────────────────────────────────────┐
│                         CRM Backend                              │
│                                                                  │
│  ┌────────────────┐    ┌────────────────┐    ┌───────────────┐ │
│  │  Presentation  │───▶│   Application  │───▶│Infrastructure │ │
│  │    (Routes)    │    │   (Use Cases)  │    │   (Gateway)   │ │
│  └────────────────┘    └────────────────┘    └───────────────┘ │
│          │                                           │          │
│          └───────────────────────────────────────────┘          │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │   BotGateway    │ ◀── ÚNICO PUNTO DE       │
│                    │  (HMAC Auth)    │     CONTACTO CON AI      │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS + HMAC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bot Management System                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Prompts    │  │   Provider   │  │  Memory/Context      │  │
│  │  Templates   │  │   Routing    │  │  Management          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   OpenAI     │  │  Anthropic   │  │  Groq/Gemini/etc.    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## FAQ

### ¿Qué pasa con los prompts existentes?
Deben migrarse al Bot Management System. El CRM no debe contener ningún prompt.

### ¿Y el knowledge base con embeddings?
Los embeddings deben generarse en el Bot Management System. El CRM puede almacenar vectores pero no debe generarlos.

### ¿Qué pasa con el cálculo de costos?
El Bot Management System maneja el tracking de costos. El CRM solo registra que hubo una llamada.

### ¿Y si necesito un modelo específico para cierta operación?
Eso se configura en el Bot Management System, no en el CRM. El CRM solo dice "necesito scoring de leads" y Bot Management System decide qué modelo usar.

import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import { createServer, ServerConfig } from './src/presentation/server';
import { errorHandler } from './src/presentation/middlewares/error-handler.middleware';
import { leadRoutes } from './src/presentation/routes/lead.routes';

/**
 * Script de prueba para verificar endpoints sin base de datos
 *
 * Este script verifica:
 * - Registro correcto de rutas
 * - Middlewares (correlation ID, logging, error handling)
 * - Validación con Zod
 * - Estructura de responses
 */

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  message: string;
  correlationId?: string;
  body?: any;
  error?: string;
}

const results: TestResult[] = [];

async function setupTestServer(): Promise<FastifyInstance> {
  console.log('🚀 Configurando servidor de pruebas...\n');

  const serverConfig: ServerConfig = {
    port: 0,
    host: '127.0.0.1',
    corsOrigins: ['http://localhost:3000'],
    rateLimitMax: 1000,
    rateLimitTimeWindow: '1 minute',
  };

  const server = await createServer(serverConfig);
  server.setErrorHandler(errorHandler);

  // Register routes
  await server.register(leadRoutes, { prefix: '/api/v1/leads' });

  await server.ready();

  console.log('✅ Servidor de pruebas configurado\n');
  console.log('📋 RUTAS REGISTRADAS:');
  console.log('='.repeat(60));

  // Print all registered routes
  server.printRoutes();
  console.log('='.repeat(60));
  console.log('\n');

  return server;
}

async function testEndpoint(
  server: FastifyInstance,
  method: string,
  url: string,
  payload?: any,
  description?: string
): Promise<TestResult> {
  try {
    const injectOptions: any = {
      method,
      url,
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': 'test-' + Date.now(),
      },
    };

    if (payload) {
      injectOptions.payload = JSON.stringify(payload);
    }

    const response = await server.inject(injectOptions);

    const body = response.body ? JSON.parse(response.body) : null;
    const correlationId = (response.headers as any)['x-correlation-id'];

    const result: TestResult = {
      endpoint: url,
      method,
      status: response.statusCode,
      success: response.statusCode < 400,
      message: description || `${method} ${url}`,
      correlationId: correlationId as string,
      body,
    };

    results.push(result);
    return result;
  } catch (error: any) {
    const result: TestResult = {
      endpoint: url,
      method,
      status: 500,
      success: false,
      message: description || `${method} ${url}`,
      error: error.message,
    };

    results.push(result);
    return result;
  }
}

function printResult(result: TestResult) {
  const icon = result.success ? '✅' : '❌';
  console.log(`${icon} ${result.method.padEnd(6)} ${result.endpoint}`);
  console.log(`   Status: ${result.status}`);
  if (result.correlationId) {
    console.log(`   Correlation ID: ${result.correlationId}`);
  }
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  if (result.body && !result.success) {
    console.log(`   Response:`, JSON.stringify(result.body, null, 2).substring(0, 200));
  }
  console.log('');
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));

  const total = results.length;
  const passed = results.filter((r) => r.success).length;
  const failed = total - passed;

  console.log(`\nTotal: ${total} pruebas`);
  console.log(`✅ Pasaron: ${passed}`);
  console.log(`❌ Fallaron: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ PRUEBAS FALLIDAS:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.method} ${r.endpoint}: ${r.status} ${r.body?.message || r.error}`);
      });
  }

  console.log('\n' + '='.repeat(60));
}

async function runTests() {
  console.log('\n🧪 INICIANDO PRUEBAS DE ENDPOINTS\n');

  const server = await setupTestServer();

  console.log('📡 FASE 1: HEALTH ENDPOINTS');
  console.log('-'.repeat(60));

  let result = await testEndpoint(server, 'GET', '/health', undefined, 'Health check');
  printResult(result);

  result = await testEndpoint(server, 'GET', '/ready', undefined, 'Readiness check');
  printResult(result);

  console.log('\n📡 FASE 2: VALIDACIÓN DE SCHEMAS');
  console.log('-'.repeat(60));

  // Test POST /api/v1/leads - Missing required fields
  result = await testEndpoint(
    server,
    'POST',
    '/api/v1/leads',
    {
      companyName: 'Test Company',
    },
    'POST /api/v1/leads - Campos faltantes (debe fallar)'
  );
  printResult(result);

  // Test POST /api/v1/leads - Invalid email
  result = await testEndpoint(
    server,
    'POST',
    '/api/v1/leads',
    {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      companyName: 'Test Company',
      email: 'invalid-email',
      source: 'Website',
    },
    'POST /api/v1/leads - Email inválido (debe fallar)'
  );
  printResult(result);

  // Test POST /api/v1/leads - Invalid UUID
  result = await testEndpoint(
    server,
    'POST',
    '/api/v1/leads',
    {
      tenantId: 'not-a-uuid',
      companyName: 'Test Company',
      email: 'test@example.com',
      source: 'Website',
    },
    'POST /api/v1/leads - UUID inválido (debe fallar)'
  );
  printResult(result);

  // Test GET /api/v1/leads - Query parameter validation
  result = await testEndpoint(
    server,
    'GET',
    '/api/v1/leads?page=abc',
    undefined,
    'GET /api/v1/leads - Parámetro page inválido (debe fallar)'
  );
  printResult(result);

  // Test GET /api/v1/leads - Valid query parameters (sin DB, esperamos error 500 o 404)
  result = await testEndpoint(
    server,
    'GET',
    '/api/v1/leads?page=1&limit=10&status=new',
    undefined,
    'GET /api/v1/leads - Parámetros válidos (fallará por falta de DB)'
  );
  printResult(result);

  // Test GET /api/v1/leads/:id - Invalid UUID
  result = await testEndpoint(
    server,
    'GET',
    '/api/v1/leads/invalid-uuid',
    undefined,
    'GET /api/v1/leads/:id - UUID inválido (debe fallar)'
  );
  printResult(result);

  console.log('\n📡 FASE 3: MIDDLEWARES');
  console.log('-'.repeat(60));

  // Test Correlation ID preservation
  const correlationId = 'custom-correlation-123';
  const responseWithCorrelation = await server.inject({
    method: 'GET',
    url: '/health',
    headers: {
      'x-correlation-id': correlationId,
    },
  } as any);

  const preservedCorrelationId = (responseWithCorrelation.headers as any)['x-correlation-id'];
  const correlationPreserved = preservedCorrelationId === correlationId;

  console.log(`${correlationPreserved ? '✅' : '❌'} Correlation ID Preservation`);
  console.log(`   Enviado: ${correlationId}`);
  console.log(`   Recibido: ${preservedCorrelationId}`);
  console.log(`   Match: ${correlationPreserved}`);
  console.log('');

  // Test Error Handler
  result = await testEndpoint(
    server,
    'GET',
    '/api/v1/leads/nonexistent-route-12345',
    undefined,
    'Ruta inexistente (error handler)'
  );
  printResult(result);

  console.log('\n📡 FASE 4: ESTRUCTURA DE ENDPOINTS (sin DB - solo validación)');
  console.log('-'.repeat(60));

  // Test all PATCH endpoints structure
  result = await testEndpoint(
    server,
    'PATCH',
    '/api/v1/leads/123e4567-e89b-12d3-a456-426614174000',
    { companyName: 'Updated' },
    'PATCH /api/v1/leads/:id - Estructura válida (fallará por DB)'
  );
  printResult(result);

  result = await testEndpoint(
    server,
    'PATCH',
    '/api/v1/leads/123e4567-e89b-12d3-a456-426614174000/status',
    { status: 'contacted', reason: 'Test reason' },
    'PATCH /api/v1/leads/:id/status - Estructura válida (fallará por DB)'
  );
  printResult(result);

  result = await testEndpoint(
    server,
    'PATCH',
    '/api/v1/leads/123e4567-e89b-12d3-a456-426614174000/score',
    { score: 75, reason: 'High engagement' },
    'PATCH /api/v1/leads/:id/score - Estructura válida (fallará por DB)'
  );
  printResult(result);

  // Test POST endpoints structure
  result = await testEndpoint(
    server,
    'POST',
    '/api/v1/leads/123e4567-e89b-12d3-a456-426614174000/assign',
    { assignedTo: '987e6543-e21b-12d3-a456-426614174999' },
    'POST /api/v1/leads/:id/assign - Estructura válida (fallará por DB)'
  );
  printResult(result);

  result = await testEndpoint(
    server,
    'POST',
    '/api/v1/leads/123e4567-e89b-12d3-a456-426614174000/qualify',
    { qualifiedBy: '987e6543-e21b-12d3-a456-426614174999' },
    'POST /api/v1/leads/:id/qualify - Estructura válida (fallará por DB)'
  );
  printResult(result);

  result = await testEndpoint(
    server,
    'POST',
    '/api/v1/leads/123e4567-e89b-12d3-a456-426614174000/follow-up',
    { scheduledAt: '2025-11-20T10:00:00.000Z', notes: 'Test follow up' },
    'POST /api/v1/leads/:id/follow-up - Estructura válida (fallará por DB)'
  );
  printResult(result);

  // Test stats endpoints
  result = await testEndpoint(
    server,
    'GET',
    '/api/v1/leads/stats/overview',
    undefined,
    'GET /api/v1/leads/stats/overview - (fallará por DB)'
  );
  printResult(result);

  result = await testEndpoint(
    server,
    'GET',
    '/api/v1/leads/follow-ups/overdue',
    undefined,
    'GET /api/v1/leads/follow-ups/overdue - (fallará por DB)'
  );
  printResult(result);

  // Cleanup
  await server.close();

  // Print summary
  printSummary();

  // Return exit code based on critical failures
  // Validations should fail (400), endpoints without DB should fail (500/404)
  // But structure and middleware tests should pass
  const criticalFailures = results.filter(
    (r) => !r.success && r.endpoint.includes('health') || r.endpoint.includes('ready')
  );

  if (criticalFailures.length > 0) {
    console.log('\n❌ PRUEBAS CRÍTICAS FALLARON - Health endpoints no funcionan');
    process.exit(1);
  } else {
    console.log('\n✅ ESTRUCTURA BÁSICA FUNCIONA CORRECTAMENTE');
    console.log('💡 Para pruebas completas, configurar PostgreSQL y ejecutar tests de integración');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Error ejecutando pruebas:', error);
  process.exit(1);
});

import Fastify from 'fastify';
import { correlationIdMiddleware } from './src/presentation/middlewares/correlation-id.middleware';
import {
  createLeadSchema,
  updateLeadSchema,
  findLeadsQuerySchema,
  changeStatusSchema,
  updateScoreSchema,
} from './src/presentation/schemas/lead.schema';

/**
 * Test básico para verificar:
 * 1. Schemas de Zod funcionan correctamente
 * 2. Middlewares de correlation ID funcionan
 * 3. Estructura básica del servidor
 */

async function runBasicTests() {
  console.log('\n🧪 PRUEBAS BÁSICAS - Validación y Middlewares\n');
  console.log('='.repeat(60));

  const server = Fastify({ logger: false });

  // Add correlation ID middleware
  server.addHook('onRequest', correlationIdMiddleware);

  // Add health route
  server.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // Add test route with validation
  server.post('/test-validation', {
    preHandler: async (request, reply) => {
      try {
        request.body = createLeadSchema.parse(request.body);
      } catch (error: any) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: error.errors,
        });
      }
    },
  }, async (request) => {
    return { success: true, data: request.body };
  });

  await server.ready();

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<boolean>) {
    total++;
    try {
      if (await fn()) {
        console.log(`✅ ${name}`);
        passed++;
      } else {
        console.log(`❌ ${name}`);
      }
    } catch (error: any) {
      console.log(`❌ ${name} - ${error.message}`);
    }
  }

  // Test 1: Health endpoint
  await test('Health endpoint funciona', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    return res.statusCode === 200;
  });

  // Test 2: Correlation ID se agrega
  await test('Correlation ID se agrega a headers', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    return typeof (res.headers as any)['x-correlation-id'] === 'string';
  });

  // Test 3: Correlation ID se preserva
  await test('Correlation ID se preserva del request', async () => {
    const testId = 'test-123';
    const res = await server.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': testId },
    });
    return (res.headers as any)['x-correlation-id'] === testId;
  });

  //Test 4: Schema validation - campos válidos pasan
  await test('Zod Schema acepta datos válidos', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/test-validation',
      payload: {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        companyName: 'Test Company',
        email: 'test@example.com',
        source: 'Website',
      },
    });
    return res.statusCode === 200;
  });

  // Test 5: Schema validation - campos faltantes
  await test('Zod Schema rechaza campos faltantes', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/test-validation',
      payload: {
        companyName: 'Test Company',
      },
    });
    return res.statusCode === 400;
  });

  // Test 6: Schema validation - email inválido
  await test('Zod Schema rechaza email inválido', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/test-validation',
      payload: {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        companyName: 'Test',
        email: 'not-an-email',
        source: 'Web',
      },
    });
    return res.statusCode === 400;
  });

  // Test 7: Schema validation - UUID inválido
  await test('Zod Schema rechaza UUID inválido', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/test-validation',
      payload: {
        tenantId: 'not-a-uuid',
        companyName: 'Test',
        email: 'test@example.com',
        source: 'Web',
      },
    });
    return res.statusCode === 400;
  });

  // Test 8: Otros schemas existen y funcionan
  await test('updateLeadSchema está definido', async () => {
    const result = updateLeadSchema.safeParse({ companyName: 'Updated' });
    return result.success === true;
  });

  await test('findLeadsQuerySchema está definido', async () => {
    const result = findLeadsQuerySchema.safeParse({ page: 1, limit: 10 });
    return result.success === true;
  });

  await test('changeStatusSchema está definido', async () => {
    const result = changeStatusSchema.safeParse({
      status: 'contacted',
      reason: 'Test reason',
    });
    return result.success === true;
  });

  await test('updateScoreSchema está definido', async () => {
    const result = updateScoreSchema.safeParse({
      score: 75,
      reason: 'High engagement',
    });
    return result.success === true;
  });

  await server.close();

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 RESULTADOS: ${passed}/${total} pruebas pasaron\n`);

  if (passed === total) {
    console.log('✅ TODAS LAS PRUEBAS BÁSICAS PASARON\n');
    console.log('✓ Schemas de Zod funcionan correctamente');
    console.log('✓ Middleware de Correlation ID funciona');
    console.log('✓ Validación de datos funciona\n');
    process.exit(0);
  } else {
    console.log(`❌ ${total - passed} pruebas fallaron\n`);
    process.exit(1);
  }
}

runBasicTests().catch((error) => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

#!/usr/bin/env npx tsx
/**
 * Bot-Helper Integration Test Script
 *
 * Tests the native integration between zuclubit-smart-crm and zuclubit-bot-helper.
 *
 * Prerequisites:
 * 1. Both services running (bot-helper on port 3000, smart-crm on port 3001)
 * 2. Matching CRM_INTEGRATION_SECRET / BOT_HELPER_SHARED_SECRET
 *
 * Usage:
 *   npx tsx scripts/test-bot-helper-integration.ts
 *
 *   # With custom URLs:
 *   BOT_HELPER_URL=http://localhost:3000 SMART_CRM_URL=http://localhost:3001 npx tsx scripts/test-bot-helper-integration.ts
 */

import * as crypto from 'crypto';

// Configuration
const BOT_HELPER_URL = process.env.BOT_HELPER_URL || 'http://localhost:3000';
const SMART_CRM_URL = process.env.SMART_CRM_URL || 'http://localhost:3001';
const SHARED_SECRET = process.env.BOT_HELPER_SHARED_SECRET || process.env.CRM_INTEGRATION_SECRET || 'test-secret-for-local-development-min-32-chars';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateSignature(body: unknown, secret: string): { signature: string; timestamp: string } {
  const timestamp = Date.now().toString();
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return { signature, timestamp };
}

async function testEndpoint(
  name: string,
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    useHmac?: boolean;
  } = {}
): Promise<{ success: boolean; data?: unknown; error?: string; status?: number }> {
  const { method = 'GET', body, headers = {}, useHmac = false } = options;

  try {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (useHmac && body) {
      const { signature, timestamp } = generateSignature(body, SHARED_SECRET);
      requestHeaders['x-crm-signature'] = signature;
      requestHeaders['x-crm-timestamp'] = timestamp;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get('content-type');
    let data: unknown;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      success: response.ok,
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Bot-Helper ↔ Smart-CRM Integration Test Suite             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');

  log(`Configuration:`, 'blue');
  log(`  Bot-Helper URL: ${BOT_HELPER_URL}`, 'dim');
  log(`  Smart-CRM URL:  ${SMART_CRM_URL}`, 'dim');
  log(`  Shared Secret:  ${SHARED_SECRET.substring(0, 8)}...${SHARED_SECRET.substring(SHARED_SECRET.length - 4)}`, 'dim');
  log('');

  const results: { name: string; success: boolean; details?: string }[] = [];

  // ─────────────────────────────────────────────────────────────────
  // Test 1: Bot-Helper Health Check (Direct)
  // ─────────────────────────────────────────────────────────────────
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim');
  log('Test 1: Bot-Helper CRM Integration Health Check', 'yellow');

  const healthResult = await testEndpoint(
    'Bot-Helper Health',
    `${BOT_HELPER_URL}/v1/crm/health`
  );

  if (healthResult.success) {
    log('  ✓ Bot-Helper CRM endpoint is healthy', 'green');
    log(`    Response: ${JSON.stringify(healthResult.data)}`, 'dim');
    results.push({ name: 'Bot-Helper Health', success: true });
  } else {
    log(`  ✗ Bot-Helper CRM endpoint failed: ${healthResult.error || `Status ${healthResult.status}`}`, 'red');
    results.push({ name: 'Bot-Helper Health', success: false, details: healthResult.error });
  }

  // ─────────────────────────────────────────────────────────────────
  // Test 2: HMAC Authentication
  // ─────────────────────────────────────────────────────────────────
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim');
  log('Test 2: HMAC Authentication', 'yellow');

  const chatBody = {
    messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
    tenantId: 'test-tenant-123',
  };

  const chatResult = await testEndpoint(
    'HMAC Auth Chat',
    `${BOT_HELPER_URL}/v1/crm/chat`,
    { method: 'POST', body: chatBody, useHmac: true }
  );

  if (chatResult.success) {
    log('  ✓ HMAC authentication successful', 'green');
    const data = chatResult.data as { content?: string; provider?: string };
    log(`    Provider: ${data.provider || 'unknown'}`, 'dim');
    log(`    Response: ${(data.content || '').substring(0, 100)}...`, 'dim');
    results.push({ name: 'HMAC Authentication', success: true });
  } else {
    log(`  ✗ HMAC authentication failed: ${chatResult.error || `Status ${chatResult.status}`}`, 'red');
    if (chatResult.data) {
      log(`    Response: ${JSON.stringify(chatResult.data)}`, 'dim');
    }
    results.push({ name: 'HMAC Authentication', success: false, details: String(chatResult.status) });
  }

  // ─────────────────────────────────────────────────────────────────
  // Test 3: Lead Scoring
  // ─────────────────────────────────────────────────────────────────
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim');
  log('Test 3: Lead Scoring API', 'yellow');

  const leadData = {
    leadData: {
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      phone: '+1234567890',
      industry: 'Technology',
      employeeCount: 50,
      budget: 50000,
      notes: 'Interested in CRM solution, has decision-making authority',
    },
    tenantId: 'test-tenant-123',
  };

  const scoreResult = await testEndpoint(
    'Lead Scoring',
    `${BOT_HELPER_URL}/v1/crm/lead/score`,
    { method: 'POST', body: leadData, useHmac: true }
  );

  if (scoreResult.success) {
    log('  ✓ Lead scoring successful', 'green');
    const data = scoreResult.data as { score?: number; recommendation?: string };
    log(`    Score: ${data.score || 'N/A'}`, 'dim');
    log(`    Recommendation: ${data.recommendation || 'N/A'}`, 'dim');
    results.push({ name: 'Lead Scoring', success: true });
  } else {
    log(`  ✗ Lead scoring failed: ${scoreResult.error || `Status ${scoreResult.status}`}`, 'red');
    results.push({ name: 'Lead Scoring', success: false, details: String(scoreResult.status) });
  }

  // ─────────────────────────────────────────────────────────────────
  // Test 4: Email Generation
  // ─────────────────────────────────────────────────────────────────
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim');
  log('Test 4: Email Generation API', 'yellow');

  const emailData = {
    type: 'followup',
    context: {
      recipientName: 'Juan García',
      recipientCompany: 'Acme Corp',
      senderName: 'María López',
      subject: 'Seguimiento de nuestra conversación',
      previousInteractions: ['Llamada inicial el lunes', 'Demostración del producto'],
      customInstructions: 'Mencionar la oferta especial de fin de año',
    },
    tenantId: 'test-tenant-123',
  };

  const emailResult = await testEndpoint(
    'Email Generation',
    `${BOT_HELPER_URL}/v1/crm/email/generate`,
    { method: 'POST', body: emailData, useHmac: true }
  );

  if (emailResult.success) {
    log('  ✓ Email generation successful', 'green');
    const data = emailResult.data as { subject?: string; body?: string };
    log(`    Subject: ${data.subject || 'N/A'}`, 'dim');
    log(`    Body preview: ${(data.body || '').substring(0, 100)}...`, 'dim');
    results.push({ name: 'Email Generation', success: true });
  } else {
    log(`  ✗ Email generation failed: ${scoreResult.error || `Status ${emailResult.status}`}`, 'red');
    results.push({ name: 'Email Generation', success: false, details: String(emailResult.status) });
  }

  // ─────────────────────────────────────────────────────────────────
  // Test 5: Sentiment Analysis
  // ─────────────────────────────────────────────────────────────────
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim');
  log('Test 5: Sentiment Analysis API', 'yellow');

  const sentimentData = {
    text: 'Estoy muy contento con el servicio, la atención fue excelente y el producto superó mis expectativas. Definitivamente lo recomendaría.',
    tenantId: 'test-tenant-123',
  };

  const sentimentResult = await testEndpoint(
    'Sentiment Analysis',
    `${BOT_HELPER_URL}/v1/crm/sentiment/analyze`,
    { method: 'POST', body: sentimentData, useHmac: true }
  );

  if (sentimentResult.success) {
    log('  ✓ Sentiment analysis successful', 'green');
    const data = sentimentResult.data as { sentiment?: string; score?: number; keywords?: string[] };
    log(`    Sentiment: ${data.sentiment || 'N/A'}`, 'dim');
    log(`    Score: ${data.score || 'N/A'}`, 'dim');
    log(`    Keywords: ${(data.keywords || []).join(', ')}`, 'dim');
    results.push({ name: 'Sentiment Analysis', success: true });
  } else {
    log(`  ✗ Sentiment analysis failed: ${sentimentResult.error || `Status ${sentimentResult.status}`}`, 'red');
    results.push({ name: 'Sentiment Analysis', success: false, details: String(sentimentResult.status) });
  }

  // ─────────────────────────────────────────────────────────────────
  // Test 6: Agent Request (Full Pipeline)
  // ─────────────────────────────────────────────────────────────────
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim');
  log('Test 6: Agent Request (Full Pipeline)', 'yellow');

  const agentData = {
    message: 'Busca leads con score mayor a 70 y muéstrame un resumen',
    user: {
      userId: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'admin',
      permissions: ['leads.read', 'leads.write'],
      timezone: 'America/Mexico_City',
      locale: 'es-MX',
    },
    tenantId: 'test-tenant-123',
  };

  const agentResult = await testEndpoint(
    'Agent Request',
    `${BOT_HELPER_URL}/v1/crm/agent`,
    { method: 'POST', body: agentData, useHmac: true }
  );

  if (agentResult.success) {
    log('  ✓ Agent request successful', 'green');
    const data = agentResult.data as {
      response?: string;
      conversationId?: string;
      plannedActions?: unknown[];
      requiresConfirmation?: boolean;
    };
    log(`    Conversation ID: ${data.conversationId || 'N/A'}`, 'dim');
    log(`    Planned Actions: ${data.plannedActions?.length || 0}`, 'dim');
    log(`    Requires Confirmation: ${data.requiresConfirmation || false}`, 'dim');
    log(`    Response: ${(data.response || '').substring(0, 150)}...`, 'dim');
    results.push({ name: 'Agent Request', success: true });
  } else {
    log(`  ✗ Agent request failed: ${agentResult.error || `Status ${agentResult.status}`}`, 'red');
    if (agentResult.data) {
      log(`    Response: ${JSON.stringify(agentResult.data)}`, 'dim');
    }
    results.push({ name: 'Agent Request', success: false, details: String(agentResult.status) });
  }

  // ─────────────────────────────────────────────────────────────────
  // Test 7: Smart-CRM Bot-Helper Route (if available)
  // ─────────────────────────────────────────────────────────────────
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim');
  log('Test 7: Smart-CRM Bot-Helper Health Check', 'yellow');

  const smartCrmHealthResult = await testEndpoint(
    'Smart-CRM Bot-Helper Health',
    `${SMART_CRM_URL}/api/v1/ai/bot-helper/health`
  );

  if (smartCrmHealthResult.success) {
    log('  ✓ Smart-CRM bot-helper endpoint is healthy', 'green');
    log(`    Response: ${JSON.stringify(smartCrmHealthResult.data)}`, 'dim');
    results.push({ name: 'Smart-CRM Bot-Helper Health', success: true });
  } else if (smartCrmHealthResult.status === 404) {
    log('  ⚠ Smart-CRM bot-helper endpoint not found (may need to start the service)', 'yellow');
    results.push({ name: 'Smart-CRM Bot-Helper Health', success: false, details: 'Not found (404)' });
  } else {
    log(`  ✗ Smart-CRM bot-helper endpoint failed: ${smartCrmHealthResult.error || `Status ${smartCrmHealthResult.status}`}`, 'red');
    results.push({ name: 'Smart-CRM Bot-Helper Health', success: false, details: smartCrmHealthResult.error });
  }

  // ─────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                        Test Summary                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? 'green' : 'red';
    const details = result.details ? ` (${result.details})` : '';
    log(`  ${icon} ${result.name}${details}`, color);
  });

  log('');
  log(`Results: ${passed} passed, ${failed} failed`, passed === results.length ? 'green' : 'yellow');

  if (failed > 0) {
    log('\nTroubleshooting:', 'yellow');
    log('  1. Ensure bot-helper is running on the correct port', 'dim');
    log('  2. Verify CRM_INTEGRATION_SECRET matches BOT_HELPER_SHARED_SECRET', 'dim');
    log('  3. Check that LLM providers are configured (at least one)', 'dim');
    log('  4. Review bot-helper logs for detailed error messages', 'dim');
  }

  log('');
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});

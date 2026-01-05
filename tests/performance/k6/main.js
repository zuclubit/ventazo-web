/**
 * K6 Performance Tests - Main Entry Point
 * Zuclubit Smart CRM
 *
 * Usage:
 *   k6 run tests/performance/k6/main.js
 *   k6 run tests/performance/k6/main.js --env K6_ENV=production
 *   k6 run tests/performance/k6/main.js --env TEST_TYPE=stress
 *
 * Test types:
 *   - smoke: Quick validation (default)
 *   - load: Normal load testing
 *   - stress: Find breaking points
 *   - soak: Long-running stability
 */

import { sleep, group } from 'k6';
import http from 'k6/http';
import { check } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { login, authGet, authPost, isAuthenticated } from './utils/auth.js';
import { getEnv, endpoints, loadProfiles, thresholds } from './config/environments.js';
import {
  checkResponse,
  standardChecks,
  listChecks,
  generateLeadData,
  loginDuration,
  leadListTime,
  dashboardLoadTime,
  thinkTime,
} from './utils/helpers.js';

// Get test type from environment
const testType = __ENV.TEST_TYPE || 'smoke';

// Dynamic options based on test type
export const options = getOptions(testType);

function getOptions(type) {
  const baseThresholds = {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  };

  switch (type) {
    case 'load':
      return {
        stages: loadProfiles.load.stages,
        thresholds: { ...baseThresholds, ...thresholds },
      };
    case 'stress':
      return {
        stages: loadProfiles.stress.stages,
        thresholds: {
          http_req_duration: ['p(95)<2000'],
          http_req_failed: ['rate<0.10'],
        },
      };
    case 'soak':
      return {
        stages: loadProfiles.soak.stages,
        thresholds: {
          http_req_duration: ['p(95)<1000'],
          http_req_failed: ['rate<0.02'],
        },
      };
    case 'spike':
      return {
        stages: loadProfiles.spike.stages,
        thresholds: {
          http_req_duration: ['p(95)<3000'],
          http_req_failed: ['rate<0.15'],
        },
      };
    case 'smoke':
    default:
      return {
        stages: loadProfiles.smoke.stages,
        thresholds: {
          http_req_duration: ['p(95)<1000'],
          http_req_failed: ['rate<0.05'],
        },
      };
  }
}

export function setup() {
  const env = getEnv();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         ZUCLUBIT CRM - PERFORMANCE TESTING               ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Test Type:    ${testType.padEnd(42)}║`);
  console.log(`║  Environment:  ${(__ENV.K6_ENV || 'staging').padEnd(42)}║`);
  console.log(`║  Base URL:     ${env.baseUrl.padEnd(42)}║`);
  console.log(`║  Tenant:       ${env.tenantId.substring(0, 36).padEnd(42)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Pre-flight health check
  const healthRes = http.get(`${env.baseUrl}${endpoints.health}`);
  const healthy = check(healthRes, {
    'API is healthy': (r) => r.status === 200,
  });

  if (!healthy) {
    console.error('API health check failed! Aborting test.');
    return { healthy: false };
  }

  console.log('✓ API health check passed\n');
  return { healthy: true, startTime: Date.now() };
}

export default function (data) {
  if (!data.healthy) {
    console.error('Skipping test - API not healthy');
    sleep(10);
    return;
  }

  // Authenticate
  if (!isAuthenticated()) {
    const loginRes = login();
    loginDuration.add(loginRes.timings.duration);

    if (!isAuthenticated()) {
      console.error('Login failed');
      sleep(5);
      return;
    }
  }

  // Execute test based on type
  switch (testType) {
    case 'load':
      executeLoadTest();
      break;
    case 'stress':
      executeStressTest();
      break;
    case 'soak':
      executeSoakTest();
      break;
    default:
      executeSmokeTest();
  }

  thinkTime(1, 3);
}

function executeSmokeTest() {
  group('Smoke - Health', () => {
    const env = getEnv();
    const res = http.get(`${env.baseUrl}${endpoints.health}`);
    check(res, { 'health ok': (r) => r.status === 200 });
  });

  group('Smoke - Leads', () => {
    const res = authGet(`${endpoints.leads}?page=1&limit=10`, {
      tags: { endpoint: 'leads_list' },
    });
    checkResponse(res, listChecks, leadListTime);
  });

  group('Smoke - Dashboard', () => {
    const res = authGet(endpoints.leadsStats, {
      tags: { endpoint: 'leads_stats' },
    });
    checkResponse(res, standardChecks, dashboardLoadTime);
  });
}

function executeLoadTest() {
  // Randomly select scenario
  const scenarios = ['dashboard', 'leads', 'opportunities', 'tasks'];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  switch (scenario) {
    case 'dashboard':
      group('Load - Dashboard', () => {
        const statsRes = authGet(endpoints.leadsStats, {
          tags: { endpoint: 'leads_stats' },
        });
        checkResponse(statsRes, standardChecks, dashboardLoadTime);

        const oppsRes = authGet(`${endpoints.opportunities}?limit=5`);
        checkResponse(oppsRes, listChecks);

        const tasksRes = authGet(`${endpoints.tasks}?status=pending&limit=5`);
        checkResponse(tasksRes, listChecks);
      });
      break;

    case 'leads':
      group('Load - Leads', () => {
        const listRes = authGet(`${endpoints.leads}?page=1&limit=20`, {
          tags: { endpoint: 'leads_list' },
        });
        checkResponse(listRes, listChecks, leadListTime);

        if (Math.random() < 0.3) {
          const leadData = generateLeadData();
          const createRes = authPost(endpoints.leads, leadData, {
            tags: { endpoint: 'leads_create' },
          });
          checkResponse(createRes, { created: (r) => r.status < 400 });
        }
      });
      break;

    case 'opportunities':
      group('Load - Opportunities', () => {
        const res = authGet(`${endpoints.opportunities}?page=1&limit=20`, {
          tags: { endpoint: 'opportunities_list' },
        });
        checkResponse(res, listChecks);
      });
      break;

    case 'tasks':
      group('Load - Tasks', () => {
        const res = authGet(`${endpoints.tasks}?page=1&limit=20`, {
          tags: { endpoint: 'tasks_list' },
        });
        checkResponse(res, listChecks);
      });
      break;
  }
}

function executeStressTest() {
  // Hit multiple endpoints quickly
  group('Stress - Rapid Fire', () => {
    const endpoints_to_hit = [
      `${endpoints.leads}?page=1&limit=20`,
      endpoints.leadsStats,
      `${endpoints.opportunities}?page=1&limit=20`,
      `${endpoints.tasks}?page=1&limit=20`,
    ];

    for (const ep of endpoints_to_hit) {
      const res = authGet(ep, { tags: { stress: 'yes' } });
      check(res, { 'not error': (r) => r.status < 500 });
    }
  });

  // Write under stress
  if (Math.random() < 0.5) {
    group('Stress - Write', () => {
      const leadData = generateLeadData();
      const res = authPost(endpoints.leads, leadData, {
        tags: { stress: 'yes', operation: 'write' },
      });
      check(res, { 'write ok': (r) => r.status < 500 });
    });
  }
}

function executeSoakTest() {
  // Similar to load test but with monitoring
  executeLoadTest();
}

export function handleSummary(data) {
  const env = getEnv();

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'tests/performance/reports/summary.json': JSON.stringify(data, null, 2),
    'tests/performance/reports/summary.html': htmlReport(data, {
      title: `Zuclubit CRM - ${testType.toUpperCase()} Test Report`,
    }),
  };
}

export function teardown(data) {
  if (!data.healthy) {
    console.log('Test aborted due to unhealthy API');
    return;
  }

  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(2);
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST COMPLETED                        ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Duration:     ${duration} minutes`.padEnd(61) + '║');
  console.log(`║  Test Type:    ${testType}`.padEnd(61) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

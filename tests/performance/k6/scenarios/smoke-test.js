/**
 * K6 Smoke Test
 * Quick validation that the system is working
 * VUs: 1-3, Duration: ~2 minutes
 */

import { sleep, group } from 'k6';
import http from 'k6/http';
import { check } from 'k6';
import { login, authGet, authPost, authPut, isAuthenticated } from '../utils/auth.js';
import { getEnv, endpoints, loadProfiles, thresholds } from '../config/environments.js';
import {
  checkResponse,
  standardChecks,
  listChecks,
  createChecks,
  generateLeadData,
  loginDuration,
  leadListTime,
  logResponse,
} from '../utils/helpers.js';

export const options = {
  stages: loadProfiles.smoke.stages,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export function setup() {
  console.log('=== SMOKE TEST - Zuclubit CRM ===');
  console.log(`Environment: ${__ENV.K6_ENV || 'staging'}`);
  console.log(`Base URL: ${getEnv().baseUrl}`);
  return {};
}

export default function () {
  const env = getEnv();

  // 1. Health Check
  group('Health Check', () => {
    const res = http.get(`${env.baseUrl}${endpoints.health}`);
    check(res, {
      'health check ok': (r) => r.status === 200,
    });
    logResponse('Health', res);
  });

  sleep(1);

  // 2. Authentication
  group('Authentication', () => {
    const loginRes = login();
    loginDuration.add(loginRes.timings.duration);
    logResponse('Login', loginRes);
  });

  if (!isAuthenticated()) {
    console.error('Authentication failed, skipping authenticated tests');
    return;
  }

  sleep(1);

  // 3. Session Verification
  group('Session Check', () => {
    const res = authGet(endpoints.session, { tags: { endpoint: 'session' } });
    checkResponse(res, {
      'session valid': (r) => r.status === 200,
    });
    logResponse('Session', res);
  });

  sleep(1);

  // 4. Get Tenants
  group('Get Tenants', () => {
    const res = authGet(endpoints.tenants, { tags: { endpoint: 'tenants' } });
    checkResponse(res, {
      'tenants retrieved': (r) => r.status === 200,
    });
    logResponse('Tenants', res);
  });

  sleep(1);

  // 5. List Leads
  group('List Leads', () => {
    const res = authGet(`${endpoints.leads}?page=1&limit=10`, {
      tags: { endpoint: 'leads_list' },
    });
    checkResponse(res, listChecks, leadListTime);
    logResponse('Leads List', res);
  });

  sleep(1);

  // 6. Lead Stats (Dashboard)
  group('Lead Stats', () => {
    const res = authGet(endpoints.leadsStats, {
      tags: { endpoint: 'leads_stats' },
    });
    checkResponse(res, standardChecks);
    logResponse('Lead Stats', res);
  });

  sleep(1);

  // 7. List Opportunities
  group('List Opportunities', () => {
    const res = authGet(`${endpoints.opportunities}?page=1&limit=10`, {
      tags: { endpoint: 'opportunities_list' },
    });
    checkResponse(res, listChecks);
    logResponse('Opportunities List', res);
  });

  sleep(1);

  // 8. List Customers
  group('List Customers', () => {
    const res = authGet(`${endpoints.customers}?page=1&limit=10`, {
      tags: { endpoint: 'customers_list' },
    });
    checkResponse(res, listChecks);
    logResponse('Customers List', res);
  });

  sleep(1);

  // 9. List Tasks
  group('List Tasks', () => {
    const res = authGet(`${endpoints.tasks}?page=1&limit=10`, {
      tags: { endpoint: 'tasks_list' },
    });
    checkResponse(res, listChecks);
    logResponse('Tasks List', res);
  });

  sleep(1);

  // 10. Create Lead (write test)
  group('Create Lead', () => {
    const leadData = generateLeadData();
    const res = authPost(endpoints.leads, leadData, {
      tags: { endpoint: 'leads_create' },
    });
    checkResponse(res, createChecks);
    logResponse('Create Lead', res);
  });

  sleep(2);
}

export function teardown(data) {
  console.log('=== SMOKE TEST COMPLETED ===');
}

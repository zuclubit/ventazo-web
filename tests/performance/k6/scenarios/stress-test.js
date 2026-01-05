/**
 * K6 Stress Test
 * Find system breaking points and recovery behavior
 * VUs: 50-250+, Duration: ~20 minutes
 */

import { sleep, group } from 'k6';
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { login, authGet, authPost, isAuthenticated, clearAuth } from '../utils/auth.js';
import { getEnv, endpoints, loadProfiles, thresholds } from '../config/environments.js';
import {
  checkResponse,
  standardChecks,
  listChecks,
  createChecks,
  generateLeadData,
  parseBody,
  extractId,
  randomItem,
} from '../utils/helpers.js';

// Custom stress test metrics
const stressErrors = new Counter('stress_errors');
const recoveryTime = new Trend('recovery_time', true);
const breakingPointVUs = new Counter('breaking_point_vus');

export const options = {
  stages: loadProfiles.stress.stages,
  thresholds: {
    // Relaxed thresholds for stress testing
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.10'], // Allow up to 10% errors under stress
    stress_errors: ['count<100'],
  },
  // Don't fail the test on threshold failures - we're looking for limits
  ext: {
    loadimpact: {
      apm: [],
    },
  },
};

// Track system state
let lastSuccessTime = Date.now();
let consecutiveFailures = 0;
let breakingPointReached = false;

export function setup() {
  console.log('=== STRESS TEST - Zuclubit CRM ===');
  console.log('Purpose: Find system breaking points');
  console.log(`Environment: ${__ENV.K6_ENV || 'staging'}`);
  console.log(`Base URL: ${getEnv().baseUrl}`);
  console.log('Stages:');
  loadProfiles.stress.stages.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.duration} -> ${s.target} VUs`);
  });
  return { startTime: Date.now() };
}

export default function (data) {
  const env = getEnv();
  const currentVUs = __VU;

  // Login
  if (!isAuthenticated()) {
    const loginRes = login();
    if (!isAuthenticated()) {
      stressErrors.add(1);
      console.log(`[VU ${currentVUs}] Login failed`);
      sleep(2);
      return;
    }
  }

  // Execute stress scenario
  const success = executeStressScenario(currentVUs);

  if (success) {
    lastSuccessTime = Date.now();
    consecutiveFailures = 0;
  } else {
    consecutiveFailures++;

    // Detect breaking point
    if (consecutiveFailures >= 5 && !breakingPointReached) {
      breakingPointReached = true;
      breakingPointVUs.add(currentVUs);
      console.log(`\n!!! BREAKING POINT DETECTED at ${currentVUs} VUs !!!\n`);
    }
  }

  // Minimal think time under stress
  sleep(0.5 + Math.random());
}

function executeStressScenario(currentVUs) {
  let allPassed = true;

  // High-frequency read operations
  group('Read Operations Under Stress', () => {
    // Multiple parallel-like reads
    const endpoints_to_hit = [
      { path: `${endpoints.leads}?page=1&limit=20`, name: 'leads' },
      { path: endpoints.leadsStats, name: 'stats' },
      { path: `${endpoints.opportunities}?page=1&limit=20`, name: 'opportunities' },
      { path: `${endpoints.tasks}?page=1&limit=20`, name: 'tasks' },
    ];

    for (const ep of endpoints_to_hit) {
      const res = authGet(ep.path, {
        tags: { endpoint: ep.name, stress: 'yes' },
      });

      const passed = check(res, {
        [`${ep.name} ok`]: (r) => r.status >= 200 && r.status < 500,
        [`${ep.name} fast enough`]: (r) => r.timings.duration < 5000,
      });

      if (!passed) {
        allPassed = false;
        stressErrors.add(1);
        console.log(`[VU ${currentVUs}] ${ep.name} failed: ${res.status} (${res.timings.duration}ms)`);
      }
    }
  });

  // Write operations under stress
  group('Write Operations Under Stress', () => {
    // Create lead
    const leadData = generateLeadData();
    const createRes = authPost(endpoints.leads, leadData, {
      tags: { endpoint: 'leads_create', stress: 'yes' },
    });

    const passed = check(createRes, {
      'create ok under stress': (r) => r.status >= 200 && r.status < 500,
    });

    if (!passed) {
      allPassed = false;
      stressErrors.add(1);
      console.log(`[VU ${currentVUs}] Create failed: ${createRes.status}`);
    }
  });

  return allPassed;
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('\n=== STRESS TEST COMPLETED ===');
  console.log(`Total duration: ${duration.toFixed(1)}s`);
  if (breakingPointReached) {
    console.log('Breaking point was reached during the test');
  } else {
    console.log('System handled all load levels');
  }
}

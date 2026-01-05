/**
 * K6 Soak Test
 * Long-running stability test to detect memory leaks and degradation
 * VUs: 50 sustained, Duration: 2+ hours
 */

import { sleep, group } from 'k6';
import { Counter, Trend, Gauge } from 'k6/metrics';
import { login, authGet, authPost, isAuthenticated } from '../utils/auth.js';
import { getEnv, endpoints, loadProfiles } from '../config/environments.js';
import {
  checkResponse,
  standardChecks,
  listChecks,
  generateLeadData,
  parseBody,
  randomItem,
} from '../utils/helpers.js';

// Soak test specific metrics
const memoryWarnings = new Counter('memory_warnings');
const degradationEvents = new Counter('degradation_events');
const avgResponseTime = new Gauge('avg_response_time');

// Running averages
let totalRequests = 0;
let totalDuration = 0;
let baselineP95 = null;

export const options = {
  stages: loadProfiles.soak.stages,
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
    degradation_events: ['count<10'],
  },
  // Extended timeouts for soak test
  batch: 15,
  batchPerHost: 5,
};

export function setup() {
  console.log('=== SOAK TEST - Zuclubit CRM ===');
  console.log('Purpose: Long-running stability validation');
  console.log(`Environment: ${__ENV.K6_ENV || 'staging'}`);
  console.log(`Duration: ${getSoakDuration()}`);
  console.log('Monitoring for:');
  console.log('  - Memory leaks');
  console.log('  - Response time degradation');
  console.log('  - Error rate increase');
  console.log('  - Connection pool exhaustion');

  // Establish baseline with initial requests
  const baseline = establishBaseline();
  return { startTime: Date.now(), baseline };
}

function getSoakDuration() {
  const stages = loadProfiles.soak.stages;
  const totalSeconds = stages.reduce((sum, s) => {
    const duration = s.duration;
    if (duration.endsWith('h')) {
      return sum + parseInt(duration) * 3600;
    } else if (duration.endsWith('m')) {
      return sum + parseInt(duration) * 60;
    }
    return sum + parseInt(duration);
  }, 0);
  return `${Math.round(totalSeconds / 60)} minutes`;
}

function establishBaseline() {
  const env = getEnv();

  // Quick login to establish session
  login();

  if (!isAuthenticated()) {
    console.error('Failed to establish baseline - login failed');
    return null;
  }

  // Make baseline requests
  const durations = [];
  for (let i = 0; i < 5; i++) {
    const res = authGet(`${endpoints.leads}?page=1&limit=20`);
    if (res.status === 200) {
      durations.push(res.timings.duration);
    }
    sleep(0.5);
  }

  if (durations.length > 0) {
    durations.sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    baselineP95 = durations[p95Index] || durations[durations.length - 1];
    console.log(`Baseline P95: ${baselineP95.toFixed(2)}ms`);
  }

  return { p95: baselineP95 };
}

export default function (data) {
  if (!isAuthenticated()) {
    const loginRes = login();
    if (!isAuthenticated()) {
      sleep(5);
      return;
    }
  }

  // Execute soak scenario
  executeSoakScenario(data);

  // Standard think time
  sleep(2 + Math.random() * 3);
}

function executeSoakScenario(data) {
  const scenarioType = Math.random();

  if (scenarioType < 0.4) {
    // 40% - Read-heavy scenario
    executeReadScenario(data);
  } else if (scenarioType < 0.7) {
    // 30% - Mixed read/write
    executeMixedScenario(data);
  } else if (scenarioType < 0.9) {
    // 20% - Dashboard loads
    executeDashboardScenario(data);
  } else {
    // 10% - Heavy write
    executeWriteScenario(data);
  }
}

function executeReadScenario(data) {
  group('Soak - Read Operations', () => {
    // List leads
    const leadsRes = authGet(`${endpoints.leads}?page=1&limit=20`, {
      tags: { operation: 'read', entity: 'leads' },
    });

    trackResponse(leadsRes, data);
    checkResponse(leadsRes, listChecks);

    sleep(1);

    // List opportunities
    const oppsRes = authGet(`${endpoints.opportunities}?page=1&limit=20`, {
      tags: { operation: 'read', entity: 'opportunities' },
    });

    trackResponse(oppsRes, data);
    checkResponse(oppsRes, listChecks);

    sleep(1);

    // Browse pages
    for (let page = 2; page <= 3; page++) {
      const pageRes = authGet(`${endpoints.leads}?page=${page}&limit=20`, {
        tags: { operation: 'read', entity: 'leads' },
      });
      trackResponse(pageRes, data);
      sleep(0.5);
    }
  });
}

function executeMixedScenario(data) {
  group('Soak - Mixed Operations', () => {
    // Read first
    const listRes = authGet(`${endpoints.leads}?page=1&limit=10`, {
      tags: { operation: 'read', entity: 'leads' },
    });
    trackResponse(listRes, data);
    checkResponse(listRes, listChecks);

    sleep(1);

    // Write
    const leadData = generateLeadData();
    const createRes = authPost(endpoints.leads, leadData, {
      tags: { operation: 'write', entity: 'leads' },
    });
    trackResponse(createRes, data);

    sleep(1);

    // Read again
    const listRes2 = authGet(`${endpoints.leads}?page=1&limit=10`, {
      tags: { operation: 'read', entity: 'leads' },
    });
    trackResponse(listRes2, data);
  });
}

function executeDashboardScenario(data) {
  group('Soak - Dashboard', () => {
    // Simulate dashboard load
    const endpoints_to_hit = [
      endpoints.leadsStats,
      `${endpoints.opportunities}?limit=5`,
      `${endpoints.tasks}?status=pending&limit=5`,
    ];

    for (const ep of endpoints_to_hit) {
      const res = authGet(ep, {
        tags: { operation: 'dashboard' },
      });
      trackResponse(res, data);
      checkResponse(res, standardChecks);
      sleep(0.3);
    }
  });
}

function executeWriteScenario(data) {
  group('Soak - Write Operations', () => {
    // Create multiple leads
    for (let i = 0; i < 3; i++) {
      const leadData = generateLeadData();
      const createRes = authPost(endpoints.leads, leadData, {
        tags: { operation: 'write', entity: 'leads' },
      });
      trackResponse(createRes, data);
      sleep(0.5);
    }
  });
}

function trackResponse(response, data) {
  totalRequests++;
  totalDuration += response.timings.duration;

  // Update running average
  const currentAvg = totalDuration / totalRequests;
  avgResponseTime.add(currentAvg);

  // Check for degradation
  if (data.baseline && data.baseline.p95) {
    const threshold = data.baseline.p95 * 2; // 2x baseline = degradation
    if (response.timings.duration > threshold) {
      degradationEvents.add(1);
      if (totalRequests % 100 === 0) {
        console.log(
          `Degradation detected: ${response.timings.duration.toFixed(0)}ms > ${threshold.toFixed(0)}ms threshold`
        );
      }
    }
  }

  // Log periodic stats
  if (totalRequests % 1000 === 0) {
    console.log(`[${totalRequests} reqs] Avg: ${currentAvg.toFixed(2)}ms`);
  }
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  const finalAvg = totalDuration / totalRequests;

  console.log('\n=== SOAK TEST COMPLETED ===');
  console.log(`Duration: ${duration.toFixed(1)} minutes`);
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Average response time: ${finalAvg.toFixed(2)}ms`);

  if (data.baseline && data.baseline.p95) {
    const degradation = ((finalAvg - data.baseline.p95) / data.baseline.p95) * 100;
    console.log(`Response time change: ${degradation > 0 ? '+' : ''}${degradation.toFixed(1)}%`);

    if (degradation > 50) {
      console.log('WARNING: Significant degradation detected over time');
    } else if (degradation < 10) {
      console.log('PASS: System maintained stable performance');
    }
  }
}

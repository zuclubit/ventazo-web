/**
 * K6 Helper Utilities
 * Common functions for performance testing
 */

import { check, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// Custom metrics
export const loginDuration = new Trend('login_duration', true);
export const leadCreationTime = new Trend('lead_creation_time', true);
export const leadListTime = new Trend('lead_list_time', true);
export const dashboardLoadTime = new Trend('dashboard_load_time', true);
export const opportunityListTime = new Trend('opportunity_list_time', true);
export const errorCount = new Counter('error_count');
export const successRate = new Rate('success_rate');

/**
 * Generate random lead data
 */
export function generateLeadData() {
  const companies = [
    'TechCorp Solutions',
    'Digital Innovations',
    'Cloud Systems Inc',
    'Data Analytics Pro',
    'Smart Automation',
    'AI Solutions Ltd',
    'Cyber Security Hub',
    'Web Services Plus',
    'Mobile Apps Factory',
    'Enterprise Software Co',
  ];

  const sources = ['website', 'referral', 'linkedin', 'cold_call', 'event'];
  const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'];

  const randomIndex = Math.floor(Math.random() * companies.length);
  const timestamp = Date.now();

  return {
    fullName: `Test User ${timestamp}`,
    email: `test${timestamp}@loadtest.com`,
    phone: `+52555${Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0')}`,
    companyName: `${companies[randomIndex]} ${timestamp}`,
    source: sources[Math.floor(Math.random() * sources.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    score: Math.floor(Math.random() * 100),
    notes: `Performance test lead created at ${new Date().toISOString()}`,
  };
}

/**
 * Generate random opportunity data
 */
export function generateOpportunityData(leadId = null) {
  const names = [
    'Enterprise License Deal',
    'SaaS Implementation',
    'Custom Development',
    'Annual Subscription',
    'Consulting Package',
  ];

  const stages = [
    'Prospección',
    'Calificación',
    'Propuesta',
    'Negociación',
    'Cierre',
  ];

  const timestamp = Date.now();

  return {
    name: `${names[Math.floor(Math.random() * names.length)]} - ${timestamp}`,
    value: Math.floor(Math.random() * 500000) + 10000,
    currency: 'MXN',
    stage: stages[Math.floor(Math.random() * stages.length)],
    probability: Math.floor(Math.random() * 100),
    expectedCloseDate: new Date(
      Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split('T')[0],
    notes: `Performance test opportunity created at ${new Date().toISOString()}`,
    ...(leadId && { leadId }),
  };
}

/**
 * Generate random task data
 */
export function generateTaskData(relatedTo = null) {
  const titles = [
    'Follow up call',
    'Send proposal',
    'Schedule meeting',
    'Review contract',
    'Update CRM data',
    'Prepare presentation',
    'Research competitor',
  ];

  const priorities = ['low', 'medium', 'high', 'urgent'];

  const timestamp = Date.now();

  return {
    title: `${titles[Math.floor(Math.random() * titles.length)]} - ${timestamp}`,
    description: `Performance test task created at ${new Date().toISOString()}`,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    dueDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    ...(relatedTo && { relatedTo }),
  };
}

/**
 * Check response and record metrics
 */
export function checkResponse(response, checks, metricTrend = null) {
  const passed = check(response, checks);

  if (passed) {
    successRate.add(1);
    if (metricTrend) {
      metricTrend.add(response.timings.duration);
    }
  } else {
    successRate.add(0);
    errorCount.add(1);
  }

  return passed;
}

/**
 * Standard response checks
 */
export const standardChecks = {
  success: (r) => r.status >= 200 && r.status < 300,
  notError: (r) => r.status < 400,
  hasBody: (r) => r.body && r.body.length > 0,
  isJson: (r) => {
    try {
      JSON.parse(r.body);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * List response checks
 */
export const listChecks = {
  ...standardChecks,
  hasData: (r) => {
    try {
      const body = JSON.parse(r.body);
      return Array.isArray(body.data) || Array.isArray(body);
    } catch {
      return false;
    }
  },
};

/**
 * Create response checks
 */
export const createChecks = {
  created: (r) => r.status === 201 || r.status === 200,
  hasId: (r) => {
    try {
      const body = JSON.parse(r.body);
      return body.id || body.data?.id;
    } catch {
      return false;
    }
  },
};

/**
 * Sleep with jitter for realistic user behavior
 */
export function sleepWithJitter(baseSeconds, jitterPercent = 0.3) {
  const jitter = baseSeconds * jitterPercent * (Math.random() * 2 - 1);
  const duration = Math.max(0.1, baseSeconds + jitter);
  return __VU === undefined ? duration : sleep(duration);
}

/**
 * Log response details for debugging
 */
export function logResponse(name, response) {
  console.log(`
[${name}]
  Status: ${response.status}
  Duration: ${response.timings.duration.toFixed(2)}ms
  Size: ${response.body ? response.body.length : 0} bytes
  `);
}

/**
 * Random sleep to simulate think time
 */
export function thinkTime(min = 1, max = 3) {
  const duration = min + Math.random() * (max - min);
  return sleep(duration);
}

/**
 * Get random item from array
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Parse response body safely
 */
export function parseBody(response) {
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
}

/**
 * Extract ID from create response
 */
export function extractId(response) {
  const body = parseBody(response);
  if (!body) return null;
  return body.id || body.data?.id || null;
}

// Import sleep from k6
import { sleep } from 'k6';

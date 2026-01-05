/**
 * K6 Load Test
 * Realistic load simulation with multiple user scenarios
 * VUs: 20-50, Duration: ~15 minutes
 */

import { sleep, group } from 'k6';
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { login, authGet, authPost, authPut, isAuthenticated, clearAuth } from '../utils/auth.js';
import { getEnv, endpoints, loadProfiles, thresholds } from '../config/environments.js';
import {
  checkResponse,
  standardChecks,
  listChecks,
  createChecks,
  generateLeadData,
  generateOpportunityData,
  generateTaskData,
  loginDuration,
  leadListTime,
  leadCreationTime,
  dashboardLoadTime,
  opportunityListTime,
  parseBody,
  extractId,
  thinkTime,
  randomItem,
} from '../utils/helpers.js';

export const options = {
  stages: loadProfiles.load.stages,
  thresholds: thresholds,
  scenarios: {
    sales_rep_workflow: {
      executor: 'ramping-vus',
      stages: loadProfiles.load.stages,
      startVUs: 0,
      gracefulRampDown: '30s',
    },
  },
};

// Scenario weights (probability)
const scenarios = [
  { name: 'dashboard_view', weight: 25 },
  { name: 'leads_browse', weight: 30 },
  { name: 'lead_create_edit', weight: 15 },
  { name: 'opportunities_view', weight: 15 },
  { name: 'tasks_management', weight: 10 },
  { name: 'search_filter', weight: 5 },
];

function selectScenario() {
  const total = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * total;

  for (const scenario of scenarios) {
    random -= scenario.weight;
    if (random <= 0) {
      return scenario.name;
    }
  }
  return scenarios[0].name;
}

export function setup() {
  console.log('=== LOAD TEST - Zuclubit CRM ===');
  console.log(`Environment: ${__ENV.K6_ENV || 'staging'}`);
  console.log(`Base URL: ${getEnv().baseUrl}`);
  console.log('Scenarios distribution:');
  scenarios.forEach((s) => console.log(`  ${s.name}: ${s.weight}%`));
  return {};
}

export default function () {
  const env = getEnv();

  // Login at the start of each VU iteration
  if (!isAuthenticated()) {
    const loginRes = login();
    loginDuration.add(loginRes.timings.duration);

    if (!isAuthenticated()) {
      console.error('Login failed');
      sleep(5);
      return;
    }
  }

  // Select and execute scenario
  const scenario = selectScenario();

  switch (scenario) {
    case 'dashboard_view':
      executeDashboardScenario();
      break;
    case 'leads_browse':
      executeLeadsBrowseScenario();
      break;
    case 'lead_create_edit':
      executeLeadCreateEditScenario();
      break;
    case 'opportunities_view':
      executeOpportunitiesScenario();
      break;
    case 'tasks_management':
      executeTasksScenario();
      break;
    case 'search_filter':
      executeSearchScenario();
      break;
    default:
      executeDashboardScenario();
  }

  // Think time between scenarios
  thinkTime(2, 5);
}

/**
 * Dashboard viewing scenario
 * User logs in and views dashboard KPIs
 */
function executeDashboardScenario() {
  group('Dashboard View', () => {
    // Get lead stats
    const statsRes = authGet(endpoints.leadsStats, {
      tags: { endpoint: 'leads_stats', critical: 'yes' },
    });
    checkResponse(statsRes, standardChecks, dashboardLoadTime);

    thinkTime(0.5, 1);

    // Get opportunities summary
    const oppsRes = authGet(`${endpoints.opportunities}?limit=5`, {
      tags: { endpoint: 'opportunities_list' },
    });
    checkResponse(oppsRes, listChecks, opportunityListTime);

    thinkTime(0.5, 1);

    // Get pending tasks
    const tasksRes = authGet(`${endpoints.tasks}?status=pending&limit=5`, {
      tags: { endpoint: 'tasks_list' },
    });
    checkResponse(tasksRes, listChecks);

    thinkTime(0.5, 1);

    // Get overdue follow-ups
    const overdueRes = authGet(endpoints.leadsOverdue, {
      tags: { endpoint: 'leads_overdue' },
    });
    checkResponse(overdueRes, standardChecks);
  });
}

/**
 * Leads browsing scenario
 * User browses through leads list, applies filters
 */
function executeLeadsBrowseScenario() {
  group('Leads Browse', () => {
    // Initial page load
    const page1 = authGet(`${endpoints.leads}?page=1&limit=20`, {
      tags: { endpoint: 'leads_list' },
    });
    checkResponse(page1, listChecks, leadListTime);

    thinkTime(1, 3);

    // Filter by status
    const statuses = ['new', 'contacted', 'qualified', 'proposal'];
    const status = randomItem(statuses);
    const filteredRes = authGet(`${endpoints.leads}?status=${status}&page=1&limit=20`, {
      tags: { endpoint: 'leads_list' },
    });
    checkResponse(filteredRes, listChecks);

    thinkTime(1, 2);

    // View lead detail
    const leads = parseBody(filteredRes);
    if (leads && Array.isArray(leads.data) && leads.data.length > 0) {
      const leadId = randomItem(leads.data).id;
      const detailRes = authGet(`${endpoints.leads}/${leadId}`, {
        tags: { endpoint: 'leads_detail' },
      });
      checkResponse(detailRes, standardChecks);

      thinkTime(2, 4);
    }

    // Page 2
    const page2 = authGet(`${endpoints.leads}?page=2&limit=20`, {
      tags: { endpoint: 'leads_list' },
    });
    checkResponse(page2, listChecks);
  });
}

/**
 * Lead create and edit scenario
 * User creates a new lead and updates it
 */
function executeLeadCreateEditScenario() {
  group('Lead Create/Edit', () => {
    // Create new lead
    const leadData = generateLeadData();
    const createRes = authPost(endpoints.leads, leadData, {
      tags: { endpoint: 'leads_create' },
    });
    checkResponse(createRes, createChecks, leadCreationTime);

    const leadId = extractId(createRes);

    if (leadId) {
      thinkTime(1, 2);

      // Update lead status
      const updateRes = authPut(
        `${endpoints.leads}/${leadId}`,
        {
          status: 'contacted',
          notes: `Updated during load test at ${new Date().toISOString()}`,
        },
        { tags: { endpoint: 'leads_update' } }
      );
      checkResponse(updateRes, standardChecks);

      thinkTime(0.5, 1);

      // Update score
      const scoreRes = authPut(
        `${endpoints.leads}/${leadId}`,
        { score: Math.floor(Math.random() * 100) },
        { tags: { endpoint: 'leads_update' } }
      );
      checkResponse(scoreRes, standardChecks);
    }
  });
}

/**
 * Opportunities viewing scenario
 * User browses pipeline/kanban
 */
function executeOpportunitiesScenario() {
  group('Opportunities View', () => {
    // List opportunities (Kanban view)
    const listRes = authGet(`${endpoints.opportunities}?page=1&limit=50`, {
      tags: { endpoint: 'opportunities_list' },
    });
    checkResponse(listRes, listChecks, opportunityListTime);

    thinkTime(2, 4);

    // Filter by stage
    const stages = ['Prospección', 'Calificación', 'Propuesta', 'Negociación'];
    const stage = randomItem(stages);
    const stageRes = authGet(
      `${endpoints.opportunities}?stage=${encodeURIComponent(stage)}&page=1`,
      { tags: { endpoint: 'opportunities_list' } }
    );
    checkResponse(stageRes, listChecks);

    thinkTime(1, 2);

    // View opportunity detail
    const opportunities = parseBody(listRes);
    if (opportunities && Array.isArray(opportunities.data) && opportunities.data.length > 0) {
      const oppId = randomItem(opportunities.data).id;
      const detailRes = authGet(`${endpoints.opportunities}/${oppId}`, {
        tags: { endpoint: 'opportunities_detail' },
      });
      checkResponse(detailRes, standardChecks);
    }
  });
}

/**
 * Tasks management scenario
 */
function executeTasksScenario() {
  group('Tasks Management', () => {
    // List tasks
    const listRes = authGet(`${endpoints.tasks}?page=1&limit=20`, {
      tags: { endpoint: 'tasks_list' },
    });
    checkResponse(listRes, listChecks);

    thinkTime(1, 2);

    // Filter pending
    const pendingRes = authGet(`${endpoints.tasks}?status=pending&page=1`, {
      tags: { endpoint: 'tasks_list' },
    });
    checkResponse(pendingRes, listChecks);

    thinkTime(1, 2);

    // Create task
    const taskData = generateTaskData();
    const createRes = authPost(endpoints.tasks, taskData, {
      tags: { endpoint: 'tasks_create' },
    });
    checkResponse(createRes, createChecks);

    const taskId = extractId(createRes);

    if (taskId) {
      thinkTime(1, 2);

      // Update task
      const updateRes = authPut(
        `${endpoints.tasks}/${taskId}`,
        { priority: 'high' },
        { tags: { endpoint: 'tasks_update' } }
      );
      checkResponse(updateRes, standardChecks);
    }
  });
}

/**
 * Search and filter scenario
 */
function executeSearchScenario() {
  group('Search & Filter', () => {
    const searchTerms = ['tech', 'corp', 'digital', 'cloud', 'test'];
    const term = randomItem(searchTerms);

    // Search leads
    const searchRes = authGet(`${endpoints.leads}?search=${term}&page=1&limit=20`, {
      tags: { endpoint: 'leads_search' },
    });
    checkResponse(searchRes, listChecks);

    thinkTime(1, 2);

    // Complex filter
    const filterRes = authGet(
      `${endpoints.leads}?status=new&minScore=50&page=1&limit=20`,
      { tags: { endpoint: 'leads_list' } }
    );
    checkResponse(filterRes, listChecks);

    thinkTime(1, 2);

    // Search opportunities
    const oppSearchRes = authGet(
      `${endpoints.opportunities}?search=${term}&page=1`,
      { tags: { endpoint: 'opportunities_list' } }
    );
    checkResponse(oppSearchRes, listChecks);
  });
}

export function teardown(data) {
  console.log('=== LOAD TEST COMPLETED ===');
}

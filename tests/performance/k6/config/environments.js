/**
 * K6 Environment Configuration
 * Zuclubit Smart CRM Performance Tests
 */

export const environments = {
  production: {
    baseUrl: 'https://zuclubit-lead-service.fly.dev',
    frontendUrl: 'https://crm.zuclubit.com',
    tenantId: '977eaca1-295d-4ee2-8310-985a4e06c547',
  },
  staging: {
    baseUrl: 'https://zuclubit-lead-service.fly.dev',
    frontendUrl: 'https://ventazo.pages.dev',
    tenantId: '977eaca1-295d-4ee2-8310-985a4e06c547',
  },
  local: {
    baseUrl: 'http://localhost:3000',
    frontendUrl: 'http://localhost:3001',
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
  },
};

// Get environment from K6_ENV or default to staging
export function getEnv() {
  const envName = __ENV.K6_ENV || 'staging';
  return environments[envName] || environments.staging;
}

// Load profiles for different test types
export const loadProfiles = {
  smoke: {
    stages: [
      { duration: '30s', target: 1 },
      { duration: '1m', target: 3 },
      { duration: '30s', target: 0 },
    ],
  },
  load: {
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 50 },
      { duration: '3m', target: 50 },
      { duration: '2m', target: 20 },
      { duration: '1m', target: 0 },
    ],
  },
  stress: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '3m', target: 150 },
      { duration: '3m', target: 200 },
      { duration: '3m', target: 250 },
      { duration: '2m', target: 0 },
    ],
  },
  soak: {
    stages: [
      { duration: '5m', target: 50 },
      { duration: '2h', target: 50 },
      { duration: '5m', target: 0 },
    ],
  },
  spike: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '30s', target: 200 },
      { duration: '1m', target: 200 },
      { duration: '30s', target: 10 },
      { duration: '1m', target: 0 },
    ],
  },
};

// Thresholds configuration
export const thresholds = {
  // Overall HTTP metrics
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
  http_reqs: ['rate>10'],

  // Endpoint-specific thresholds
  'http_req_duration{endpoint:login}': ['p(95)<1000', 'p(99)<2000'],
  'http_req_duration{endpoint:leads_list}': ['p(95)<400', 'p(99)<800'],
  'http_req_duration{endpoint:leads_create}': ['p(95)<600', 'p(99)<1200'],
  'http_req_duration{endpoint:leads_detail}': ['p(95)<300', 'p(99)<600'],
  'http_req_duration{endpoint:leads_update}': ['p(95)<500', 'p(99)<1000'],
  'http_req_duration{endpoint:leads_stats}': ['p(95)<500', 'p(99)<1000'],
  'http_req_duration{endpoint:opportunities_list}': ['p(95)<400', 'p(99)<800'],
  'http_req_duration{endpoint:customers_list}': ['p(95)<400', 'p(99)<800'],
  'http_req_duration{endpoint:tasks_list}': ['p(95)<400', 'p(99)<800'],
  'http_req_duration{endpoint:session}': ['p(95)<200', 'p(99)<400'],

  // Error rates by endpoint
  'http_req_failed{endpoint:login}': ['rate<0.01'],
  'http_req_failed{endpoint:leads_list}': ['rate<0.01'],
  'http_req_failed{critical:yes}': ['rate<0.001'],
};

// Test data
export const testUsers = [
  {
    email: 'oscar@cuervo.cloud',
    password: 'transirVSK-MI1',
  },
];

// API endpoints configuration
export const endpoints = {
  // Auth
  login: '/api/v1/auth/login',
  refresh: '/api/v1/auth/refresh',
  session: '/api/v1/auth/session',
  tenants: '/api/v1/auth/tenants',
  logout: '/api/v1/auth/logout',

  // Leads
  leads: '/api/v1/leads',
  leadsStats: '/api/v1/leads/stats/overview',
  leadsOverdue: '/api/v1/leads/follow-ups/overdue',
  leadsPipeline: '/api/v1/leads/pipeline/stages',

  // Opportunities
  opportunities: '/api/v1/opportunities',

  // Customers
  customers: '/api/v1/customers',

  // Tasks
  tasks: '/api/v1/tasks',

  // Quotes
  quotes: '/api/v1/quotes',

  // Health
  health: '/healthz',
};

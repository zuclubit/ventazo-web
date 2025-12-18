// ============================================
// Demo Mode - FASE 5.11
// Demo data and onboarding utilities
// ============================================

// Unused import removed for clean build
// import { generateId } from '@/lib/utils';

// ============================================
// Demo Mode Flag
// ============================================

const DEMO_MODE_KEY = 'zuclubit_demo_mode';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

export function enableDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_MODE_KEY, 'true');
}

export function disableDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEMO_MODE_KEY);
}

// ============================================
// Demo User Data
// ============================================

export const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@zuclubit.com',
  fullName: 'Usuario Demo',
  role: 'admin' as const,
  permissions: [
    'LEAD_READ', 'LEAD_CREATE', 'LEAD_UPDATE', 'LEAD_DELETE',
    'OPPORTUNITY_READ', 'OPPORTUNITY_CREATE', 'OPPORTUNITY_UPDATE', 'OPPORTUNITY_DELETE',
    'CUSTOMER_READ', 'CUSTOMER_CREATE', 'CUSTOMER_UPDATE',
    'TASK_READ', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE',
    'WORKFLOW_READ', 'WORKFLOW_CREATE', 'WORKFLOW_UPDATE',
    'ANALYTICS_VIEW', 'STATS_VIEW',
    'USER_READ', 'SETTINGS_VIEW',
  ],
  tenantId: 'demo-tenant-001',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
};

export const DEMO_TENANT = {
  id: 'demo-tenant-001',
  name: 'Demo Company',
  slug: 'demo-company',
  settings: {
    theme: 'light',
    currency: 'MXN',
    locale: 'es-MX',
    timezone: 'America/Mexico_City',
  },
  features: {
    workflows: true,
    analytics: true,
    integrations: false,
    aiScoring: true,
    bulkOperations: true,
  },
};

// ============================================
// Demo Leads Data
// ============================================

const LEAD_FIRST_NAMES = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofia', 'Diego', 'Valentina'];
const LEAD_LAST_NAMES = ['García', 'Martínez', 'López', 'González', 'Hernández', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];
const COMPANIES = ['Acme Corp', 'TechStart', 'GlobalNet', 'InnovateMX', 'DataFlow', 'CloudSync', 'SmartSolutions', 'NextGen Inc', 'ProServices', 'MetaSoft'];
const SOURCES = ['website', 'referral', 'linkedin', 'event', 'cold_call', 'advertisement'];
const INDUSTRIES = ['technology', 'finance', 'healthcare', 'retail', 'manufacturing', 'education'];
const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'] as const;

function randomElement<T>(arr: readonly T[]): T {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) {
    throw new Error('Array is empty');
  }
  return item;
}

function randomDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString();
}

export function generateDemoLead(index: number) {
  const firstName = LEAD_FIRST_NAMES[index % LEAD_FIRST_NAMES.length] ?? 'Juan';
  const lastName = LEAD_LAST_NAMES[index % LEAD_LAST_NAMES.length] ?? 'García';
  const company = COMPANIES[index % COMPANIES.length] ?? 'Acme Corp';

  return {
    id: `demo-lead-${String(index + 1).padStart(3, '0')}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s/g, '')}.com`,
    phone: `+52 55 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
    company,
    position: randomElement(['CEO', 'CTO', 'Director', 'Manager', 'VP Sales', 'VP Marketing']),
    source: randomElement(SOURCES),
    industry: randomElement(INDUSTRIES),
    status: randomElement(STATUSES),
    score: Math.floor(Math.random() * 100),
    estimatedValue: Math.floor(Math.random() * 500000) + 10000,
    assignedTo: index % 3 === 0 ? DEMO_USER.id : null,
    tags: index % 2 === 0 ? ['priority', 'enterprise'] : ['startup'],
    notes: [],
    tenantId: DEMO_TENANT.id,
    createdAt: randomDate(30),
    updatedAt: randomDate(7),
  };
}

export function generateDemoLeads(count = 25) {
  return Array.from({ length: count }, (_, i) => generateDemoLead(i));
}

// ============================================
// Demo Opportunities Data
// ============================================

const OPPORTUNITY_NAMES = [
  'Enterprise License Deal',
  'Annual Subscription',
  'Professional Services',
  'Platform Implementation',
  'Custom Development',
  'Training Package',
  'Support Contract',
  'Cloud Migration',
  'API Integration',
  'Consulting Engagement',
];

const STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;

export function generateDemoOpportunity(index: number) {
  const value = Math.floor(Math.random() * 500000) + 25000;
  const stage = STAGES[Math.min(index % STAGES.length, STAGES.length - 2)]; // Avoid closed stages for most

  return {
    id: `demo-opp-${String(index + 1).padStart(3, '0')}`,
    name: `${OPPORTUNITY_NAMES[index % OPPORTUNITY_NAMES.length]} - ${COMPANIES[index % COMPANIES.length]}`,
    value,
    currency: 'MXN',
    stage,
    probability: stage === 'closed_won' ? 100 : stage === 'closed_lost' ? 0 : Math.floor(Math.random() * 80) + 20,
    expectedCloseDate: randomDate(-30), // Future dates
    leadId: `demo-lead-${String(index + 1).padStart(3, '0')}`,
    customerId: null,
    assignedTo: DEMO_USER.id,
    notes: `Demo opportunity for ${COMPANIES[index % COMPANIES.length]}`,
    activities: [],
    tenantId: DEMO_TENANT.id,
    createdAt: randomDate(60),
    updatedAt: randomDate(14),
  };
}

export function generateDemoOpportunities(count = 15) {
  return Array.from({ length: count }, (_, i) => generateDemoOpportunity(i));
}

// ============================================
// Demo Tasks Data
// ============================================

const TASK_TITLES = [
  'Follow up with client',
  'Send proposal',
  'Schedule demo',
  'Review contract',
  'Update CRM data',
  'Prepare presentation',
  'Call to discuss requirements',
  'Send pricing information',
  'Technical review meeting',
  'Quarterly business review',
];

const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

export function generateDemoTask(index: number) {
  const isCompleted = index % 4 === 0;

  return {
    id: `demo-task-${String(index + 1).padStart(3, '0')}`,
    title: TASK_TITLES[index % TASK_TITLES.length],
    description: `Task ${index + 1} description for demo purposes.`,
    priority: TASK_PRIORITIES[index % TASK_PRIORITIES.length],
    status: isCompleted ? 'completed' : TASK_STATUSES[index % 3] as typeof TASK_STATUSES[number],
    dueDate: randomDate(-7), // Some in past, some in future
    assignedTo: DEMO_USER.id,
    relatedType: index % 2 === 0 ? 'lead' : 'opportunity',
    relatedId: index % 2 === 0
      ? `demo-lead-${String((index % 10) + 1).padStart(3, '0')}`
      : `demo-opp-${String((index % 10) + 1).padStart(3, '0')}`,
    completedAt: isCompleted ? randomDate(3) : null,
    tenantId: DEMO_TENANT.id,
    createdAt: randomDate(14),
    updatedAt: randomDate(3),
  };
}

export function generateDemoTasks(count = 20) {
  return Array.from({ length: count }, (_, i) => generateDemoTask(i));
}

// ============================================
// Demo Analytics Data
// ============================================

export function generateDemoAnalytics() {
  const now = new Date();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  return {
    overview: {
      totalLeads: 156,
      newLeadsThisMonth: 42,
      leadGrowth: 15.3,
      totalOpportunities: 48,
      openOpportunities: 32,
      totalPipelineValue: 2450000,
      conversionRate: 23.5,
      averageDealSize: 78500,
    },
    leadsOverTime: Array.from({ length: 6 }, (_, i) => ({
      month: months[(now.getMonth() - 5 + i + 12) % 12],
      leads: Math.floor(Math.random() * 30) + 20,
      converted: Math.floor(Math.random() * 10) + 5,
    })),
    pipelineByStage: [
      { stage: 'Prospecting', count: 12, value: 450000 },
      { stage: 'Qualification', count: 8, value: 680000 },
      { stage: 'Proposal', count: 6, value: 520000 },
      { stage: 'Negotiation', count: 4, value: 380000 },
      { stage: 'Closed Won', count: 18, value: 420000 },
    ],
    leadSources: [
      { source: 'Website', count: 45, percentage: 28.8 },
      { source: 'Referral', count: 38, percentage: 24.4 },
      { source: 'LinkedIn', count: 32, percentage: 20.5 },
      { source: 'Events', count: 25, percentage: 16.0 },
      { source: 'Other', count: 16, percentage: 10.3 },
    ],
    topPerformers: [
      { name: 'Carlos García', leads: 28, opportunities: 12, revenue: 580000 },
      { name: 'María López', leads: 24, opportunities: 10, revenue: 420000 },
      { name: 'Juan Hernández', leads: 20, opportunities: 8, revenue: 350000 },
    ],
  };
}

// ============================================
// Demo Data Seeder
// ============================================

export interface DemoData {
  user: typeof DEMO_USER;
  tenant: typeof DEMO_TENANT;
  leads: ReturnType<typeof generateDemoLeads>;
  opportunities: ReturnType<typeof generateDemoOpportunities>;
  tasks: ReturnType<typeof generateDemoTasks>;
  analytics: ReturnType<typeof generateDemoAnalytics>;
}

export function seedDemoData(): DemoData {
  return {
    user: DEMO_USER,
    tenant: DEMO_TENANT,
    leads: generateDemoLeads(25),
    opportunities: generateDemoOpportunities(15),
    tasks: generateDemoTasks(20),
    analytics: generateDemoAnalytics(),
  };
}

// ============================================
// Demo Data Storage
// ============================================

const DEMO_DATA_KEY = 'zuclubit_demo_data';

export function saveDemoData(data: DemoData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
}

export function loadDemoData(): DemoData | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(DEMO_DATA_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as DemoData;
  } catch {
    return null;
  }
}

export function clearDemoData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEMO_DATA_KEY);
}

export function initializeDemoMode(): DemoData {
  let data = loadDemoData();
  if (!data) {
    data = seedDemoData();
    saveDemoData(data);
  }
  enableDemoMode();
  return data;
}

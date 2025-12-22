/**
 * Visual Workflow Builder Types
 * Comprehensive workflow automation system
 */

/**
 * Node types in the workflow graph
 */
export type WorkflowNodeType =
  | 'trigger'
  | 'condition'
  | 'action'
  | 'delay'
  | 'split'
  | 'merge'
  | 'loop'
  | 'subworkflow'
  | 'webhook'
  | 'api_call'
  | 'data_transform'
  | 'end';

/**
 * Trigger types
 */
export type TriggerType =
  | 'lead_created'
  | 'lead_updated'
  | 'lead_status_changed'
  | 'lead_score_changed'
  | 'lead_assigned'
  | 'lead_converted'
  | 'contact_created'
  | 'contact_updated'
  | 'opportunity_created'
  | 'opportunity_stage_changed'
  | 'opportunity_won'
  | 'opportunity_lost'
  | 'task_created'
  | 'task_completed'
  | 'task_overdue'
  | 'email_opened'
  | 'email_clicked'
  | 'email_replied'
  | 'form_submitted'
  | 'page_visited'
  | 'meeting_scheduled'
  | 'deal_closed'
  | 'payment_received'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'schedule'
  | 'manual'
  | 'webhook_received'
  | 'api_event';

/**
 * Action types
 */
export type ActionType =
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'send_push_notification'
  | 'create_task'
  | 'update_task'
  | 'create_lead'
  | 'update_lead'
  | 'update_lead_status'
  | 'update_lead_score'
  | 'assign_lead'
  | 'add_to_segment'
  | 'remove_from_segment'
  | 'add_tag'
  | 'remove_tag'
  | 'set_custom_field'
  | 'create_opportunity'
  | 'update_opportunity'
  | 'create_note'
  | 'schedule_meeting'
  | 'send_webhook'
  | 'call_api'
  | 'run_script'
  | 'slack_notification'
  | 'teams_notification'
  | 'create_deal'
  | 'enroll_in_sequence'
  | 'unenroll_from_sequence'
  | 'start_subworkflow'
  | 'wait_for_event';

/**
 * Condition operator
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false'
  | 'in_list'
  | 'not_in_list'
  | 'between'
  | 'regex_match'
  | 'days_ago'
  | 'days_from_now'
  | 'before_date'
  | 'after_date';

/**
 * Delay unit
 */
export type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

/**
 * Schedule frequency
 */
export type ScheduleFrequency = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Workflow status
 */
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

/**
 * Execution status
 */
export type ExecutionStatus = 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'skipped';

/**
 * Workflow node position (for visual editor)
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Condition definition
 */
export interface WorkflowCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logic?: 'and' | 'or';
  nested_conditions?: WorkflowCondition[];
}

/**
 * Trigger configuration
 */
export interface TriggerConfig {
  trigger_type: TriggerType;
  entity_type?: string;
  filters?: WorkflowCondition[];
  schedule?: {
    frequency: ScheduleFrequency;
    time?: string;
    day_of_week?: number;
    day_of_month?: number;
    timezone?: string;
    cron_expression?: string;
  };
  webhook_config?: {
    secret?: string;
    headers?: Record<string, string>;
  };
}

/**
 * Action configuration
 */
export interface ActionConfig {
  action_type: ActionType;
  parameters: Record<string, unknown>;
  template_id?: string;
  retry_config?: {
    max_retries: number;
    retry_delay: number;
    exponential_backoff: boolean;
  };
  timeout_ms?: number;
}

/**
 * Delay configuration
 */
export interface DelayConfig {
  duration: number;
  unit: DelayUnit;
  until_time?: string;
  business_hours_only?: boolean;
  skip_weekends?: boolean;
}

/**
 * Split configuration (A/B testing or conditional split)
 */
export interface SplitConfig {
  split_type: 'ab_test' | 'conditional' | 'percentage';
  branches: Array<{
    id: string;
    name: string;
    percentage?: number;
    condition?: WorkflowCondition;
  }>;
}

/**
 * Loop configuration
 */
export interface LoopConfig {
  max_iterations: number;
  loop_variable: string;
  collection_source: string;
  exit_condition?: WorkflowCondition;
}

/**
 * Workflow node
 */
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description?: string;
  position: NodePosition;
  trigger_config?: TriggerConfig;
  action_config?: ActionConfig;
  condition?: WorkflowCondition;
  delay_config?: DelayConfig;
  split_config?: SplitConfig;
  loop_config?: LoopConfig;
  subworkflow_id?: string;
  data_mapping?: Record<string, string>;
  error_handler?: {
    on_error: 'continue' | 'stop' | 'retry' | 'goto';
    goto_node_id?: string;
    notification?: boolean;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Workflow connection (edge)
 */
export interface WorkflowConnection {
  id: string;
  source_node_id: string;
  target_node_id: string;
  source_port?: string;
  target_port?: string;
  label?: string;
  condition_branch?: string;
}

/**
 * Complete workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  status: WorkflowStatus;
  version: number;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables: WorkflowVariable[];
  settings: WorkflowSettings;
  stats: WorkflowStats;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  last_run_at?: Date;
}

/**
 * Workflow variable (for storing data during execution)
 */
export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  default_value?: unknown;
  description?: string;
  is_input?: boolean;
  is_output?: boolean;
}

/**
 * Workflow settings
 */
export interface WorkflowSettings {
  max_concurrent_executions?: number;
  execution_timeout_minutes?: number;
  retry_failed_nodes?: boolean;
  log_level?: 'minimal' | 'standard' | 'verbose';
  notification_on_failure?: boolean;
  notification_emails?: string[];
  timezone?: string;
  business_hours?: {
    start: string;
    end: string;
    days: number[];
  };
}

/**
 * Workflow statistics
 */
export interface WorkflowStats {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  avg_execution_time_ms: number;
  last_7_days_executions: number;
}

/**
 * Workflow execution record
 */
export interface WorkflowExecution {
  id: string;
  tenant_id: string;
  workflow_id: string;
  workflow_version: number;
  status: ExecutionStatus;
  trigger_type: TriggerType;
  trigger_data: Record<string, unknown>;
  context: Record<string, unknown>;
  current_node_id?: string;
  node_executions: NodeExecution[];
  started_at: Date;
  completed_at?: Date;
  error?: string;
  result?: unknown;
}

/**
 * Node execution record
 */
export interface NodeExecution {
  node_id: string;
  node_type: WorkflowNodeType;
  status: ExecutionStatus;
  started_at: Date;
  completed_at?: Date;
  input_data?: unknown;
  output_data?: unknown;
  error?: string;
  retry_count?: number;
}

/**
 * Create workflow input
 */
export interface CreateWorkflowInput {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  variables?: WorkflowVariable[];
  settings?: Partial<WorkflowSettings>;
}

/**
 * Update workflow input
 */
export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  variables?: WorkflowVariable[];
  settings?: Partial<WorkflowSettings>;
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  is_valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationWarning[];
}

/**
 * Validation error
 */
export interface WorkflowValidationError {
  node_id?: string;
  connection_id?: string;
  code: string;
  message: string;
}

/**
 * Validation warning
 */
export interface WorkflowValidationWarning {
  node_id?: string;
  code: string;
  message: string;
}

/**
 * Trigger a workflow manually
 */
export interface TriggerWorkflowInput {
  context?: Record<string, unknown>;
  target_entity_id?: string;
  target_entity_type?: string;
}

/**
 * Default workflow templates
 */
export const DEFAULT_WORKFLOW_TEMPLATES: Partial<WorkflowDefinition>[] = [
  {
    name: 'Lead Nurturing Sequence',
    description: 'Automated email sequence for new leads',
    category: 'Marketing',
    tags: ['leads', 'email', 'nurturing'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        name: 'New Lead Created',
        position: { x: 100, y: 100 },
        trigger_config: {
          trigger_type: 'lead_created',
          entity_type: 'lead',
        },
      },
      {
        id: 'action-1',
        type: 'action',
        name: 'Send Welcome Email',
        position: { x: 100, y: 200 },
        action_config: {
          action_type: 'send_email',
          parameters: { template: 'welcome_email' },
        },
      },
      {
        id: 'delay-1',
        type: 'delay',
        name: 'Wait 3 Days',
        position: { x: 100, y: 300 },
        delay_config: { duration: 3, unit: 'days' },
      },
      {
        id: 'condition-1',
        type: 'condition',
        name: 'Email Opened?',
        position: { x: 100, y: 400 },
        condition: { id: 'c1', field: 'email_opened', operator: 'is_true', value: true },
      },
      {
        id: 'action-2',
        type: 'action',
        name: 'Send Follow-up',
        position: { x: 200, y: 500 },
        action_config: {
          action_type: 'send_email',
          parameters: { template: 'followup_email' },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        name: 'End',
        position: { x: 100, y: 600 },
      },
    ],
    connections: [
      { id: 'c1', source_node_id: 'trigger-1', target_node_id: 'action-1' },
      { id: 'c2', source_node_id: 'action-1', target_node_id: 'delay-1' },
      { id: 'c3', source_node_id: 'delay-1', target_node_id: 'condition-1' },
      { id: 'c4', source_node_id: 'condition-1', target_node_id: 'action-2', label: 'Yes' },
      { id: 'c5', source_node_id: 'condition-1', target_node_id: 'end-1', label: 'No' },
      { id: 'c6', source_node_id: 'action-2', target_node_id: 'end-1' },
    ],
  },
  {
    name: 'Sales Pipeline Automation',
    description: 'Automate tasks when opportunity stage changes',
    category: 'Sales',
    tags: ['sales', 'opportunities', 'tasks'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        name: 'Stage Changed',
        position: { x: 100, y: 100 },
        trigger_config: {
          trigger_type: 'opportunity_stage_changed',
          entity_type: 'opportunity',
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        name: 'Check Stage',
        position: { x: 100, y: 200 },
        condition: { id: 'c1', field: 'stage', operator: 'equals', value: 'proposal' },
      },
      {
        id: 'action-1',
        type: 'action',
        name: 'Create Proposal Task',
        position: { x: 50, y: 300 },
        action_config: {
          action_type: 'create_task',
          parameters: {
            title: 'Prepare proposal for {{opportunity.name}}',
            due_in_days: 2,
          },
        },
      },
      {
        id: 'action-2',
        type: 'action',
        name: 'Notify Sales Manager',
        position: { x: 150, y: 300 },
        action_config: {
          action_type: 'slack_notification',
          parameters: {
            channel: '#sales',
            message: 'Opportunity moved to proposal stage',
          },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        name: 'End',
        position: { x: 100, y: 400 },
      },
    ],
    connections: [
      { id: 'c1', source_node_id: 'trigger-1', target_node_id: 'condition-1' },
      { id: 'c2', source_node_id: 'condition-1', target_node_id: 'action-1', label: 'Yes' },
      { id: 'c3', source_node_id: 'action-1', target_node_id: 'action-2' },
      { id: 'c4', source_node_id: 'action-2', target_node_id: 'end-1' },
      { id: 'c5', source_node_id: 'condition-1', target_node_id: 'end-1', label: 'No' },
    ],
  },
  {
    name: 'Customer Onboarding',
    description: 'Automated onboarding workflow for new customers',
    category: 'Customer Success',
    tags: ['customers', 'onboarding', 'welcome'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        name: 'Deal Won',
        position: { x: 100, y: 100 },
        trigger_config: {
          trigger_type: 'opportunity_won',
          entity_type: 'opportunity',
        },
      },
      {
        id: 'action-1',
        type: 'action',
        name: 'Create Customer Record',
        position: { x: 100, y: 200 },
        action_config: {
          action_type: 'call_api',
          parameters: { endpoint: '/api/customers', method: 'POST' },
        },
      },
      {
        id: 'action-2',
        type: 'action',
        name: 'Send Welcome Kit',
        position: { x: 100, y: 300 },
        action_config: {
          action_type: 'send_email',
          parameters: { template: 'customer_welcome' },
        },
      },
      {
        id: 'action-3',
        type: 'action',
        name: 'Schedule Onboarding Call',
        position: { x: 100, y: 400 },
        action_config: {
          action_type: 'create_task',
          parameters: {
            title: 'Onboarding call with {{customer.name}}',
            due_in_days: 3,
            assignee: 'customer_success_manager',
          },
        },
      },
      {
        id: 'delay-1',
        type: 'delay',
        name: 'Wait 7 Days',
        position: { x: 100, y: 500 },
        delay_config: { duration: 7, unit: 'days' },
      },
      {
        id: 'action-4',
        type: 'action',
        name: 'Send Check-in Email',
        position: { x: 100, y: 600 },
        action_config: {
          action_type: 'send_email',
          parameters: { template: 'onboarding_checkin' },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        name: 'End',
        position: { x: 100, y: 700 },
      },
    ],
    connections: [
      { id: 'c1', source_node_id: 'trigger-1', target_node_id: 'action-1' },
      { id: 'c2', source_node_id: 'action-1', target_node_id: 'action-2' },
      { id: 'c3', source_node_id: 'action-2', target_node_id: 'action-3' },
      { id: 'c4', source_node_id: 'action-3', target_node_id: 'delay-1' },
      { id: 'c5', source_node_id: 'delay-1', target_node_id: 'action-4' },
      { id: 'c6', source_node_id: 'action-4', target_node_id: 'end-1' },
    ],
  },
  {
    name: 'Lead Score Update Notification',
    description: 'Notify sales team when lead score reaches threshold',
    category: 'Sales',
    tags: ['leads', 'scoring', 'notifications'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        name: 'Score Changed',
        position: { x: 100, y: 100 },
        trigger_config: {
          trigger_type: 'lead_score_changed',
          entity_type: 'lead',
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        name: 'Score >= 80?',
        position: { x: 100, y: 200 },
        condition: { id: 'c1', field: 'score', operator: 'greater_than_or_equal', value: 80 },
      },
      {
        id: 'action-1',
        type: 'action',
        name: 'Mark as Hot Lead',
        position: { x: 50, y: 300 },
        action_config: {
          action_type: 'add_tag',
          parameters: { tag: 'hot_lead' },
        },
      },
      {
        id: 'action-2',
        type: 'action',
        name: 'Notify Assigned Rep',
        position: { x: 150, y: 400 },
        action_config: {
          action_type: 'send_push_notification',
          parameters: {
            title: 'Hot Lead Alert',
            message: '{{lead.name}} score reached {{lead.score}}',
          },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        name: 'End',
        position: { x: 100, y: 500 },
      },
    ],
    connections: [
      { id: 'c1', source_node_id: 'trigger-1', target_node_id: 'condition-1' },
      { id: 'c2', source_node_id: 'condition-1', target_node_id: 'action-1', label: 'Yes' },
      { id: 'c3', source_node_id: 'action-1', target_node_id: 'action-2' },
      { id: 'c4', source_node_id: 'action-2', target_node_id: 'end-1' },
      { id: 'c5', source_node_id: 'condition-1', target_node_id: 'end-1', label: 'No' },
    ],
  },
];

/**
 * Available action definitions for UI
 */
export const AVAILABLE_ACTIONS: Array<{
  type: ActionType;
  name: string;
  description: string;
  category: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}> = [
  {
    type: 'send_email',
    name: 'Send Email',
    description: 'Send an email using a template',
    category: 'Communication',
    parameters: [
      { name: 'template_id', type: 'string', required: true, description: 'Email template to use' },
      { name: 'to', type: 'string', required: false, description: 'Override recipient email' },
      { name: 'subject', type: 'string', required: false, description: 'Override subject line' },
    ],
  },
  {
    type: 'send_sms',
    name: 'Send SMS',
    description: 'Send an SMS message',
    category: 'Communication',
    parameters: [
      { name: 'message', type: 'string', required: true, description: 'SMS message content' },
      { name: 'to', type: 'string', required: false, description: 'Override phone number' },
    ],
  },
  {
    type: 'create_task',
    name: 'Create Task',
    description: 'Create a new task',
    category: 'Tasks',
    parameters: [
      { name: 'title', type: 'string', required: true, description: 'Task title' },
      { name: 'description', type: 'string', required: false, description: 'Task description' },
      { name: 'due_in_days', type: 'number', required: false, description: 'Days until due' },
      { name: 'assignee', type: 'string', required: false, description: 'Assignee user ID' },
      { name: 'priority', type: 'string', required: false, description: 'Task priority' },
    ],
  },
  {
    type: 'update_lead_status',
    name: 'Update Lead Status',
    description: 'Change the lead status',
    category: 'Leads',
    parameters: [
      { name: 'status', type: 'string', required: true, description: 'New status value' },
    ],
  },
  {
    type: 'update_lead_score',
    name: 'Update Lead Score',
    description: 'Adjust the lead score',
    category: 'Leads',
    parameters: [
      { name: 'operation', type: 'string', required: true, description: 'set, add, or subtract' },
      { name: 'value', type: 'number', required: true, description: 'Score value' },
    ],
  },
  {
    type: 'assign_lead',
    name: 'Assign Lead',
    description: 'Assign lead to a user or team',
    category: 'Leads',
    parameters: [
      { name: 'assignee_id', type: 'string', required: true, description: 'User or team ID' },
      { name: 'assignee_type', type: 'string', required: false, description: 'user or team' },
    ],
  },
  {
    type: 'add_tag',
    name: 'Add Tag',
    description: 'Add a tag to the entity',
    category: 'Data',
    parameters: [
      { name: 'tag', type: 'string', required: true, description: 'Tag to add' },
    ],
  },
  {
    type: 'slack_notification',
    name: 'Slack Notification',
    description: 'Send a notification to Slack',
    category: 'Integrations',
    parameters: [
      { name: 'channel', type: 'string', required: true, description: 'Slack channel' },
      { name: 'message', type: 'string', required: true, description: 'Message content' },
    ],
  },
  {
    type: 'send_webhook',
    name: 'Send Webhook',
    description: 'Send data to an external webhook',
    category: 'Integrations',
    parameters: [
      { name: 'url', type: 'string', required: true, description: 'Webhook URL' },
      { name: 'method', type: 'string', required: false, description: 'HTTP method' },
      { name: 'headers', type: 'object', required: false, description: 'Custom headers' },
      { name: 'body', type: 'object', required: false, description: 'Request body' },
    ],
  },
];

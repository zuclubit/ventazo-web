/**
 * Email Template Builder Types
 * Modern email template system with personalization and versioning
 */

/**
 * Template status
 */
export type TemplateStatus = 'draft' | 'active' | 'archived';

/**
 * Template category
 */
export type TemplateCategory =
  | 'marketing'
  | 'transactional'
  | 'notification'
  | 'newsletter'
  | 'welcome'
  | 'follow_up'
  | 'nurture'
  | 'announcement'
  | 'custom';

/**
 * Content block types for drag-drop builder
 */
export type ContentBlockType =
  | 'header'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'social'
  | 'footer'
  | 'video'
  | 'html'
  | 'product'
  | 'dynamic';

/**
 * Personalization token type
 */
export type TokenType =
  | 'contact'
  | 'lead'
  | 'company'
  | 'user'
  | 'system'
  | 'custom'
  | 'conditional';

/**
 * Token definition
 */
export interface PersonalizationToken {
  id: string;
  name: string;
  token: string; // e.g., {{contact.firstName}}
  type: TokenType;
  defaultValue?: string;
  description?: string;
  category?: string;
}

/**
 * Content block styling
 */
export interface BlockStyle {
  backgroundColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  borderColor?: string;
  borderWidth?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  lineHeight?: string;
  width?: string;
  maxWidth?: string;
}

/**
 * Content block base
 */
export interface ContentBlockBase {
  id: string;
  type: ContentBlockType;
  style?: BlockStyle;
  mobileStyle?: BlockStyle;
  visible?: boolean;
  conditionalDisplay?: ConditionalRule;
}

/**
 * Header block
 */
export interface HeaderBlock extends ContentBlockBase {
  type: 'header';
  content: {
    text: string;
    level: 1 | 2 | 3 | 4;
    logoUrl?: string;
    logoAlt?: string;
    logoWidth?: number;
  };
}

/**
 * Text block
 */
export interface TextBlock extends ContentBlockBase {
  type: 'text';
  content: {
    html: string;
  };
}

/**
 * Image block
 */
export interface ImageBlock extends ContentBlockBase {
  type: 'image';
  content: {
    src: string;
    alt: string;
    linkUrl?: string;
    width?: number;
    height?: number;
  };
}

/**
 * Button block
 */
export interface ButtonBlock extends ContentBlockBase {
  type: 'button';
  content: {
    text: string;
    url: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    fullWidth?: boolean;
  };
}

/**
 * Divider block
 */
export interface DividerBlock extends ContentBlockBase {
  type: 'divider';
  content: {
    color?: string;
    height?: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
}

/**
 * Spacer block
 */
export interface SpacerBlock extends ContentBlockBase {
  type: 'spacer';
  content: {
    height: number;
  };
}

/**
 * Column configuration
 */
export interface ColumnConfig {
  id: string;
  width: string; // percentage or px
  blocks: ContentBlock[];
  style?: BlockStyle;
}

/**
 * Columns block
 */
export interface ColumnsBlock extends ContentBlockBase {
  type: 'columns';
  content: {
    columns: ColumnConfig[];
    gap?: string;
    stackOnMobile?: boolean;
  };
}

/**
 * Social links block
 */
export interface SocialBlock extends ContentBlockBase {
  type: 'social';
  content: {
    links: Array<{
      platform: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'youtube' | 'tiktok';
      url: string;
      iconColor?: string;
    }>;
    iconSize?: number;
    alignment?: 'left' | 'center' | 'right';
  };
}

/**
 * Footer block
 */
export interface FooterBlock extends ContentBlockBase {
  type: 'footer';
  content: {
    companyName?: string;
    address?: string;
    unsubscribeText?: string;
    unsubscribeUrl?: string;
    privacyPolicyUrl?: string;
    termsUrl?: string;
  };
}

/**
 * Video block
 */
export interface VideoBlock extends ContentBlockBase {
  type: 'video';
  content: {
    videoUrl: string;
    thumbnailUrl?: string;
    provider?: 'youtube' | 'vimeo' | 'wistia';
  };
}

/**
 * HTML block
 */
export interface HtmlBlock extends ContentBlockBase {
  type: 'html';
  content: {
    html: string;
  };
}

/**
 * Product block for e-commerce
 */
export interface ProductBlock extends ContentBlockBase {
  type: 'product';
  content: {
    products: Array<{
      id: string;
      name: string;
      imageUrl: string;
      price: string;
      description?: string;
      url: string;
    }>;
    layout?: 'grid' | 'list';
    columns?: 2 | 3 | 4;
  };
}

/**
 * Dynamic content block
 */
export interface DynamicBlock extends ContentBlockBase {
  type: 'dynamic';
  content: {
    dataSource: string;
    template: string;
    fallback?: string;
  };
}

/**
 * Union type for all content blocks
 */
export type ContentBlock =
  | HeaderBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock
  | SocialBlock
  | FooterBlock
  | VideoBlock
  | HtmlBlock
  | ProductBlock
  | DynamicBlock;

/**
 * Conditional display rule
 */
export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
  value?: string;
}

/**
 * Template global settings
 */
export interface TemplateSettings {
  preheader?: string;
  backgroundColor?: string;
  contentWidth?: number;
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
  linkColor?: string;
  buttonStyle?: {
    backgroundColor: string;
    textColor: string;
    borderRadius: string;
  };
}

/**
 * Email template version
 */
export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  subject: string;
  preheader?: string;
  blocks: ContentBlock[];
  settings: TemplateSettings;
  html?: string; // Compiled HTML
  createdBy: string;
  createdAt: Date;
  changeDescription?: string;
}

/**
 * Email template
 */
export interface EmailTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  status: TemplateStatus;
  subject: string;
  preheader?: string;
  blocks: ContentBlock[];
  settings: TemplateSettings;
  html?: string; // Compiled HTML
  thumbnail?: string;
  tags?: string[];
  currentVersion: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
}

/**
 * Create template request
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: TemplateCategory;
  subject: string;
  preheader?: string;
  blocks: ContentBlock[];
  settings?: TemplateSettings;
  tags?: string[];
}

/**
 * Update template request
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  status?: TemplateStatus;
  subject?: string;
  preheader?: string;
  blocks?: ContentBlock[];
  settings?: TemplateSettings;
  tags?: string[];
  changeDescription?: string;
}

/**
 * Template query options
 */
export interface TemplateQueryOptions {
  status?: TemplateStatus;
  category?: TemplateCategory;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Template preview data
 */
export interface PreviewData {
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    title?: string;
  };
  lead?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    score?: number;
  };
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
  };
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    title?: string;
    signature?: string;
  };
  custom?: Record<string, unknown>;
}

/**
 * Render result
 */
export interface RenderResult {
  subject: string;
  html: string;
  text: string;
  preheader?: string;
  errors?: Array<{
    token: string;
    error: string;
  }>;
}

/**
 * Template analytics
 */
export interface TemplateAnalytics {
  templateId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

/**
 * A/B test variant
 */
export interface TestVariant {
  id: string;
  name: string;
  subject?: string;
  blocks?: ContentBlock[];
  weight: number; // percentage
}

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  id: string;
  templateId: string;
  name: string;
  variants: TestVariant[];
  winningCriteria: 'open_rate' | 'click_rate' | 'conversion';
  testDuration: number; // hours
  sampleSize: number; // percentage
  status: 'draft' | 'running' | 'completed';
  winnerId?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Predefined tokens
 */
export const DEFAULT_TOKENS: PersonalizationToken[] = [
  // Contact tokens
  { id: 'contact.firstName', name: 'First Name', token: '{{contact.firstName}}', type: 'contact', defaultValue: 'there', category: 'Contact' },
  { id: 'contact.lastName', name: 'Last Name', token: '{{contact.lastName}}', type: 'contact', category: 'Contact' },
  { id: 'contact.fullName', name: 'Full Name', token: '{{contact.fullName}}', type: 'contact', category: 'Contact' },
  { id: 'contact.email', name: 'Email', token: '{{contact.email}}', type: 'contact', category: 'Contact' },
  { id: 'contact.phone', name: 'Phone', token: '{{contact.phone}}', type: 'contact', category: 'Contact' },
  { id: 'contact.company', name: 'Company', token: '{{contact.company}}', type: 'contact', category: 'Contact' },
  { id: 'contact.title', name: 'Job Title', token: '{{contact.title}}', type: 'contact', category: 'Contact' },

  // Lead tokens
  { id: 'lead.firstName', name: 'First Name', token: '{{lead.firstName}}', type: 'lead', defaultValue: 'there', category: 'Lead' },
  { id: 'lead.lastName', name: 'Last Name', token: '{{lead.lastName}}', type: 'lead', category: 'Lead' },
  { id: 'lead.email', name: 'Email', token: '{{lead.email}}', type: 'lead', category: 'Lead' },
  { id: 'lead.company', name: 'Company', token: '{{lead.company}}', type: 'lead', category: 'Lead' },
  { id: 'lead.score', name: 'Lead Score', token: '{{lead.score}}', type: 'lead', category: 'Lead' },
  { id: 'lead.status', name: 'Status', token: '{{lead.status}}', type: 'lead', category: 'Lead' },

  // Company tokens
  { id: 'company.name', name: 'Company Name', token: '{{company.name}}', type: 'company', category: 'Company' },
  { id: 'company.address', name: 'Address', token: '{{company.address}}', type: 'company', category: 'Company' },
  { id: 'company.phone', name: 'Phone', token: '{{company.phone}}', type: 'company', category: 'Company' },
  { id: 'company.website', name: 'Website', token: '{{company.website}}', type: 'company', category: 'Company' },

  // User (sender) tokens
  { id: 'user.firstName', name: 'Your First Name', token: '{{user.firstName}}', type: 'user', category: 'Sender' },
  { id: 'user.lastName', name: 'Your Last Name', token: '{{user.lastName}}', type: 'user', category: 'Sender' },
  { id: 'user.fullName', name: 'Your Full Name', token: '{{user.fullName}}', type: 'user', category: 'Sender' },
  { id: 'user.email', name: 'Your Email', token: '{{user.email}}', type: 'user', category: 'Sender' },
  { id: 'user.title', name: 'Your Title', token: '{{user.title}}', type: 'user', category: 'Sender' },
  { id: 'user.signature', name: 'Signature', token: '{{user.signature}}', type: 'user', category: 'Sender' },

  // System tokens
  { id: 'system.currentDate', name: 'Current Date', token: '{{system.currentDate}}', type: 'system', category: 'System' },
  { id: 'system.currentYear', name: 'Current Year', token: '{{system.currentYear}}', type: 'system', category: 'System' },
  { id: 'system.unsubscribeUrl', name: 'Unsubscribe URL', token: '{{system.unsubscribeUrl}}', type: 'system', category: 'System' },
  { id: 'system.viewInBrowserUrl', name: 'View in Browser', token: '{{system.viewInBrowserUrl}}', type: 'system', category: 'System' },
  { id: 'system.preferencesUrl', name: 'Preferences URL', token: '{{system.preferencesUrl}}', type: 'system', category: 'System' },
];

/**
 * Default template settings
 */
export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  backgroundColor: '#f4f4f4',
  contentWidth: 600,
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  textColor: '#333333',
  linkColor: '#0066cc',
  buttonStyle: {
    backgroundColor: '#0066cc',
    textColor: '#ffffff',
    borderRadius: '4px',
  },
};

/**
 * Starter templates
 */
export const STARTER_TEMPLATES: Array<Omit<CreateTemplateRequest, 'name'> & { id: string; name: string; thumbnail?: string }> = [
  {
    id: 'welcome-email',
    name: 'Welcome Email',
    description: 'A warm welcome email for new subscribers',
    category: 'welcome',
    subject: 'Welcome to {{company.name}}!',
    preheader: 'We\'re excited to have you on board',
    blocks: [
      {
        id: 'header-1',
        type: 'header',
        content: { text: 'Welcome, {{contact.firstName}}!', level: 1 },
        style: { textAlign: 'center', padding: '20px' },
      },
      {
        id: 'text-1',
        type: 'text',
        content: { html: '<p>Thank you for joining us! We\'re thrilled to have you as part of our community.</p>' },
        style: { padding: '20px' },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'Get Started', url: '{{system.loginUrl}}', fullWidth: false },
        style: { textAlign: 'center', padding: '20px' },
      },
      {
        id: 'footer-1',
        type: 'footer',
        content: { companyName: '{{company.name}}', address: '{{company.address}}' },
      },
    ],
    settings: DEFAULT_TEMPLATE_SETTINGS,
    tags: ['welcome', 'onboarding'],
  },
  {
    id: 'newsletter',
    name: 'Newsletter Template',
    description: 'Clean newsletter layout with multiple sections',
    category: 'newsletter',
    subject: '{{company.name}} Newsletter - {{system.currentDate}}',
    blocks: [
      {
        id: 'header-1',
        type: 'header',
        content: { text: 'Monthly Newsletter', level: 1 },
        style: { textAlign: 'center', padding: '20px', backgroundColor: '#0066cc', color: '#ffffff' },
      },
      {
        id: 'text-1',
        type: 'text',
        content: { html: '<p>Hi {{contact.firstName}},</p><p>Here are the latest updates from our team.</p>' },
        style: { padding: '20px' },
      },
      {
        id: 'divider-1',
        type: 'divider',
        content: { color: '#dddddd', height: 1 },
      },
      {
        id: 'text-2',
        type: 'text',
        content: { html: '<h2>Featured Article</h2><p>Your featured content goes here...</p>' },
        style: { padding: '20px' },
      },
      {
        id: 'footer-1',
        type: 'footer',
        content: { companyName: '{{company.name}}', unsubscribeText: 'Unsubscribe from our newsletter' },
      },
    ],
    settings: DEFAULT_TEMPLATE_SETTINGS,
    tags: ['newsletter', 'marketing'],
  },
  {
    id: 'follow-up',
    name: 'Sales Follow-Up',
    description: 'Professional follow-up email for sales outreach',
    category: 'follow_up',
    subject: 'Following up on our conversation',
    blocks: [
      {
        id: 'text-1',
        type: 'text',
        content: { html: '<p>Hi {{lead.firstName}},</p><p>I wanted to follow up on our recent conversation about {{company.name}}.</p>' },
        style: { padding: '20px' },
      },
      {
        id: 'text-2',
        type: 'text',
        content: { html: '<p>Would you be available for a quick call this week to discuss further?</p>' },
        style: { padding: '0 20px' },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'Schedule a Call', url: '{{system.calendarUrl}}' },
        style: { textAlign: 'left', padding: '20px' },
      },
      {
        id: 'text-3',
        type: 'text',
        content: { html: '<p>Best regards,<br/>{{user.fullName}}<br/>{{user.title}}</p>' },
        style: { padding: '20px' },
      },
    ],
    settings: DEFAULT_TEMPLATE_SETTINGS,
    tags: ['sales', 'follow-up'],
  },
];

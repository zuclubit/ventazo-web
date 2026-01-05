// ============================================
// Settings Configuration - Ventazo CRM
// Organized by Sections with Proper Spanish Typography
// ============================================

import {
  User,
  Users,
  Bell,
  CreditCard,
  Mail,
  Puzzle,
  GitBranch,
  Activity,
  Shield,
  Database,
  Palette,
  Key,
  FileText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type SettingsCategoryColor =
  | 'profile'
  | 'team'
  | 'notifications'
  | 'billing'
  | 'messaging'
  | 'integrations'
  | 'pipeline'
  | 'activity'
  | 'branding'
  | 'security'
  | 'data'
  | 'proposals'
  | 'ai';

export interface SettingsItem {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: SettingsCategoryColor;
  /** Hex color for the icon */
  iconColor: string;
  /** Hex color for the background */
  bgColor: string;
  requiresAdmin?: boolean;
  isNew?: boolean;
  /** Keywords for search */
  keywords: string[];
}

export interface SettingsSection {
  id: string;
  title: string;
  items: SettingsItem[];
}

// For backward compatibility
export interface SettingsCategory extends SettingsItem {
  badge?: string;
}

export interface SearchableItem {
  category: string;
  name: string;
  href: string;
  icon?: LucideIcon;
  color?: SettingsCategoryColor;
}

// ============================================
// Color Configuration per Category
// ============================================

export const settingsCategoryColors: Record<
  SettingsCategoryColor,
  {
    icon: string;
    bg: string;
    bgHover: string;
    border: string;
    borderHover: string;
    /** CSS variable reference for icon color */
    iconHex: string;
    /** CSS variable reference for background color */
    bgHex: string;
  }
> = {
  profile: {
    icon: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    bgHover: 'hover:bg-blue-100 dark:hover:bg-blue-500/20',
    border: 'border-blue-100 dark:border-blue-500/20',
    borderHover: 'hover:border-blue-200 dark:hover:border-blue-500/30',
    iconHex: 'var(--settings-profile-icon)',
    bgHex: 'var(--settings-profile-bg)',
  },
  notifications: {
    icon: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    bgHover: 'hover:bg-amber-100 dark:hover:bg-amber-500/20',
    border: 'border-amber-100 dark:border-amber-500/20',
    borderHover: 'hover:border-amber-200 dark:hover:border-amber-500/30',
    iconHex: 'var(--settings-notifications-icon)',
    bgHex: 'var(--settings-notifications-bg)',
  },
  branding: {
    icon: 'text-purple-500 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    bgHover: 'hover:bg-purple-100 dark:hover:bg-purple-500/20',
    border: 'border-purple-100 dark:border-purple-500/20',
    borderHover: 'hover:border-purple-200 dark:hover:border-purple-500/30',
    iconHex: 'var(--settings-branding-icon)',
    bgHex: 'var(--settings-branding-bg)',
  },
  team: {
    icon: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    bgHover: 'hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
    border: 'border-emerald-100 dark:border-emerald-500/20',
    borderHover: 'hover:border-emerald-200 dark:hover:border-emerald-500/30',
    iconHex: 'var(--settings-team-icon)',
    bgHex: 'var(--settings-team-bg)',
  },
  billing: {
    icon: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    bgHover: 'hover:bg-red-100 dark:hover:bg-red-500/20',
    border: 'border-red-100 dark:border-red-500/20',
    borderHover: 'hover:border-red-200 dark:hover:border-red-500/30',
    iconHex: 'var(--settings-billing-icon)',
    bgHex: 'var(--settings-billing-bg)',
  },
  messaging: {
    icon: 'text-cyan-500 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    bgHover: 'hover:bg-cyan-100 dark:hover:bg-cyan-500/20',
    border: 'border-cyan-100 dark:border-cyan-500/20',
    borderHover: 'hover:border-cyan-200 dark:hover:border-cyan-500/30',
    iconHex: 'var(--settings-messaging-icon)',
    bgHex: 'var(--settings-messaging-bg)',
  },
  integrations: {
    icon: 'text-pink-500 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    bgHover: 'hover:bg-pink-100 dark:hover:bg-pink-500/20',
    border: 'border-pink-100 dark:border-pink-500/20',
    borderHover: 'hover:border-pink-200 dark:hover:border-pink-500/30',
    iconHex: 'var(--settings-integrations-icon)',
    bgHex: 'var(--settings-integrations-bg)',
  },
  pipeline: {
    icon: 'text-orange-500 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    bgHover: 'hover:bg-orange-100 dark:hover:bg-orange-500/20',
    border: 'border-orange-100 dark:border-orange-500/20',
    borderHover: 'hover:border-orange-200 dark:hover:border-orange-500/30',
    iconHex: 'var(--settings-pipeline-icon)',
    bgHex: 'var(--settings-pipeline-bg)',
  },
  activity: {
    icon: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-500/10',
    bgHover: 'hover:bg-slate-100 dark:hover:bg-slate-500/20',
    border: 'border-slate-100 dark:border-slate-500/20',
    borderHover: 'hover:border-slate-200 dark:hover:border-slate-500/30',
    iconHex: 'var(--settings-activity-icon)',
    bgHex: 'var(--settings-activity-bg)',
  },
  security: {
    icon: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    bgHover: 'hover:bg-indigo-100 dark:hover:bg-indigo-500/20',
    border: 'border-indigo-100 dark:border-indigo-500/20',
    borderHover: 'hover:border-indigo-200 dark:hover:border-indigo-500/30',
    iconHex: 'var(--settings-security-icon)',
    bgHex: 'var(--settings-security-bg)',
  },
  data: {
    icon: 'text-teal-500 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    bgHover: 'hover:bg-teal-100 dark:hover:bg-teal-500/20',
    border: 'border-teal-100 dark:border-teal-500/20',
    borderHover: 'hover:border-teal-200 dark:hover:border-teal-500/30',
    iconHex: 'var(--settings-data-icon)',
    bgHex: 'var(--settings-data-bg)',
  },
  proposals: {
    icon: 'text-violet-500 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    bgHover: 'hover:bg-violet-100 dark:hover:bg-violet-500/20',
    border: 'border-violet-100 dark:border-violet-500/20',
    borderHover: 'hover:border-violet-200 dark:hover:border-violet-500/30',
    iconHex: 'var(--settings-proposals-icon)',
    bgHex: 'var(--settings-proposals-bg)',
  },
  ai: {
    icon: 'text-fuchsia-500 dark:text-fuchsia-400',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10',
    bgHover: 'hover:bg-fuchsia-100 dark:hover:bg-fuchsia-500/20',
    border: 'border-fuchsia-100 dark:border-fuchsia-500/20',
    borderHover: 'hover:border-fuchsia-200 dark:hover:border-fuchsia-500/30',
    iconHex: 'var(--settings-ai-icon)',
    bgHex: 'var(--settings-ai-bg)',
  },
};

// ============================================
// Settings Sections Configuration
// ============================================

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'account',
    title: 'Cuenta',
    items: [
      {
        id: 'profile',
        name: 'Mi Perfil',
        description: 'Información personal, avatar y preferencias de usuario',
        icon: User,
        href: '/app/settings/profile',
        color: 'profile',
        iconColor: 'var(--settings-profile-icon)',
        bgColor: 'var(--settings-profile-bg)',
        keywords: ['perfil', 'usuario', 'avatar', 'nombre', 'email', 'contraseña'],
      },
      {
        id: 'notifications',
        name: 'Notificaciones',
        description: 'Configura alertas por email, push y WhatsApp',
        icon: Bell,
        href: '/app/settings/notifications',
        color: 'notifications',
        iconColor: 'var(--settings-notifications-icon)',
        bgColor: 'var(--settings-notifications-bg)',
        keywords: ['notificaciones', 'alertas', 'email', 'push', 'whatsapp'],
      },
    ],
  },
  {
    id: 'company',
    title: 'Empresa',
    items: [
      {
        id: 'branding',
        name: 'Marca y Colores',
        description: 'Logo, colores de marca y personalización visual',
        icon: Palette,
        href: '/app/settings/branding',
        color: 'branding',
        iconColor: 'var(--settings-branding-icon)',
        bgColor: 'var(--settings-branding-bg)',
        requiresAdmin: true,
        keywords: ['marca', 'logo', 'colores', 'tema', 'personalización', 'branding'],
      },
      {
        id: 'team',
        name: 'Equipo',
        description: 'Invita miembros, gestiona roles, permisos y etiquetas de grupo',
        icon: Users,
        href: '/app/settings/team',
        color: 'team',
        iconColor: 'var(--settings-team-icon)',
        bgColor: 'var(--settings-team-bg)',
        requiresAdmin: true,
        keywords: ['equipo', 'usuarios', 'roles', 'permisos', 'invitar', 'miembros', 'tags', 'etiquetas', 'grupos', 'menciones'],
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operaciones',
    items: [
      {
        id: 'billing',
        name: 'Facturación',
        description: 'Suscripción, métodos de pago e historial',
        icon: CreditCard,
        href: '/app/settings/billing',
        color: 'billing',
        iconColor: 'var(--settings-billing-icon)',
        bgColor: 'var(--settings-billing-bg)',
        requiresAdmin: true,
        keywords: ['facturación', 'pago', 'suscripción', 'plan', 'tarjeta', 'factura'],
      },
      {
        id: 'messaging',
        name: 'Mensajería',
        description: 'Plantillas de email y configuración de WhatsApp',
        icon: Mail,
        href: '/app/settings/messaging/templates',
        color: 'messaging',
        iconColor: 'var(--settings-messaging-icon)',
        bgColor: 'var(--settings-messaging-bg)',
        keywords: ['mensajería', 'email', 'whatsapp', 'plantillas', 'templates'],
      },
      {
        id: 'proposals',
        name: 'Propuestas PDF',
        description: 'Personaliza el formato y estilo de tus cotizaciones',
        icon: FileText,
        href: '/app/settings/proposals',
        color: 'proposals',
        iconColor: 'var(--settings-proposals-icon)',
        bgColor: 'var(--settings-proposals-bg)',
        isNew: true,
        keywords: ['propuestas', 'pdf', 'cotizaciones', 'plantillas', 'formato', 'estilo'],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Avanzado',
    items: [
      {
        id: 'integrations',
        name: 'Integraciones',
        description: 'Conecta con otras aplicaciones y servicios',
        icon: Puzzle,
        href: '/app/settings/integrations',
        color: 'integrations',
        iconColor: 'var(--settings-integrations-icon)',
        bgColor: 'var(--settings-integrations-bg)',
        requiresAdmin: true,
        isNew: true,
        keywords: ['integraciones', 'api', 'conectar', 'apps', 'servicios', 'messenger'],
      },
      {
        id: 'pipeline',
        name: 'Pipeline',
        description: 'Personaliza etapas de leads y oportunidades',
        icon: GitBranch,
        href: '/app/settings/pipeline',
        color: 'pipeline',
        iconColor: 'var(--settings-pipeline-icon)',
        bgColor: 'var(--settings-pipeline-bg)',
        requiresAdmin: true,
        keywords: ['pipeline', 'etapas', 'leads', 'oportunidades', 'kanban'],
      },
      {
        id: 'activity',
        name: 'Actividad',
        description: 'Historial de acciones y auditoría de cuenta',
        icon: Activity,
        href: '/app/settings/activity',
        color: 'activity',
        iconColor: 'var(--settings-activity-icon)',
        bgColor: 'var(--settings-activity-bg)',
        keywords: ['actividad', 'historial', 'auditoría', 'logs', 'acciones'],
      },
      {
        id: 'ai',
        name: 'Asistente IA',
        description: 'Configura el asistente de inteligencia artificial',
        icon: Sparkles,
        href: '/app/settings/ai',
        color: 'ai',
        iconColor: 'var(--settings-ai-icon)',
        bgColor: 'var(--settings-ai-bg)',
        isNew: true,
        keywords: ['ia', 'ai', 'asistente', 'inteligencia artificial', 'chat', 'bot', 'llm'],
      },
    ],
  },
];

// Admin-only sections
export const ADMIN_SECTIONS: SettingsSection[] = [
  {
    id: 'admin',
    title: 'Administración',
    items: [
      {
        id: 'security',
        name: 'Seguridad',
        description: 'Autenticación, sesiones y políticas de seguridad',
        icon: Shield,
        href: '/app/settings/security',
        color: 'security',
        iconColor: 'var(--settings-security-icon)',
        bgColor: 'var(--settings-security-bg)',
        requiresAdmin: true,
        keywords: ['seguridad', 'autenticación', 'sesiones', 'políticas', '2fa'],
      },
      {
        id: 'data',
        name: 'Datos',
        description: 'Exportar, importar y eliminar datos',
        icon: Database,
        href: '/app/settings/data',
        color: 'data',
        iconColor: 'var(--settings-data-icon)',
        bgColor: 'var(--settings-data-bg)',
        requiresAdmin: true,
        keywords: ['datos', 'exportar', 'importar', 'eliminar', 'backup'],
      },
    ],
  },
];

// ============================================
// Flat list for backward compatibility
// ============================================

export const SETTINGS_CATEGORIES: SettingsCategory[] = SETTINGS_SECTIONS.flatMap(
  (section) => section.items.map((item) => ({
    ...item,
    badge: item.isNew ? 'Nuevo' : undefined,
  }))
);

// ============================================
// Searchable Items (for Command Palette)
// ============================================

export const SEARCHABLE_ITEMS: SearchableItem[] = [
  // Cuenta
  { category: 'profile', name: 'Cambiar nombre', href: '/app/settings/profile#name' },
  { category: 'profile', name: 'Cambiar email', href: '/app/settings/profile#email' },
  { category: 'profile', name: 'Cambiar contraseña', href: '/app/settings/profile#password' },
  { category: 'profile', name: 'Subir avatar', href: '/app/settings/profile#avatar' },
  { category: 'profile', name: 'Modo oscuro', href: '/app/settings/profile#theme' },
  { category: 'notifications', name: 'Notificaciones por email', href: '/app/settings/notifications#email' },
  { category: 'notifications', name: 'Notificaciones push', href: '/app/settings/notifications#push' },
  { category: 'notifications', name: 'Notificaciones WhatsApp', href: '/app/settings/notifications#whatsapp' },
  // Empresa
  { category: 'branding', name: 'Cambiar logo', href: '/app/settings/branding#logo' },
  { category: 'branding', name: 'Color primario', href: '/app/settings/branding#primary' },
  { category: 'branding', name: 'Color de acento', href: '/app/settings/branding#accent' },
  { category: 'branding', name: 'Color del sidebar', href: '/app/settings/branding#sidebar' },
  { category: 'branding', name: 'Personalizar colores', href: '/app/settings/branding' },
  { category: 'team', name: 'Invitar miembro', href: '/app/settings/team#invite' },
  { category: 'team', name: 'Gestionar roles', href: '/app/settings/team#roles' },
  { category: 'team', name: 'Ver miembros', href: '/app/settings/team' },
  { category: 'team', name: 'Etiquetas de usuario', href: '/app/settings/team/tags' },
  { category: 'team', name: 'Grupos de notificación', href: '/app/settings/team/tags' },
  { category: 'team', name: 'Tags de equipo', href: '/app/settings/team/tags' },
  // Operaciones
  { category: 'billing', name: 'Cambiar plan', href: '/app/settings/billing#plan' },
  { category: 'billing', name: 'Métodos de pago', href: '/app/settings/billing#payment' },
  { category: 'billing', name: 'Historial de facturas', href: '/app/settings/billing#invoices' },
  { category: 'messaging', name: 'Plantillas de email', href: '/app/settings/messaging/templates' },
  { category: 'messaging', name: 'Historial de mensajes', href: '/app/settings/messaging/logs' },
  // Propuestas
  { category: 'proposals', name: 'Plantillas de propuesta', href: '/app/settings/proposals' },
  { category: 'proposals', name: 'Formato de PDF', href: '/app/settings/proposals#format' },
  { category: 'proposals', name: 'Colores de propuesta', href: '/app/settings/proposals#colors' },
  { category: 'proposals', name: 'Secciones de cotización', href: '/app/settings/proposals#sections' },
  // Avanzado
  { category: 'integrations', name: 'Conectar WhatsApp Business', href: '/app/settings/integrations#whatsapp' },
  { category: 'integrations', name: 'Conectar Messenger', href: '/app/settings/integrations/messenger' },
  { category: 'integrations', name: 'API Keys', href: '/app/settings/integrations#api' },
  { category: 'pipeline', name: 'Etapas de leads', href: '/app/settings/pipeline#leads' },
  { category: 'pipeline', name: 'Etapas de oportunidades', href: '/app/settings/pipeline#opportunities' },
  // IA
  { category: 'ai', name: 'Asistente IA', href: '/app/settings/ai' },
  { category: 'ai', name: 'Proveedor de IA', href: '/app/settings/ai#provider' },
  { category: 'ai', name: 'Habilitar sugerencias', href: '/app/settings/ai#suggestions' },
  { category: 'ai', name: 'Análisis de sentimiento', href: '/app/settings/ai#sentiment' },
  { category: 'ai', name: 'Scoring de leads IA', href: '/app/settings/ai#scoring' },
];

// ============================================
// Search Function
// ============================================

export function searchSettings(query: string): SettingsItem[] {
  if (!query.trim()) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const results: SettingsItem[] = [];

  SETTINGS_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      const matchesName = item.name.toLowerCase().includes(normalizedQuery);
      const matchesDescription = item.description.toLowerCase().includes(normalizedQuery);
      const matchesKeywords = item.keywords.some((kw) => kw.includes(normalizedQuery));

      if (matchesName || matchesDescription || matchesKeywords) {
        results.push(item);
      }
    });
  });

  return results;
}

// ============================================
// Helper Functions
// ============================================

export function getCategoryById(id: string): SettingsItem | undefined {
  for (const section of SETTINGS_SECTIONS) {
    const item = section.items.find((i) => i.id === id);
    if (item) return item;
  }
  for (const section of ADMIN_SECTIONS) {
    const item = section.items.find((i) => i.id === id);
    if (item) return item;
  }
  return undefined;
}

export function getCategoryByHref(href: string): SettingsItem | undefined {
  const normalizedHref = href.split('#')[0]?.split('?')[0] ?? href;

  const matchItem = (item: SettingsItem): boolean => {
    const itemHref = item.href.split('#')[0] ?? item.href;
    return normalizedHref.startsWith(itemHref);
  };

  for (const section of SETTINGS_SECTIONS) {
    const item = section.items.find(matchItem);
    if (item) return item;
  }
  for (const section of ADMIN_SECTIONS) {
    const item = section.items.find(matchItem);
    if (item) return item;
  }
  return undefined;
}

export function getColorConfig(color: SettingsCategoryColor) {
  return settingsCategoryColors[color] || settingsCategoryColors.profile;
}

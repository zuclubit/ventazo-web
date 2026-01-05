import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 * This function combines clsx for conditional classes and tailwind-merge
 * to properly handle Tailwind CSS class conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'MXN',
  locale: string = 'es-MX'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a date relative to now
 */
export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'hace un momento';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
  }

  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date to a readable string
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get score category based on lead score
 */
export function getScoreCategory(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 61) return 'hot';
  if (score >= 41) return 'warm';
  return 'cold';
}

/**
 * Get status color class based on lead status
 */
export function getStatusColorClass(status: string): string {
  const statusColors: Record<string, string> = {
    new: 'status-new',
    contacted: 'status-contacted',
    qualified: 'status-qualified',
    proposal: 'status-proposal',
    negotiation: 'status-negotiation',
    won: 'status-won',
    lost: 'status-lost',
  };

  return statusColors[status] ?? 'status-new';
}

// =============================================================================
// Dynamic Avatar Colors
// =============================================================================

/**
 * Color palette for dynamic avatar backgrounds
 * These colors are carefully selected to:
 * - Work well in both light and dark modes
 * - Be visually distinct from each other
 * - Provide good contrast with white text
 * - Follow modern design aesthetics (Slack/Discord style)
 */
const AVATAR_COLORS = [
  { bg: '#6366f1', text: '#ffffff' }, // Indigo
  { bg: '#8b5cf6', text: '#ffffff' }, // Violet
  { bg: '#a855f7', text: '#ffffff' }, // Purple
  { bg: '#d946ef', text: '#ffffff' }, // Fuchsia
  { bg: '#ec4899', text: '#ffffff' }, // Pink
  { bg: '#f43f5e', text: '#ffffff' }, // Rose
  { bg: '#ef4444', text: '#ffffff' }, // Red
  { bg: '#f97316', text: '#ffffff' }, // Orange
  { bg: '#eab308', text: '#1f2937' }, // Yellow
  { bg: '#84cc16', text: '#1f2937' }, // Lime
  { bg: '#22c55e', text: '#ffffff' }, // Green
  { bg: '#10b981', text: '#ffffff' }, // Emerald
  { bg: '#14b8a6', text: '#ffffff' }, // Teal
  { bg: '#06b6d4', text: '#ffffff' }, // Cyan
  { bg: '#0ea5e9', text: '#ffffff' }, // Sky
  { bg: '#3b82f6', text: '#ffffff' }, // Blue
] as const;

/**
 * Generate a simple hash from a string
 * Used to consistently map names to colors
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent color pair for an avatar based on name or ID
 * Returns the same color for the same input every time
 */
export function getAvatarColor(identifier: string): { bg: string; text: string } {
  const defaultColor = { bg: '#6366f1', text: '#ffffff' };
  if (!identifier) {
    return AVATAR_COLORS[0] ?? defaultColor;
  }
  const hash = hashString(identifier.toLowerCase().trim());
  const index = hash % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? defaultColor;
}

/**
 * Get avatar color as Tailwind-compatible inline style
 */
export function getAvatarStyle(identifier: string): React.CSSProperties {
  const colors = getAvatarColor(identifier);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
  };
}

/**
 * Get a CSS class string for avatar colors (for SSR compatibility)
 * Returns a data attribute that can be styled with CSS
 */
export function getAvatarColorClass(identifier: string): string {
  const hash = hashString((identifier || '').toLowerCase().trim());
  const index = hash % AVATAR_COLORS.length;
  return `avatar-color-${index}`;
}

// =============================================================================
// Mention Parsing and Rendering
// =============================================================================

export interface ParsedMention {
  type: 'user' | 'group';
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse mentions from comment content
 * Format: @[Name](userId) or @[GroupName](tag:tagId)
 */
export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  const mentionRegex = /@\[([^\]]+)\]\((?:tag:)?([^)]+)\)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const isGroup = match[0].includes('tag:');
    const name = match[1];
    const id = match[2];
    if (name && id) {
      mentions.push({
        type: isGroup ? 'group' : 'user',
        name,
        id,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return mentions;
}

/**
 * Convert content with mentions to HTML with styled spans
 */
export function renderContentWithMentions(content: string): string {
  const mentionRegex = /@\[([^\]]+)\]\((?:tag:)?([^)]+)\)/g;

  return content.replace(mentionRegex, (match, name, id) => {
    const isGroup = match.includes('tag:');
    const mentionClass = isGroup
      ? 'mention mention-group'
      : 'mention mention-user';
    const icon = isGroup ? '👥 ' : '';
    return `<span class="${mentionClass}" data-id="${id}">${icon}@${name}</span>`;
  });
}

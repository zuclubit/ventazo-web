'use client';

/**
 * useCalendarTheme Hook
 *
 * Dynamic theming for the Calendar module.
 * ALL colors are derived from tenant branding stored in the database.
 * No hardcoded colors - everything is dynamic based on tenant settings.
 *
 * v4.0 - Modern Calendar Design with Full Dynamic Theming
 * - All colors derived from tenant branding (primaryColor, accentColor, surfaceColor, sidebarColor)
 * - Dark mode automatically handled via color transformations
 * - Surface colors used for backgrounds instead of hardcoded values
 * - New icon sidebar, header, and search support (matching email module v4.0)
 */

import * as React from 'react';

import { useTenantBranding } from '@/hooks/use-tenant-branding';

// ============================================
// Color Utilities
// ============================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || result.length < 4) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1] ?? '0', 16),
    g: parseInt(result[2] ?? '0', 16),
    b: parseInt(result[3] ?? '0', 16),
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
  return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
}

function darkenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const darken = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
}

// ============================================
// Hook
// ============================================

export function useCalendarTheme() {
  const { primaryColor, accentColor, surfaceColor, sidebarColor } = useTenantBranding();

  React.useEffect(() => {
    const root = document.documentElement;

    // Convert colors
    const primaryRgb = hexToRgb(primaryColor);
    const accentRgb = hexToRgb(accentColor);

    // ========== TENANT CORE ==========
    root.style.setProperty('--tenant-primary', primaryColor);
    root.style.setProperty('--tenant-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    root.style.setProperty('--tenant-primary-hover', darkenColor(primaryColor, 0.1));
    root.style.setProperty('--tenant-primary-light', hexToRgba(primaryColor, 0.15));
    root.style.setProperty('--tenant-primary-lighter', hexToRgba(primaryColor, 0.08));
    root.style.setProperty('--tenant-primary-glow', hexToRgba(primaryColor, 0.2));
    root.style.setProperty('--tenant-accent', accentColor);
    root.style.setProperty('--tenant-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    root.style.setProperty('--tenant-accent-light', hexToRgba(accentColor, 0.15));
    root.style.setProperty('--tenant-accent-glow', hexToRgba(accentColor, 0.2));
    root.style.setProperty('--tenant-surface', surfaceColor);

    // ========== CALENDAR CONTAINER (derived from surfaceColor) ==========
    root.style.setProperty('--calendar-bg', surfaceColor);
    root.style.setProperty('--calendar-border', lightenColor(surfaceColor, 0.2));
    root.style.setProperty('--calendar-header-bg', lightenColor(surfaceColor, 0.08));

    // ========== CALENDAR SURFACE COLORS ==========
    root.style.setProperty('--calendar-surface', surfaceColor);
    root.style.setProperty('--calendar-surface-light', lightenColor(surfaceColor, 0.1));
    root.style.setProperty('--calendar-surface-lighter', lightenColor(surfaceColor, 0.15));
    root.style.setProperty('--calendar-surface-border', lightenColor(surfaceColor, 0.2));
    root.style.setProperty('--calendar-surface-hover', lightenColor(surfaceColor, 0.08));

    // ========== CALENDAR TEXT ==========
    root.style.setProperty('--calendar-text-primary', '#f1f5f9');
    root.style.setProperty('--calendar-text-secondary', '#cbd5e1');
    root.style.setProperty('--calendar-text-muted', lightenColor(surfaceColor, 0.5));

    // ========== CALENDAR GRID ==========
    root.style.setProperty('--calendar-day-bg', lightenColor(surfaceColor, 0.05));
    root.style.setProperty('--calendar-day-hover', hexToRgba(primaryColor, 0.12));
    root.style.setProperty('--calendar-today-bg', hexToRgba(primaryColor, 0.2));
    root.style.setProperty('--calendar-today-border', primaryColor);
    root.style.setProperty('--calendar-weekend-bg', darkenColor(surfaceColor, 0.1));

    // ========== CALENDAR EVENTS (from primary/accent) ==========
    root.style.setProperty('--calendar-event-bg', primaryColor);
    root.style.setProperty('--calendar-event-text', '#ffffff');
    root.style.setProperty('--calendar-event-hover', darkenColor(primaryColor, 0.1));
    root.style.setProperty('--calendar-event-border', lightenColor(primaryColor, 0.2));

    // ========== EVENT TYPE COLORS (CRM entities) ==========
    root.style.setProperty('--cal-event-lead', '#8B5CF6');
    root.style.setProperty('--cal-event-customer', '#10B981');
    root.style.setProperty('--cal-event-opportunity', '#F59E0B');
    root.style.setProperty('--cal-event-task', '#3B82F6');
    root.style.setProperty('--cal-event-confirmed', primaryColor);
    root.style.setProperty('--cal-event-tentative', lightenColor(surfaceColor, 0.4));
    root.style.setProperty('--cal-event-cancelled', '#EF4444');

    // ========== CALENDAR TIME SLOTS ==========
    root.style.setProperty('--calendar-slot-border', lightenColor(surfaceColor, 0.15));
    root.style.setProperty('--calendar-slot-hover', hexToRgba(primaryColor, 0.08));
    root.style.setProperty('--calendar-now-indicator', '#ef4444');

    // ========== CALENDAR BUTTONS ==========
    root.style.setProperty('--calendar-btn-primary-bg', primaryColor);
    root.style.setProperty('--calendar-btn-primary-hover', darkenColor(primaryColor, 0.1));
    root.style.setProperty('--calendar-btn-primary-text', '#ffffff');
    root.style.setProperty('--calendar-btn-ghost-hover', hexToRgba(primaryColor, 0.15));

    // ========== PROVIDER COLORS (fixed for brand recognition) ==========
    root.style.setProperty('--calendar-google', '#4285f4');
    root.style.setProperty('--calendar-outlook', '#0078d4');

    // ========== VIEW TOGGLE ==========
    root.style.setProperty('--calendar-view-active-bg', hexToRgba(primaryColor, 0.25));
    root.style.setProperty('--calendar-view-active-text', lightenColor(primaryColor, 0.3));
    root.style.setProperty('--calendar-view-inactive-hover', lightenColor(surfaceColor, 0.08));

    // ========== ATTENDEE STATUS COLORS ==========
    root.style.setProperty('--calendar-attendee-accepted', '#22c55e');
    root.style.setProperty('--calendar-attendee-declined', '#ef4444');
    root.style.setProperty('--calendar-attendee-tentative', '#f59e0b');
    root.style.setProperty('--calendar-attendee-pending', lightenColor(surfaceColor, 0.4));

    // ========== SYNC STATUS COLORS ==========
    // Synced - Green
    root.style.setProperty('--calendar-sync-synced', '#22c55e');
    root.style.setProperty('--calendar-sync-synced-bg', hexToRgba('#22c55e', 0.1));
    // Pending - Blue
    root.style.setProperty('--calendar-sync-pending', '#3b82f6');
    root.style.setProperty('--calendar-sync-pending-bg', hexToRgba('#3b82f6', 0.1));
    // Error - Red
    root.style.setProperty('--calendar-sync-error', '#ef4444');
    root.style.setProperty('--calendar-sync-error-bg', hexToRgba('#ef4444', 0.1));
    // Conflict - Orange
    root.style.setProperty('--calendar-sync-conflict', '#f97316');
    root.style.setProperty('--calendar-sync-conflict-bg', hexToRgba('#f97316', 0.1));

    // ========== INPUT COLORS ==========
    root.style.setProperty('--calendar-input-bg', lightenColor(surfaceColor, 0.08));
    root.style.setProperty('--calendar-input-border', lightenColor(surfaceColor, 0.2));

    // ========== CALENDAR ICON SIDEBAR (New Modern Sidebar) ==========
    root.style.setProperty('--calendar-icon-sidebar-bg', sidebarColor);
    root.style.setProperty('--calendar-icon-sidebar-bg-end', darkenColor(sidebarColor, 0.1));

    // ========== CALENDAR HEADER (New Modern Header) ==========
    root.style.setProperty('--calendar-header-bg', lightenColor(surfaceColor, 0.05));

    // ========== CALENDAR SEARCH (Modern Search Bar) ==========
    root.style.setProperty('--calendar-search-bg', lightenColor(surfaceColor, 0.1));
    root.style.setProperty('--calendar-search-border', lightenColor(surfaceColor, 0.2));

    // ========== CALENDAR TOOLTIP ==========
    root.style.setProperty('--calendar-tooltip-bg', darkenColor(surfaceColor, 0.2));

    // Cleanup on unmount
    return () => {
      const calendarVars = [
        '--calendar-bg', '--calendar-border', '--calendar-header-bg',
        '--calendar-surface', '--calendar-surface-light', '--calendar-surface-lighter',
        '--calendar-surface-border', '--calendar-surface-hover',
        '--calendar-text-primary', '--calendar-text-secondary', '--calendar-text-muted',
        '--calendar-day-bg', '--calendar-day-hover', '--calendar-today-bg',
        '--calendar-event-bg', '--calendar-event-text', '--calendar-slot-border',
        '--calendar-btn-primary-bg', '--calendar-view-active-bg',
        '--cal-event-lead', '--cal-event-customer', '--cal-event-opportunity',
        '--cal-event-task', '--cal-event-confirmed', '--cal-event-tentative',
        '--calendar-attendee-accepted', '--calendar-attendee-declined',
        '--calendar-input-bg', '--calendar-input-border',
        '--calendar-icon-sidebar-bg', '--calendar-icon-sidebar-bg-end',
        '--calendar-search-bg', '--calendar-search-border',
        '--calendar-tooltip-bg',
      ];
      calendarVars.forEach((v) => root.style.removeProperty(v));
    };
  }, [primaryColor, accentColor, surfaceColor, sidebarColor]);
}

export default useCalendarTheme;

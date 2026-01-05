'use client';

/**
 * useCampaignTheme Hook
 *
 * Dynamic theming for the Campaigns module.
 * Sets CSS variables based on tenant branding.
 * Follows the same pattern as useKanbanTheme and useEmailTheme.
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

export function useCampaignTheme() {
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
    root.style.setProperty('--tenant-primary-light', lightenColor(primaryColor, 0.85));
    root.style.setProperty('--tenant-primary-lighter', lightenColor(primaryColor, 0.92));
    root.style.setProperty('--tenant-primary-glow', hexToRgba(primaryColor, 0.25));
    root.style.setProperty('--tenant-accent', accentColor);
    root.style.setProperty('--tenant-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    root.style.setProperty('--tenant-accent-light', lightenColor(accentColor, 0.85));
    root.style.setProperty('--tenant-accent-glow', hexToRgba(accentColor, 0.25));
    root.style.setProperty('--tenant-surface', surfaceColor);

    // ========== CAMPAIGN CARD ==========
    root.style.setProperty('--campaign-card-border', lightenColor(primaryColor, 0.7));
    root.style.setProperty('--campaign-card-border-hover', primaryColor);
    root.style.setProperty('--campaign-card-accent', primaryColor);
    root.style.setProperty('--campaign-card-bg-hover', lightenColor(primaryColor, 0.95));

    // ========== CAMPAIGN STATUS COLORS ==========
    root.style.setProperty('--campaign-status-draft', '#6B7280'); // Gray
    root.style.setProperty('--campaign-status-scheduled', '#3B82F6'); // Blue
    root.style.setProperty('--campaign-status-sending', primaryColor);
    root.style.setProperty('--campaign-status-sent', '#10B981'); // Green
    root.style.setProperty('--campaign-status-paused', '#F59E0B'); // Amber
    root.style.setProperty('--campaign-status-cancelled', '#EF4444'); // Red

    // ========== CAMPAIGN STATS ==========
    root.style.setProperty('--campaign-stat-sent', primaryColor);
    root.style.setProperty('--campaign-stat-delivered', '#10B981');
    root.style.setProperty('--campaign-stat-opened', '#3B82F6');
    root.style.setProperty('--campaign-stat-clicked', accentColor);
    root.style.setProperty('--campaign-stat-bounced', '#EF4444');

    // ========== CAMPAIGN EDITOR ==========
    root.style.setProperty('--campaign-editor-toolbar', surfaceColor);
    root.style.setProperty('--campaign-editor-toolbar-text', '#ffffff');
    root.style.setProperty('--campaign-editor-block-border', lightenColor(primaryColor, 0.8));
    root.style.setProperty('--campaign-editor-block-selected', hexToRgba(primaryColor, 0.15));

    // ========== CAMPAIGN PREVIEW ==========
    root.style.setProperty('--campaign-preview-bg', '#f9fafb');
    root.style.setProperty('--campaign-preview-border', '#e5e7eb');
    root.style.setProperty('--campaign-preview-device-active', primaryColor);

    // ========== RECIPIENT SELECTOR ==========
    root.style.setProperty('--campaign-recipient-selected', hexToRgba(primaryColor, 0.1));
    root.style.setProperty('--campaign-recipient-hover', hexToRgba(primaryColor, 0.05));
    root.style.setProperty('--campaign-recipient-checkbox', primaryColor);

    // Cleanup on unmount
    return () => {
      const campaignVars = [
        '--campaign-card-border', '--campaign-card-accent',
        '--campaign-status-draft', '--campaign-status-sending',
        '--campaign-stat-sent', '--campaign-editor-toolbar',
      ];
      campaignVars.forEach((v) => root.style.removeProperty(v));
    };
  }, [primaryColor, accentColor, surfaceColor, sidebarColor]);
}

export default useCampaignTheme;

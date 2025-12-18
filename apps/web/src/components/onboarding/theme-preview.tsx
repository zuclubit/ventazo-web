'use client';

// ============================================
// ThemePreview Component
// Real-time preview of branding colors
// ============================================

import * as React from 'react';
import {
  Users,
  TrendingUp,
  CheckCircle2,
  Bell,
  Search,
  Settings,
  LayoutDashboard,
  Target,
  FileText,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { getOptimalForeground, darken, lighten } from '@/lib/theme';

// ============================================
// Types
// ============================================

interface ThemePreviewProps {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
  companyName?: string;
  className?: string;
}

// ============================================
// Mini Components for Preview
// ============================================

interface PreviewButtonProps {
  primary?: boolean;
  secondary?: boolean;
  outline?: boolean;
  primaryColor: string;
  secondaryColor: string;
  children: React.ReactNode;
}

function PreviewButton({
  primary,
  secondary,
  outline,
  primaryColor,
  secondaryColor,
  children,
}: PreviewButtonProps) {
  const bgColor = primary ? primaryColor : secondary ? secondaryColor : 'transparent';
  const textColor = outline
    ? primaryColor
    : getOptimalForeground(primary ? primaryColor : secondaryColor);

  return (
    <button
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
        outline && 'border'
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor: outline ? primaryColor : undefined,
      }}
    >
      {children}
    </button>
  );
}

interface PreviewCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  primaryColor: string;
  /** Card text colors - derived from theme */
  textColor?: string;
  mutedTextColor?: string;
}

function PreviewCard({
  title,
  value,
  icon: Icon,
  trend,
  primaryColor,
  textColor = 'hsl(var(--foreground))',
  mutedTextColor = 'hsl(var(--muted-foreground))',
}: PreviewCardProps) {
  return (
    <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium" style={{ color: mutedTextColor }}>
          {title}
        </span>
        <div
          className="p-1.5 rounded-md"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <Icon className="h-3 w-3" style={{ color: primaryColor }} />
        </div>
      </div>
      <div className="text-lg font-bold" style={{ color: textColor }}>
        {value}
      </div>
      {trend && (
        <div className="text-[10px] flex items-center gap-0.5 mt-1" style={{ color: 'hsl(var(--success))' }}>
          <TrendingUp className="h-2.5 w-2.5" />
          {trend}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ThemePreview({
  primaryColor,
  secondaryColor,
  logoUrl,
  companyName = 'Tu Empresa',
  className,
}: ThemePreviewProps) {
  const sidebarBg = darken(primaryColor, 35);
  const sidebarText = getOptimalForeground(sidebarBg);
  const initials = companyName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('rounded-xl border shadow-lg overflow-hidden', className)}>
      {/* Preview Header Label */}
      <div className="bg-muted/50 px-3 py-1.5 border-b flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Vista previa del CRM
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          En vivo
        </span>
      </div>

      {/* App Preview */}
      <div className="flex h-[320px] bg-gray-100">
        {/* Sidebar */}
        <div
          className="w-[180px] flex-shrink-0 flex flex-col"
          style={{ backgroundColor: sidebarBg }}
        >
          {/* Logo/Brand Area */}
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-8 w-8 rounded-lg object-contain bg-white"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: primaryColor,
                    color: getOptimalForeground(primaryColor),
                  }}
                >
                  {initials}
                </div>
              )}
              <span
                className="text-sm font-semibold truncate"
                style={{ color: sidebarText }}
              >
                {companyName}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1">
            {[
              { icon: LayoutDashboard, label: 'Dashboard', active: true },
              { icon: Users, label: 'Leads' },
              { icon: Target, label: 'Oportunidades' },
              { icon: CheckCircle2, label: 'Tareas' },
              { icon: FileText, label: 'Reportes' },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                  item.active && 'font-medium'
                )}
                style={{
                  backgroundColor: item.active ? `${lighten(sidebarBg, 10)}` : 'transparent',
                  color: item.active ? sidebarText : `${sidebarText}99`,
                }}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
            ))}
          </nav>

          {/* User Area */}
          <div
            className="p-3 border-t border-white/10"
            style={{ color: `${sidebarText}99` }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: secondaryColor,
                  color: getOptimalForeground(secondaryColor),
                }}
              >
                U
              </div>
              <span className="text-xs truncate">Usuario Demo</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar - uses theme variables */}
          <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Buscar...</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-md transition-colors hover:bg-muted">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </button>
              <button className="p-1.5 rounded-md transition-colors hover:bg-muted">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Dashboard Content - uses theme background */}
          <div className="flex-1 p-4 overflow-auto bg-background">
            {/* Welcome - uses foreground color */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">
                Bienvenido a {companyName}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Resumen de hoy
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <PreviewCard
                title="Leads"
                value="124"
                icon={Users}
                trend="+12%"
                primaryColor={primaryColor}
              />
              <PreviewCard
                title="Oportunidades"
                value="$45.2K"
                icon={Target}
                trend="+8%"
                primaryColor={primaryColor}
              />
              <PreviewCard
                title="Tareas"
                value="18"
                icon={CheckCircle2}
                primaryColor={primaryColor}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <PreviewButton primary primaryColor={primaryColor} secondaryColor={secondaryColor}>
                Nuevo Lead
              </PreviewButton>
              <PreviewButton secondary primaryColor={primaryColor} secondaryColor={secondaryColor}>
                Ver Todo
              </PreviewButton>
              <PreviewButton outline primaryColor={primaryColor} secondaryColor={secondaryColor}>
                Exportar
              </PreviewButton>
            </div>

            {/* Mini Table Preview - uses theme card colors */}
            <div className="mt-4 bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <div
                className="px-3 py-2 border-b border-border text-xs font-medium"
                style={{ color: primaryColor }}
              >
                Ultimos leads
              </div>
              <div className="divide-y divide-border">
                {['Juan Perez', 'Maria Garcia', 'Carlos Lopez'].map((name, i) => (
                  <div
                    key={name}
                    className="px-3 py-2 flex items-center justify-between text-[10px]"
                  >
                    <span className="text-foreground">{name}</span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[8px] font-medium"
                      style={{
                        backgroundColor: i === 0 ? 'hsl(var(--success) / 0.1)' : i === 1 ? `${secondaryColor}15` : `${primaryColor}15`,
                        color: i === 0 ? 'hsl(var(--success))' : i === 1 ? secondaryColor : primaryColor,
                      }}
                    >
                      {i === 0 ? 'Calificado' : i === 1 ? 'Nuevo' : 'Contactado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Compact Preview (for smaller spaces)
// ============================================

interface CompactThemePreviewProps {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
  companyName?: string;
  className?: string;
}

export function CompactThemePreview({
  primaryColor,
  secondaryColor,
  logoUrl,
  companyName = 'Tu Empresa',
  className,
}: CompactThemePreviewProps) {
  const initials = companyName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4 space-y-3', className)}>
      <p className="text-sm text-muted-foreground font-medium">Vista previa:</p>

      <div className="flex items-center gap-4">
        {/* Logo/Avatar */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-12 w-12 rounded-lg object-contain bg-card border border-border"
          />
        ) : (
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{
              backgroundColor: primaryColor,
              color: getOptimalForeground(primaryColor),
            }}
          >
            {initials}
          </div>
        )}

        {/* Text Preview - uses theme-aware colors */}
        <div className="flex-1">
          <p
            className="font-semibold"
            style={{ color: primaryColor }}
          >
            {companyName}
          </p>
          <p
            className="text-sm"
            style={{ color: secondaryColor }}
          >
            CRM Profesional
          </p>
        </div>
      </div>

      {/* Color Swatches with adaptive labels */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded border border-border flex items-center justify-center text-[8px] font-bold"
            style={{
              backgroundColor: primaryColor,
              color: getOptimalForeground(primaryColor),
            }}
          >
            Aa
          </div>
          <span className="text-xs text-muted-foreground">Primario</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded border border-border flex items-center justify-center text-[8px] font-bold"
            style={{
              backgroundColor: secondaryColor,
              color: getOptimalForeground(secondaryColor),
            }}
          >
            Aa
          </div>
          <span className="text-xs text-muted-foreground">Secundario</span>
        </div>
      </div>

      {/* Button Samples with adaptive foreground */}
      <div className="flex gap-2">
        <button
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
          style={{
            backgroundColor: primaryColor,
            color: getOptimalForeground(primaryColor),
          }}
        >
          Boton Primario
        </button>
        <button
          className="px-3 py-1.5 rounded-md text-xs font-medium border transition-opacity hover:opacity-80"
          style={{
            borderColor: primaryColor,
            color: primaryColor,
          }}
        >
          Secundario
        </button>
      </div>
    </div>
  );
}

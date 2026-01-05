'use client';

/**
 * Branding Settings Page
 *
 * Allows administrators to customize the tenant's visual identity:
 * - Logo upload
 * - 4-color semantic palette (Primary, Accent, Sidebar, Surface)
 * - Live preview
 * - Company display name
 *
 * Fully responsive layout with clear color visualization.
 *
 * @module settings/branding
 */

import * as React from 'react';
import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  X,
  Eye,
  Lightbulb,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { useTenantStore } from '@/store/tenant.store';
import { useAuthStore } from '@/store';
import {
  extractColorsFromImage,
  suggest4ColorPalette,
  getOptimalForeground,
  type SemanticBrandPalette,
} from '@/lib/theme';
import { cn } from '@/lib/utils';

// ============================================
// Constants
// ============================================

const DEFAULT_COLORS = {
  primary: '#0EB58C',
  accent: '#5EEAD4',
  sidebar: '#003C3B',
  surface: '#052828',
};

// ============================================
// Types
// ============================================

interface BrandingFormData {
  logo: string | null;
  companyDisplayName: string;
  primaryColor: string;
  accentColor: string;
  sidebarColor: string;
  surfaceColor: string;
}

// ============================================
// Color Picker Component - Enhanced
// ============================================

interface ColorPickerProps {
  label: string;
  description: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({
  label,
  description,
  value,
  onChange,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = React.useState(value);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Only update if valid hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const foregroundColor = getOptimalForeground(value);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/50">
      {/* Color Swatch - Large and prominent */}
      <div className="relative shrink-0">
        <input
          type="color"
          value={value}
          onChange={handleColorPickerChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl shadow-lg cursor-pointer border-2 border-white/20 flex items-center justify-center transition-transform hover:scale-105"
          style={{ backgroundColor: value }}
        >
          <Palette className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: foregroundColor }} />
        </div>
      </div>

      {/* Label and Input */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <Label className="text-sm font-semibold">{label}</Label>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            className="w-full sm:w-28 font-mono text-sm h-9 text-center uppercase"
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Color Palette Visual Summary
// ============================================

interface ColorPaletteSummaryProps {
  colors: {
    primary: string;
    accent: string;
    sidebar: string;
    surface: string;
  };
}

function ColorPaletteSummary({ colors }: ColorPaletteSummaryProps) {
  const colorItems = [
    { key: 'primary', label: 'Primario', color: colors.primary },
    { key: 'accent', label: 'Acento', color: colors.accent },
    { key: 'sidebar', label: 'Sidebar', color: colors.sidebar },
    { key: 'surface', label: 'Superficie', color: colors.surface },
  ];

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Tu Paleta</span>
      </div>

      {/* Color Swatches Row */}
      <div className="flex gap-2">
        {colorItems.map((item) => {
          const fg = getOptimalForeground(item.color);
          return (
            <div key={item.key} className="flex-1 text-center">
              <div
                className="w-full aspect-square rounded-lg shadow-md mb-1.5 flex items-center justify-center text-[10px] font-medium border border-white/10"
                style={{ backgroundColor: item.color, color: fg }}
              >
                {item.color.toUpperCase()}
              </div>
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Live Preview Component - Enhanced
// ============================================

interface LivePreviewProps {
  colors: {
    primary: string;
    accent: string;
    sidebar: string;
    surface: string;
  };
  logo: string | null;
  companyName: string;
}

function LivePreview({ colors, logo, companyName }: LivePreviewProps) {
  const primaryFg = getOptimalForeground(colors.primary);
  const sidebarFg = getOptimalForeground(colors.sidebar);
  const surfaceFg = getOptimalForeground(colors.surface);
  const accentFg = getOptimalForeground(colors.accent);

  return (
    <div className="rounded-xl border-2 border-border overflow-hidden shadow-xl bg-background">
      {/* Preview Header */}
      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Vista Previa en Vivo</span>
      </div>

      {/* Mini App Preview */}
      <div className="flex" style={{ minHeight: '220px' }}>
        {/* Sidebar Preview */}
        <div
          className="w-14 sm:w-16 flex flex-col items-center py-3 gap-2 shrink-0"
          style={{ backgroundColor: colors.sidebar }}
        >
          {/* Logo */}
          {logo ? (
            <img
              src={logo}
              alt="Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-contain bg-white/10 p-0.5"
            />
          ) : (
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm"
              style={{ backgroundColor: colors.primary, color: primaryFg }}
            >
              {companyName?.[0] || 'V'}
            </div>
          )}

          {/* Nav Items */}
          <div className="flex flex-col gap-1.5 mt-2 w-full px-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-full aspect-square rounded-lg flex items-center justify-center transition-all"
                style={{
                  backgroundColor: i === 1 ? `${colors.primary}25` : 'transparent',
                  border: i === 1 ? `2px solid ${colors.primary}` : '2px solid transparent',
                }}
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor: i === 1 ? colors.primary : `${sidebarFg}30`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 bg-background p-3 sm:p-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-16 sm:w-24 h-3 bg-foreground/70 rounded" />
            </div>
            <button
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold shadow-sm"
              style={{ backgroundColor: colors.primary, color: primaryFg }}
            >
              + Nuevo
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[colors.primary, colors.accent, colors.sidebar].map((color, i) => (
              <div
                key={i}
                className="p-2 rounded-lg text-center"
                style={{
                  backgroundColor: `${color}15`,
                  border: `1px solid ${color}30`,
                }}
              >
                <div className="text-sm sm:text-base font-bold" style={{ color }}>
                  {[12, 8, 5][i]}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {['Leads', 'Tareas', 'Ventas'][i]}
                </div>
              </div>
            ))}
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-2.5 sm:p-3 rounded-lg shadow-sm"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.accent}20`,
                }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0"
                    style={{ backgroundColor: colors.accent }}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="w-20 sm:w-28 h-2.5 rounded" style={{ backgroundColor: `${surfaceFg}60` }} />
                    <div className="w-14 sm:w-20 h-2 rounded" style={{ backgroundColor: `${surfaceFg}30` }} />
                  </div>
                  <div
                    className="px-2 py-0.5 rounded-full text-[9px] font-medium shrink-0"
                    style={{ backgroundColor: colors.primary, color: primaryFg }}
                  >
                    Activo
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="p-2.5 sm:p-3 bg-muted/40 border-t border-border">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs">
          {[
            { color: colors.sidebar, label: 'Sidebar' },
            { color: colors.primary, label: 'Primario' },
            { color: colors.accent, label: 'Acento' },
            { color: colors.surface, label: 'Superficie' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded shadow-sm border border-white/20"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function BrandingSettingsPage() {
  const { toast } = useToast();
  const branding = useTenantBranding();
  const { currentTenant, updateSettings } = useTenantStore();
  const user = useAuthStore((state) => state.user);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = React.useState<BrandingFormData>({
    logo: null,
    companyDisplayName: '',
    primaryColor: DEFAULT_COLORS.primary,
    accentColor: DEFAULT_COLORS.accent,
    sidebarColor: DEFAULT_COLORS.sidebar,
    surfaceColor: DEFAULT_COLORS.surface,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isExtractingColors, setIsExtractingColors] = React.useState(false);

  // Initialize form with current branding
  React.useEffect(() => {
    if (branding) {
      setFormData({
        logo: branding.logoUrl || null,
        companyDisplayName: currentTenant?.name || '',
        primaryColor: branding.primaryColor || DEFAULT_COLORS.primary,
        accentColor: branding.accentColor || DEFAULT_COLORS.accent,
        sidebarColor: branding.sidebarColor || DEFAULT_COLORS.sidebar,
        surfaceColor: branding.surfaceColor || DEFAULT_COLORS.surface,
      });
    }
  }, [branding, currentTenant]);

  // Track changes
  const updateFormData = (updates: Partial<BrandingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Handle logo upload
  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona una imagen valida',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'La imagen debe ser menor a 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Create local preview first
      const localPreview = URL.createObjectURL(file);
      updateFormData({ logo: localPreview });

      // Upload to server via BFF proxy
      const formDataUpload = new FormData();
      formDataUpload.append('logo', file);

      const response = await fetch('/api/proxy/tenant/logo', {
        method: 'POST',
        credentials: 'include',
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }

      const result = await response.json();
      updateFormData({ logo: result.data?.url || result.url });

      // Extract colors from logo
      setIsExtractingColors(true);
      try {
        const colors = await extractColorsFromImage(localPreview);
        if (colors && colors.length > 0) {
          const palette = suggest4ColorPalette(colors);
          if (palette) {
            updateFormData({
              primaryColor: palette.primaryColor,
              accentColor: palette.accentColor,
              sidebarColor: palette.sidebarColor,
              surfaceColor: palette.surfaceColor,
            });
            toast({
              title: 'Colores extraidos',
              description: 'Se sugirieron colores basados en tu logo',
            });
          }
        }
      } catch {
        // Color extraction failed, but logo uploaded successfully
      } finally {
        setIsExtractingColors(false);
      }

      toast({
        title: 'Logo actualizado',
        description: 'El logo se subio correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo subir el logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Use BFF proxy pattern - /api/proxy/tenant/branding (singular 'tenant')
      const response = await fetch('/api/proxy/tenant/branding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          logo: formData.logo,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.sidebarColor, // Backend uses secondaryColor for sidebar
          companyDisplayName: formData.companyDisplayName,
          // Extended branding
          accentColor: formData.accentColor,
          sidebarColor: formData.sidebarColor,
          surfaceColor: formData.surfaceColor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save branding');
      }

      // Update local store
      updateSettings({
        logo: formData.logo || undefined,
        primaryColor: formData.primaryColor,
        accentColor: formData.accentColor,
        sidebarColor: formData.sidebarColor,
        surfaceColor: formData.surfaceColor,
      });

      setHasChanges(false);

      toast({
        title: 'Branding guardado',
        description: 'Los cambios se aplicaran inmediatamente',
      });

      // Reload to apply changes
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setFormData({
      ...formData,
      primaryColor: DEFAULT_COLORS.primary,
      accentColor: DEFAULT_COLORS.accent,
      sidebarColor: DEFAULT_COLORS.sidebar,
      surfaceColor: DEFAULT_COLORS.surface,
    });
    setHasChanges(true);
  };

  // Get company initials
  const getInitials = () => {
    const name = formData.companyDisplayName || currentTenant?.name || '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CO';
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Page Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Marca y Colores</h2>
          <p className="text-sm text-muted-foreground">
            Personaliza la identidad visual de tu organizacion
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Restaurar</span>
            <span className="sm:hidden">Reset</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1 sm:flex-none"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Guardando...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Guardar Cambios</span>
                <span className="sm:hidden">Guardar</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Grid - Responsive */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
        {/* Left Column - Form (3/5 on lg) */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          {/* Logo & Company Name - Combined on mobile */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ImagePlus className="h-5 w-5" />
                Identidad
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Logo y nombre de tu empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative shrink-0">
                  <Avatar
                    className="h-20 w-20 sm:h-24 sm:w-24 cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors"
                    onClick={handleLogoClick}
                  >
                    <AvatarImage src={formData.logo || undefined} alt="Logo" />
                    <AvatarFallback className="text-xl sm:text-2xl bg-muted">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 sm:p-2 text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                    disabled={isUploadingLogo}
                    type="button"
                    onClick={handleLogoClick}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">
                    {formData.logo ? 'Logo cargado' : 'Sin logo'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG o SVG. Max 5MB.
                  </p>
                  {isExtractingColors && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-primary">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      Extrayendo colores...
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Company Name */}
              <div className="space-y-2">
                <Label className="text-sm">Nombre de la Empresa</Label>
                <Input
                  value={formData.companyDisplayName}
                  onChange={(e) =>
                    updateFormData({ companyDisplayName: e.target.value })
                  }
                  placeholder="Mi Empresa"
                  className="h-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Palette className="h-5 w-5" />
                Paleta de Colores
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Define los 4 colores principales de tu marca
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <ColorPicker
                label="Color Primario"
                description="Botones, CTAs y elementos principales"
                value={formData.primaryColor}
                onChange={(color) => updateFormData({ primaryColor: color })}
              />

              <ColorPicker
                label="Color de Acento"
                description="Enlaces, highlights y elementos secundarios"
                value={formData.accentColor}
                onChange={(color) => updateFormData({ accentColor: color })}
              />

              <ColorPicker
                label="Color del Sidebar"
                description="Fondo de la navegacion lateral"
                value={formData.sidebarColor}
                onChange={(color) => updateFormData({ sidebarColor: color })}
              />

              <ColorPicker
                label="Color de Superficie"
                description="Fondos de tarjetas y dropdowns"
                value={formData.surfaceColor}
                onChange={(color) => updateFormData({ surfaceColor: color })}
              />

              {/* Color Palette Summary */}
              <ColorPaletteSummary
                colors={{
                  primary: formData.primaryColor,
                  accent: formData.accentColor,
                  sidebar: formData.sidebarColor,
                  surface: formData.surfaceColor,
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview (2/5 on lg) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Sticky container for preview on large screens */}
          <div className="lg:sticky lg:top-4 space-y-4 sm:space-y-6">
            {/* Live Preview */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Vista Previa</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Asi se vera tu aplicacion
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <LivePreview
                  colors={{
                    primary: formData.primaryColor,
                    accent: formData.accentColor,
                    sidebar: formData.sidebarColor,
                    surface: formData.surfaceColor,
                  }}
                  logo={formData.logo}
                  companyName={formData.companyDisplayName || currentTenant?.name || ''}
                />
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Consejos de Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Primario:</strong> Usa el color principal de tu marca.
                </p>
                <p>
                  <strong className="text-foreground">Contraste:</strong> El texto debe ser legible.
                </p>
                <p>
                  <strong className="text-foreground">Consistencia:</strong> Usa los mismos colores siempre.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

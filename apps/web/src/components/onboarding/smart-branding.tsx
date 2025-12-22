'use client';

/**
 * Smart Branding Component
 *
 * Premium onboarding branding setup with:
 * - Logo upload with automatic color extraction
 * - AI-suggested brand colors from logo
 * - Elegant minimal UI with premium dark theme
 * - Live preview
 *
 * @module components/onboarding/smart-branding
 */

import * as React from 'react';
import {
  ImagePlus,
  Loader2,
  X,
  Upload,
  Sparkles,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/auth/token-manager';
import {
  extractColorsFromImage,
  suggest4ColorPalette,
  deriveFullPaletteFromPrimary,
  isValidHex,
  normalizeHex,
  getOptimalForeground,
  type ExtractedColor,
  type SemanticBrandPalette,
} from '@/lib/theme';

// ============================================
// Premium Styling Classes
// ============================================

const premiumInputClasses = cn(
  'h-10 rounded-lg border-white/10 bg-white/[0.03]',
  'text-white placeholder:text-[#7A8F8F]',
  'focus:border-[#0EB58C]/50 focus:ring-2 focus:ring-[#0EB58C]/20',
  'hover:border-white/20 transition-all duration-200'
);

// ============================================
// Types
// ============================================

/**
 * 4-Color Semantic Brand Palette for professional CRM theming
 */
export interface SmartBrandingProps {
  companyName: string;
  onCompanyNameChange: (name: string) => void;
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  /** Sidebar/navigation background color */
  sidebarColor: string;
  onSidebarColorChange: (color: string) => void;
  /** Main brand color for buttons, CTAs */
  primaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  /** Accent color for highlights, links */
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  /** Surface color for cards, dropdowns */
  surfaceColor: string;
  onSurfaceColorChange: (color: string) => void;
  isLoading?: boolean;
  uploadEndpoint?: string;
  translations?: {
    companyName?: string;
    companyNamePlaceholder?: string;
    uploadLogo?: string;
    detectingColors?: string;
    suggestedColors?: string;
    sidebarColor?: string;
    primaryColor?: string;
    accentColor?: string;
    surfaceColor?: string;
    preview?: string;
  };
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  localPreview: string | null;
}

// ============================================
// Component
// ============================================

export function SmartBranding({
  companyName,
  onCompanyNameChange,
  logoUrl,
  onLogoChange,
  sidebarColor,
  onSidebarColorChange,
  primaryColor,
  onPrimaryColorChange,
  accentColor,
  onAccentColorChange,
  surfaceColor,
  onSurfaceColorChange,
  isLoading = false,
  uploadEndpoint = '/api/upload/logo',
  translations: t = {},
}: SmartBrandingProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = React.useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    localPreview: null,
  });
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [extractedColors, setExtractedColors] = React.useState<ExtractedColor[]>([]);
  const [isExtractingColors, setIsExtractingColors] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Labels with defaults
  const labels = {
    companyName: t.companyName || 'Nombre de la empresa',
    companyNamePlaceholder: t.companyNamePlaceholder || 'Mi Empresa S.A.',
    uploadLogo: t.uploadLogo || 'Sube tu logo',
    detectingColors: t.detectingColors || 'Detectando colores...',
    suggestedColors: t.suggestedColors || 'Colores detectados',
    sidebarColor: t.sidebarColor || 'Sidebar',
    primaryColor: t.primaryColor || 'Principal',
    accentColor: t.accentColor || 'Acento',
    surfaceColor: t.surfaceColor || 'Superficie',
    preview: t.preview || 'Vista previa',
  };

  // Get initials for placeholder
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Apply a complete 4-color palette
  const applyPalette = React.useCallback((palette: SemanticBrandPalette) => {
    onSidebarColorChange(palette.sidebarColor);
    onPrimaryColorChange(palette.primaryColor);
    onAccentColorChange(palette.accentColor);
    onSurfaceColorChange(palette.surfaceColor);
  }, [onSidebarColorChange, onPrimaryColorChange, onAccentColorChange, onSurfaceColorChange]);

  // Extract colors from image
  const extractColors = React.useCallback(async (imageSource: string | File) => {
    setIsExtractingColors(true);
    try {
      const colors = await extractColorsFromImage(imageSource, 8, 7);
      setExtractedColors(colors);

      // Auto-suggest 4-color palette if we have results
      if (colors.length > 0) {
        const palette = suggest4ColorPalette(colors);
        applyPalette(palette);
      }
    } catch (error) {
      console.error('Color extraction failed:', error);
    } finally {
      setIsExtractingColors(false);
    }
  }, [applyPalette]);

  // Handle file upload
  const uploadFile = async (file: File) => {
    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      localPreview: URL.createObjectURL(file),
    });

    try {
      // Start color extraction in parallel
      extractColors(file);

      setUploadState((prev) => ({ ...prev, progress: 30 }));

      const formData = new FormData();
      formData.append('file', file, file.name);

      setUploadState((prev) => ({ ...prev, progress: 50 }));

      const accessToken = getAccessToken();
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      setUploadState((prev) => ({ ...prev, progress: 80 }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al subir el archivo');
      }

      const data = await response.json();
      const uploadedUrl = data.url;

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 100,
      }));

      onLogoChange(uploadedUrl);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Error al subir',
      }));
    }
  };

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0 || isLoading) return;

    const file = files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setUploadState((prev) => ({
        ...prev,
        error: 'Formato no válido. Usa JPG, PNG, WebP o SVG.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadState((prev) => ({
        ...prev,
        error: 'Archivo muy grande. Máximo 5MB.',
      }));
      return;
    }

    uploadFile(file);
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLoading && !uploadState.isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isLoading && !uploadState.isUploading) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Handle remove logo
  const handleRemoveLogo = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      localPreview: null,
    });
    setExtractedColors([]);
    onLogoChange(null);
  };

  // Apply a suggested color to a specific slot
  const applySuggestedColor = (color: string, type: 'sidebar' | 'primary' | 'accent' | 'surface') => {
    switch (type) {
      case 'sidebar':
        onSidebarColorChange(color);
        break;
      case 'primary':
        onPrimaryColorChange(color);
        break;
      case 'accent':
        onAccentColorChange(color);
        break;
      case 'surface':
        onSurfaceColorChange(color);
        break;
    }
  };

  // Generate full palette from a single primary color
  const generateFromPrimary = (hex: string) => {
    const palette = deriveFullPaletteFromPrimary(hex);
    applyPalette(palette);
  };

  const hasLogo = logoUrl || uploadState.localPreview;
  const hasExtractedColors = extractedColors.length > 0;

  return (
    <div className="space-y-6">
      {/* Company Name Input */}
      <div className="space-y-2">
        <Label htmlFor="companyName" className="text-[#E8ECEC] font-medium">
          {labels.companyName}
        </Label>
        <Input
          id="companyName"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          placeholder={labels.companyNamePlaceholder}
          disabled={isLoading}
          className={cn(premiumInputClasses, 'h-12')}
        />
      </div>

      {/* Logo Upload + Color Detection */}
      <div className="space-y-4">
        <Label className="text-[#E8ECEC] font-medium">{labels.uploadLogo}</Label>

        <div className="flex gap-4 items-start">
          {/* Logo Preview/Upload Area */}
          <div
            className={cn(
              'relative w-24 h-24 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer shrink-0',
              'border-2 border-dashed flex items-center justify-center',
              isDragOver && 'border-[#0EB58C] bg-[#0EB58C]/10',
              hasLogo ? 'border-transparent bg-white' : 'border-white/20 bg-white/[0.03] hover:border-white/30',
              (isLoading || uploadState.isUploading) && 'pointer-events-none opacity-60'
            )}
            onClick={() => !hasLogo && inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              disabled={isLoading || uploadState.isUploading}
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {uploadState.isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#001A1A]/90 z-10">
                <Loader2 className="h-5 w-5 animate-spin text-[#0EB58C]" />
                <span className="text-[10px] text-[#0EB58C] mt-1">{uploadState.progress}%</span>
              </div>
            )}

            {hasLogo ? (
              <>
                <img
                  src={uploadState.localPreview || logoUrl || ''}
                  alt="Logo"
                  className="w-full h-full object-contain p-2"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLogo();
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : companyName ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl font-bold text-[#0EB58C]">{getInitials(companyName)}</span>
                <Upload className="h-3 w-3 text-[#7A8F8F]" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <ImagePlus className="h-5 w-5 text-[#7A8F8F]" />
                <span className="text-[10px] text-[#7A8F8F]">Logo</span>
              </div>
            )}
          </div>

          {/* Color Selection Area */}
          <div className="flex-1 space-y-3">
            {/* Extracting indicator */}
            {isExtractingColors && (
              <div className="flex items-center gap-2 text-[#0EB58C] text-sm animate-pulse py-2">
                <Sparkles className="h-4 w-4" />
                <span>{labels.detectingColors}</span>
              </div>
            )}

            {/* Detected colors palette */}
            {hasExtractedColors && !isExtractingColors && (
              <div className="space-y-2">
                <p className="text-xs text-[#7A8F8F] flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#0EB58C]" />
                  {labels.suggestedColors}
                </p>
                <div className="flex flex-wrap gap-2">
                  {extractedColors.map((color, i) => {
                    const isSidebar = color.hex.toUpperCase() === sidebarColor.toUpperCase();
                    const isPrimary = color.hex.toUpperCase() === primaryColor.toUpperCase();
                    const isAccent = color.hex.toUpperCase() === accentColor.toUpperCase();
                    const isSurface = color.hex.toUpperCase() === surfaceColor.toUpperCase();
                    const isSelected = isSidebar || isPrimary || isAccent || isSurface;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => generateFromPrimary(color.hex)}
                        className={cn(
                          'relative w-9 h-9 rounded-lg transition-all hover:scale-110',
                          'border-2',
                          isSelected
                            ? 'border-white shadow-lg'
                            : 'border-white/20 hover:border-white/40'
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={`${color.hex} (${color.percentage}%) - Click para usar como base`}
                      >
                        {isPrimary && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0EB58C] rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                            P
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#7A8F8F]">
                  Click en un color para generar la paleta completa
                </p>
              </div>
            )}

            {/* Manual color entry when no extracted colors */}
            {!hasExtractedColors && !isExtractingColors && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-[#7A8F8F]">
                  Sube un logo para detectar colores, o elige un color principal:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isValidHex(primaryColor) ? primaryColor : '#0EB58C'}
                    onChange={(e) => generateFromPrimary(normalizeHex(e.target.value))}
                    disabled={isLoading}
                    className="h-10 w-10 rounded-lg cursor-pointer border border-white/20"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => {
                      let v = e.target.value.trim();
                      if (v && !v.startsWith('#')) v = `#${v}`;
                      if (isValidHex(v)) generateFromPrimary(normalizeHex(v));
                    }}
                    placeholder="#0EB58C"
                    className={cn(premiumInputClasses, 'font-mono uppercase text-sm flex-1')}
                    maxLength={7}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Error */}
        {uploadState.error && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <X className="h-4 w-4" />
            {uploadState.error}
          </p>
        )}
      </div>

      {/* 4-Color Palette Summary */}
      <div className="space-y-3">
        {/* Color Swatches Row */}
        <div className="grid grid-cols-4 gap-2">
          {/* Sidebar */}
          <div className="space-y-1">
            <div
              className="h-10 rounded-lg border-2 border-white/30"
              style={{ backgroundColor: sidebarColor }}
            />
            <p className="text-[10px] text-center text-[#7A8F8F]">{labels.sidebarColor}</p>
          </div>

          {/* Primary */}
          <div className="space-y-1">
            <div
              className="h-10 rounded-lg border-2 border-white/30"
              style={{ backgroundColor: primaryColor }}
            />
            <p className="text-[10px] text-center text-[#7A8F8F]">{labels.primaryColor}</p>
          </div>

          {/* Accent */}
          <div className="space-y-1">
            <div
              className="h-10 rounded-lg border-2 border-white/30"
              style={{ backgroundColor: accentColor }}
            />
            <p className="text-[10px] text-center text-[#7A8F8F]">{labels.accentColor}</p>
          </div>

          {/* Surface */}
          <div className="space-y-1">
            <div
              className="h-10 rounded-lg border-2 border-white/30"
              style={{ backgroundColor: surfaceColor }}
            />
            <p className="text-[10px] text-center text-[#7A8F8F]">{labels.surfaceColor}</p>
          </div>
        </div>

        {/* Advanced Edit Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-[#0EB58C] hover:text-[#5EEAD4] transition-colors"
        >
          {showAdvanced ? '▼ Ocultar edición avanzada' : '▶ Editar colores individualmente'}
        </button>

        {/* Advanced 4-Color Editors */}
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
            {/* Sidebar Color */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={isValidHex(sidebarColor) ? sidebarColor : '#003C3B'}
                onChange={(e) => onSidebarColorChange(normalizeHex(e.target.value))}
                disabled={isLoading}
                className="h-8 w-8 rounded cursor-pointer border border-white/20"
              />
              <div className="flex-1">
                <p className="text-[10px] text-[#7A8F8F]">{labels.sidebarColor}</p>
                <Input
                  value={sidebarColor}
                  onChange={(e) => {
                    let v = e.target.value.trim();
                    if (v && !v.startsWith('#')) v = `#${v}`;
                    if (isValidHex(v)) onSidebarColorChange(normalizeHex(v));
                  }}
                  className={cn(premiumInputClasses, 'font-mono uppercase text-[10px] h-7')}
                  maxLength={7}
                />
              </div>
            </div>

            {/* Primary Color */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={isValidHex(primaryColor) ? primaryColor : '#0EB58C'}
                onChange={(e) => onPrimaryColorChange(normalizeHex(e.target.value))}
                disabled={isLoading}
                className="h-8 w-8 rounded cursor-pointer border border-white/20"
              />
              <div className="flex-1">
                <p className="text-[10px] text-[#7A8F8F]">{labels.primaryColor}</p>
                <Input
                  value={primaryColor}
                  onChange={(e) => {
                    let v = e.target.value.trim();
                    if (v && !v.startsWith('#')) v = `#${v}`;
                    if (isValidHex(v)) onPrimaryColorChange(normalizeHex(v));
                  }}
                  className={cn(premiumInputClasses, 'font-mono uppercase text-[10px] h-7')}
                  maxLength={7}
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={isValidHex(accentColor) ? accentColor : '#5EEAD4'}
                onChange={(e) => onAccentColorChange(normalizeHex(e.target.value))}
                disabled={isLoading}
                className="h-8 w-8 rounded cursor-pointer border border-white/20"
              />
              <div className="flex-1">
                <p className="text-[10px] text-[#7A8F8F]">{labels.accentColor}</p>
                <Input
                  value={accentColor}
                  onChange={(e) => {
                    let v = e.target.value.trim();
                    if (v && !v.startsWith('#')) v = `#${v}`;
                    if (isValidHex(v)) onAccentColorChange(normalizeHex(v));
                  }}
                  className={cn(premiumInputClasses, 'font-mono uppercase text-[10px] h-7')}
                  maxLength={7}
                />
              </div>
            </div>

            {/* Surface Color */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={isValidHex(surfaceColor) ? surfaceColor : '#052828'}
                onChange={(e) => onSurfaceColorChange(normalizeHex(e.target.value))}
                disabled={isLoading}
                className="h-8 w-8 rounded cursor-pointer border border-white/20"
              />
              <div className="flex-1">
                <p className="text-[10px] text-[#7A8F8F]">{labels.surfaceColor}</p>
                <Input
                  value={surfaceColor}
                  onChange={(e) => {
                    let v = e.target.value.trim();
                    if (v && !v.startsWith('#')) v = `#${v}`;
                    if (isValidHex(v)) onSurfaceColorChange(normalizeHex(v));
                  }}
                  className={cn(premiumInputClasses, 'font-mono uppercase text-[10px] h-7')}
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Mini Preview - Now uses all 4 colors */}
        <div className={cn(
          'rounded-xl overflow-hidden border border-white/10'
        )}
        style={{ backgroundColor: surfaceColor }}
        >
          <div className="flex">
            {/* Mini Sidebar Preview - Uses sidebarColor */}
            <div
              className="w-12 py-2 flex flex-col items-center gap-1.5"
              style={{ backgroundColor: sidebarColor }}
            >
              {hasLogo ? (
                <img
                  src={uploadState.localPreview || logoUrl || ''}
                  alt=""
                  className="w-7 h-7 rounded object-contain bg-white"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-[8px] font-bold"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: getOptimalForeground(sidebarColor)
                  }}
                >
                  {getInitials(companyName || 'AA')}
                </div>
              )}
              {/* Active nav item - uses primaryColor */}
              <div
                className="w-7 h-1 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="w-5 h-0.5 rounded-full bg-white/20" />
              <div className="w-5 h-0.5 rounded-full bg-white/20" />
            </div>

            {/* Mini Content Preview */}
            <div className="flex-1 p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 rounded bg-white/20" />
                {/* Badge uses primaryColor */}
                <div
                  className="h-4 px-1.5 rounded text-[7px] flex items-center font-medium"
                  style={{
                    backgroundColor: primaryColor,
                    color: getOptimalForeground(primaryColor)
                  }}
                >
                  Nuevo
                </div>
              </div>
              <div className="flex gap-1.5">
                {/* Cards use accentColor border on hover */}
                <div
                  className="flex-1 h-8 rounded border"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.1)'
                  }}
                />
                <div
                  className="flex-1 h-8 rounded border-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: accentColor
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  suggestBrandColors,
  isValidHex,
  normalizeHex,
  getOptimalForeground,
  type ExtractedColor,
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

export interface SmartBrandingProps {
  companyName: string;
  onCompanyNameChange: (name: string) => void;
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  primaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  secondaryColor: string;
  onSecondaryColorChange: (color: string) => void;
  isLoading?: boolean;
  uploadEndpoint?: string;
  translations?: {
    companyName?: string;
    companyNamePlaceholder?: string;
    uploadLogo?: string;
    detectingColors?: string;
    suggestedColors?: string;
    primaryColor?: string;
    secondaryColor?: string;
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
  primaryColor,
  onPrimaryColorChange,
  secondaryColor,
  onSecondaryColorChange,
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

  // Labels with defaults
  const labels = {
    companyName: t.companyName || 'Nombre de la empresa',
    companyNamePlaceholder: t.companyNamePlaceholder || 'Mi Empresa S.A.',
    uploadLogo: t.uploadLogo || 'Sube tu logo',
    detectingColors: t.detectingColors || 'Detectando colores...',
    suggestedColors: t.suggestedColors || 'Colores detectados',
    primaryColor: t.primaryColor || 'Color principal',
    secondaryColor: t.secondaryColor || 'Color secundario',
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

  // Extract colors from image
  const extractColors = React.useCallback(async (imageSource: string | File) => {
    setIsExtractingColors(true);
    try {
      const colors = await extractColorsFromImage(imageSource, 6, 7);
      setExtractedColors(colors);

      // Auto-suggest brand colors if we have results
      if (colors.length > 0) {
        const suggested = suggestBrandColors(colors);
        onPrimaryColorChange(suggested.primary);
        onSecondaryColorChange(suggested.secondary);
      }
    } catch (error) {
      console.error('Color extraction failed:', error);
    } finally {
      setIsExtractingColors(false);
    }
  }, [onPrimaryColorChange, onSecondaryColorChange]);

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

  // Apply a suggested color
  const applySuggestedColor = (color: string, type: 'primary' | 'secondary') => {
    if (type === 'primary') {
      onPrimaryColorChange(color);
    } else {
      onSecondaryColorChange(color);
    }
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
                    const isPrimary = color.hex.toUpperCase() === primaryColor.toUpperCase();
                    const isSecondary = color.hex.toUpperCase() === secondaryColor.toUpperCase();

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applySuggestedColor(color.hex, 'primary')}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          applySuggestedColor(color.hex, 'secondary');
                        }}
                        className={cn(
                          'relative w-9 h-9 rounded-lg transition-all hover:scale-110',
                          'border-2',
                          isPrimary || isSecondary
                            ? 'border-white shadow-lg'
                            : 'border-white/20 hover:border-white/40'
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={`${color.hex} (${color.percentage}%)`}
                      >
                        {isPrimary && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0EB58C] rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                            P
                          </span>
                        )}
                        {isSecondary && !isPrimary && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#F97316] rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                            S
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#7A8F8F]">
                  Click = primario • Click derecho = secundario
                </p>
              </div>
            )}

            {/* Manual color entry when no extracted colors */}
            {!hasExtractedColors && !isExtractingColors && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-[#7A8F8F]">
                  Sube un logo para detectar colores automáticamente, o ingresa manualmente:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={isValidHex(primaryColor) ? primaryColor : '#0D9488'}
                      onChange={(e) => onPrimaryColorChange(normalizeHex(e.target.value))}
                      disabled={isLoading}
                      className="h-8 w-8 rounded cursor-pointer border border-white/20"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => {
                        let v = e.target.value.trim();
                        if (v && !v.startsWith('#')) v = `#${v}`;
                        if (isValidHex(v)) onPrimaryColorChange(normalizeHex(v));
                      }}
                      placeholder="#0D9488"
                      className={cn(premiumInputClasses, 'font-mono uppercase text-xs flex-1')}
                      maxLength={7}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={isValidHex(secondaryColor) ? secondaryColor : '#F97316'}
                      onChange={(e) => onSecondaryColorChange(normalizeHex(e.target.value))}
                      disabled={isLoading}
                      className="h-8 w-8 rounded cursor-pointer border border-white/20"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => {
                        let v = e.target.value.trim();
                        if (v && !v.startsWith('#')) v = `#${v}`;
                        if (isValidHex(v)) onSecondaryColorChange(normalizeHex(v));
                      }}
                      placeholder="#F97316"
                      className={cn(premiumInputClasses, 'font-mono uppercase text-xs flex-1')}
                      maxLength={7}
                    />
                  </div>
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

      {/* Selected Colors Summary + Preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          {/* Primary */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg border-2 border-white/30"
              style={{ backgroundColor: primaryColor }}
            />
            <div className="text-xs">
              <p className="text-[#7A8F8F]">{labels.primaryColor}</p>
              <p className="text-white font-mono">{primaryColor}</p>
            </div>
          </div>

          {/* Secondary */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg border-2 border-white/30"
              style={{ backgroundColor: secondaryColor }}
            />
            <div className="text-xs">
              <p className="text-[#7A8F8F]">{labels.secondaryColor}</p>
              <p className="text-white font-mono">{secondaryColor}</p>
            </div>
          </div>
        </div>

        {/* Live Mini Preview */}
        <div className={cn(
          'rounded-xl overflow-hidden border border-white/10',
          'bg-gradient-to-br from-[#001A1A] to-[#002525]'
        )}>
          <div className="flex">
            {/* Mini Sidebar Preview */}
            <div
              className="w-10 py-2 flex flex-col items-center gap-1.5"
              style={{ backgroundColor: primaryColor }}
            >
              {hasLogo ? (
                <img
                  src={uploadState.localPreview || logoUrl || ''}
                  alt=""
                  className="w-6 h-6 rounded object-contain bg-white"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: getOptimalForeground(primaryColor)
                  }}
                >
                  {getInitials(companyName || 'AA')}
                </div>
              )}
              <div className="w-4 h-0.5 rounded-full bg-white/30" />
              <div className="w-4 h-0.5 rounded-full bg-white/20" />
            </div>

            {/* Mini Content Preview */}
            <div className="flex-1 p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 rounded bg-white/20" />
                <div
                  className="h-4 px-1.5 rounded text-[7px] flex items-center font-medium"
                  style={{
                    backgroundColor: secondaryColor,
                    color: getOptimalForeground(secondaryColor)
                  }}
                >
                  Nuevo
                </div>
              </div>
              <div className="flex gap-1.5">
                <div className="flex-1 h-8 rounded bg-white/[0.05] border border-white/10" />
                <div className="flex-1 h-8 rounded bg-white/[0.05] border border-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

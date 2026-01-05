'use client';

/**
 * QuotePdfActions - PDF generation with template selection (v2.0)
 *
 * Provides template selection and PDF customization for quotes.
 * Modular, dynamic, and multi-platform with responsive variants.
 *
 * Variants:
 * - 'default': Full buttons with template selector + download
 * - 'compact': Single dropdown button with all options
 * - 'icon': Icon-only button for compact header usage (mobile)
 * - 'full': Full-width button for cards
 *
 * @version 2.0.0
 */

import * as React from 'react';
import { Download, Settings2, Loader2, ChevronDown, Star, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  useProposalTemplates,
  useProposalPdfGeneration,
  type ProposalTemplate,
} from '@/lib/proposal-templates';
import { TemplateEditorSheet } from '@/components/proposal-editor';
import type { Quote } from '@/lib/quotes';
import { cn } from '@/lib/utils';

interface QuotePdfActionsProps {
  quote: Quote;
  className?: string;
  /** Variant determines the visual presentation:
   * - 'default': Template selector + download button side by side
   * - 'compact': Single dropdown with all options
   * - 'icon': Icon-only button for headers (mobile-optimized)
   * - 'full': Full-width button for cards
   */
  variant?: 'default' | 'compact' | 'icon' | 'full';
  /** Optional size override */
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

/**
 * PDF actions with template selection and customization
 */
export function QuotePdfActions({ quote, className, variant = 'default', size }: QuotePdfActionsProps) {
  const { toast } = useToast();
  const { data: templatesData, isLoading: isLoadingTemplates } = useProposalTemplates();
  const { generatePdf, isPdfLoading } = useProposalPdfGeneration();

  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | undefined>();
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [customTemplate, setCustomTemplate] = React.useState<ProposalTemplate | undefined>();

  const templates = templatesData?.data || [];
  const defaultTemplate = templates.find((t) => t.isDefault);
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || defaultTemplate;

  // Download PDF with selected template
  const handleDownload = async () => {
    try {
      const blob = await generatePdf({
        quoteId: quote.id,
        templateId: selectedTemplateId || defaultTemplate?.id,
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF descargado',
        description: `${quote.quoteNumber}.pdf descargado correctamente`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF',
        variant: 'destructive',
      });
    }
  };

  // Open template editor for customization
  const handleCustomize = () => {
    setCustomTemplate(currentTemplate);
    setEditorOpen(true);
  };

  // ============================================
  // ICON Variant - Compact icon-only for headers
  // ============================================
  if (variant === 'icon') {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size={size || 'icon'}
                    disabled={isPdfLoading}
                    className={cn(
                      'h-9 w-9 rounded-full',
                      'hover:bg-[var(--tenant-primary-glow)] hover:text-[var(--tenant-primary)]',
                      'transition-all duration-200',
                      className
                    )}
                  >
                    {isPdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">Descargar PDF</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Descargar PDF</p>
              </TooltipContent>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                  {currentTemplate && (
                    <span className="text-xs text-muted-foreground ml-auto truncate max-w-[80px]">
                      ({currentTemplate.name})
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Plantilla
                </DropdownMenuLabel>
                {isLoadingTemplates ? (
                  <DropdownMenuItem disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Cargando...
                  </DropdownMenuItem>
                ) : templates.length === 0 ? (
                  <DropdownMenuItem disabled>Sin plantillas</DropdownMenuItem>
                ) : (
                  templates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        selectedTemplateId === template.id && 'bg-accent'
                      )}
                    >
                      {template.isDefault && <Star className="h-3 w-3 mr-2 text-amber-500" />}
                      <span className="truncate flex-1">{template.name}</span>
                      {template.id === selectedTemplateId && (
                        <span className="ml-auto text-primary shrink-0">&#10003;</span>
                      )}
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCustomize}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Personalizar plantilla
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Tooltip>
        </TooltipProvider>

        <TemplateEditorSheet
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          template={customTemplate}
        />
      </>
    );
  }

  // ============================================
  // FULL Variant - Full-width button for cards
  // ============================================
  if (variant === 'full') {
    return (
      <>
        <div className={cn('flex flex-col gap-2', className)}>
          {/* Template Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size={size || 'default'}
                disabled={isLoadingTemplates}
                className="w-full justify-between"
              >
                {isLoadingTemplates ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      {currentTemplate?.name || 'Plantilla'}
                    </span>
                    <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Seleccionar plantilla
              </DropdownMenuLabel>
              {templates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={cn(
                    selectedTemplateId === template.id && 'bg-accent'
                  )}
                >
                  <div
                    className="h-4 w-4 rounded mr-2 border shrink-0"
                    style={{ backgroundColor: template.styles.colors.primary }}
                  />
                  <span className="flex-1 truncate">{template.name}</span>
                  {template.isDefault && <Star className="h-3 w-3 text-amber-500 shrink-0" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCustomize}>
                <Settings2 className="h-4 w-4 mr-2" />
                Personalizar plantilla
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={isPdfLoading}
            size={size || 'default'}
            className="w-full btn-primary"
          >
            {isPdfLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </>
            )}
          </Button>
        </div>

        <TemplateEditorSheet
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          template={customTemplate}
        />
      </>
    );
  }

  // ============================================
  // COMPACT Variant - Single dropdown button
  // ============================================
  if (variant === 'compact') {
    // Check if used on dark background (className contains text-white)
    const isOnDark = className?.includes('text-white');

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isOnDark ? 'ghost' : 'outline'}
              size={size || 'sm'}
              disabled={isPdfLoading}
              className={cn(
                isOnDark && [
                  'bg-white/10 border-white/20 text-white',
                  'hover:bg-white/20 hover:text-white',
                ],
                className
              )}
            >
              {isPdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
              {currentTemplate && (
                <span className="text-xs text-muted-foreground ml-auto truncate max-w-[80px]">
                  ({currentTemplate.name})
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Plantilla
            </DropdownMenuLabel>
            {isLoadingTemplates ? (
              <DropdownMenuItem disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cargando...
              </DropdownMenuItem>
            ) : templates.length === 0 ? (
              <DropdownMenuItem disabled>Sin plantillas</DropdownMenuItem>
            ) : (
              templates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={cn(
                    selectedTemplateId === template.id && 'bg-accent'
                  )}
                >
                  {template.isDefault && <Star className="h-3 w-3 mr-2 text-amber-500" />}
                  <span className="truncate flex-1">{template.name}</span>
                  {template.id === selectedTemplateId && (
                    <span className="ml-auto text-primary shrink-0">&#10003;</span>
                  )}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCustomize}>
              <Settings2 className="h-4 w-4 mr-2" />
              Personalizar plantilla
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <TemplateEditorSheet
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          template={customTemplate}
        />
      </>
    );
  }

  // Default variant with separate buttons
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Template Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoadingTemplates}>
            {isLoadingTemplates ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Settings2 className="h-4 w-4 mr-2" />
                {currentTemplate?.name || 'Plantilla'}
                <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Seleccionar plantilla
          </DropdownMenuLabel>
          {templates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => setSelectedTemplateId(template.id)}
              className={cn(
                selectedTemplateId === template.id && 'bg-accent'
              )}
            >
              <div
                className="h-4 w-4 rounded mr-2 border"
                style={{ backgroundColor: template.styles.colors.primary }}
              />
              <span className="flex-1">{template.name}</span>
              {template.isDefault && <Star className="h-3 w-3 text-amber-500" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCustomize}>
            <Settings2 className="h-4 w-4 mr-2" />
            Personalizar plantilla
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Download Button */}
      <Button onClick={handleDownload} disabled={isPdfLoading}>
        {isPdfLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Generando...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </>
        )}
      </Button>

      <TemplateEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        template={customTemplate}
      />
    </div>
  );
}

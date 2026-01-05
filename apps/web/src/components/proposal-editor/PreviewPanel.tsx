'use client';

import * as React from 'react';
import { Download, RefreshCw, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PreviewToggle, type PreviewMode } from './PreviewToggle';
import { cn } from '@/lib/utils';

interface PreviewPanelProps {
  previewUrl?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onDownload?: () => void;
  className?: string;
}

/**
 * PDF preview panel with zoom controls and download
 */
export function PreviewPanel({
  previewUrl,
  isLoading,
  onRefresh,
  onDownload,
  className,
}: PreviewPanelProps) {
  const [mode, setMode] = React.useState<PreviewMode>('thumbnail');
  const [zoom, setZoom] = React.useState(100);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30">
        <PreviewToggle mode={mode} onChange={setMode} />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="h-8 w-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="h-8 w-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
          {onDownload && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDownload}
              disabled={isLoading || !previewUrl}
              className="h-8 w-8"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/50 p-4"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Generando vista previa...</p>
          </div>
        ) : previewUrl ? (
          <div
            className="mx-auto transition-transform origin-top"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {mode === 'thumbnail' ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Vista previa del PDF"
                  className="max-w-[300px] h-auto"
                />
              </div>
            ) : (
              <iframe
                src={previewUrl}
                title="Vista previa del PDF"
                className="w-[612px] h-[792px] bg-white rounded-lg shadow-lg"
                style={{ border: 'none' }}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-48 h-64 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-muted-foreground text-sm text-center px-4">
                La vista previa aparecera aqui
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Haz clic en &quot;Actualizar vista previa&quot; para generar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for the preview panel
 */
export function PreviewPanelSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="flex-1 flex items-center justify-center bg-muted/50 p-4">
        <Skeleton className="w-48 h-64 rounded-lg" />
      </div>
    </div>
  );
}

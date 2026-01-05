'use client';

/**
 * Data Management Page
 *
 * Manage data export, import, and deletion.
 * Admin-only access.
 */

import * as React from 'react';
import {
  Database,
  Download,
  Upload,
  Trash2,
  FileDown,
  FileUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calendar,
  HardDrive,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { RBACGuard } from '@/lib/auth';
import { useTenantStore } from '@/store';
import {
  useDataManagement,
  useExportProgress,
  type ExportFormat,
  type ExportEntity,
} from '@/lib/data-management';

// ============================================
// Helper Functions
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  return `Hace ${Math.floor(diffDays / 7)} semanas`;
}

// ============================================
// Data Management Page
// ============================================

export default function DataPage() {
  const { toast } = useToast();
  const tenant = useTenantStore((state) => state.currentTenant);
  const [selectedEntity, setSelectedEntity] = React.useState<ExportEntity>('all');
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>('json');
  const [activeExportJobId, setActiveExportJobId] = React.useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('');

  // Use the data management hooks
  const {
    storageStats,
    exportHistory,
    createExport,
    createImport,
    deleteAllData,
    isExporting,
    isImporting,
    isDeleting,
    isLoading,
  } = useDataManagement();

  // Track export progress
  const { progress: exportProgress, isComplete, isFailed, downloadUrl } = useExportProgress(activeExportJobId);

  // Handle export completion
  React.useEffect(() => {
    if (isComplete && downloadUrl) {
      toast({
        title: 'Exportacion completada',
        description: `Se han exportado los datos en formato ${selectedFormat.toUpperCase()}`,
      });
      window.open(downloadUrl, '_blank');
      setActiveExportJobId(null);
    }
    if (isFailed) {
      toast({
        title: 'Error',
        description: 'No se pudo completar la exportacion',
        variant: 'destructive',
      });
      setActiveExportJobId(null);
    }
  }, [isComplete, isFailed, downloadUrl, selectedFormat, toast]);

  const handleExport = async () => {
    try {
      const job = await createExport({
        entities: selectedEntity === 'all' ? ['all'] : [selectedEntity],
        format: selectedFormat,
      });
      setActiveExportJobId(job.id);
      toast({
        title: 'Exportacion iniciada',
        description: 'Tu exportacion esta siendo procesada...',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la exportacion',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await createImport({
        file,
        entityType: 'leads', // Default to leads, could be made selectable
        mode: 'merge',
      });
      toast({
        title: 'Importacion completada',
        description: `Se han importado los datos desde ${file.name}`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo importar el archivo',
        variant: 'destructive',
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleDeleteAllData = async () => {
    if (!tenant?.name || deleteConfirmation !== tenant.name) {
      toast({
        title: 'Error',
        description: 'Debes escribir el nombre de la organizacion correctamente',
        variant: 'destructive',
      });
      return;
    }

    try {
      await deleteAllData({
        confirmation: deleteConfirmation,
        scope: 'hard',
      });
      toast({
        title: 'Datos eliminados',
        description: 'Todos los datos han sido eliminados permanentemente',
      });
      setDeleteConfirmation('');
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar los datos',
        variant: 'destructive',
      });
    }
  };

  // Derived storage stats
  const displayStorageStats = {
    used: storageStats ? formatBytes(storageStats.totalUsed) : '0 B',
    total: storageStats ? formatBytes(storageStats.totalQuota) : '5 GB',
    percentage: storageStats?.usagePercentage ?? 0,
    records: {
      leads: 0,
      customers: 0,
      opportunities: 0,
      tasks: 0,
    },
  };

  type DataEntity = 'leads' | 'customers' | 'opportunities' | 'tasks' | 'all';

  const getEntityLabel = (entity: DataEntity | ExportEntity): string => {
    const labels: Record<string, string> = {
      all: 'Todos los datos',
      contacts: 'Contactos',
      leads: 'Leads',
      customers: 'Clientes',
      opportunities: 'Oportunidades',
      tasks: 'Tareas',
    };
    return labels[entity] ?? entity;
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'json':
        return FileJson;
      case 'csv':
      case 'xlsx':
        return FileSpreadsheet;
    }
  };

  return (
    <RBACGuard
      minRole="admin"
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Database className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Acceso restringido</h2>
          <p className="text-muted-foreground">
            Solo los administradores pueden acceder a esta seccion
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Datos</h2>
          <p className="text-muted-foreground">
            Exporta, importa y gestiona los datos de tu organizacion
          </p>
        </div>

        <Separator />

        {/* Storage Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Almacenamiento
            </CardTitle>
            <CardDescription>
              Uso actual de almacenamiento y registros
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {displayStorageStats.used} de {displayStorageStats.total} utilizados
                </span>
                <span className="font-medium">{displayStorageStats.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={displayStorageStats.percentage} className="h-2" />
            </div>

            {/* Records breakdown */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{displayStorageStats.records.leads}</div>
                <p className="text-xs text-muted-foreground">Leads</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{displayStorageStats.records.customers}</div>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{displayStorageStats.records.opportunities}</div>
                <p className="text-xs text-muted-foreground">Oportunidades</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{displayStorageStats.records.tasks}</div>
                <p className="text-xs text-muted-foreground">Tareas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Datos
            </CardTitle>
            <CardDescription>
              Descarga tus datos en diferentes formatos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Entity selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Datos a exportar</label>
                <Select
                  value={selectedEntity}
                  onValueChange={(value) => setSelectedEntity(value as DataEntity)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona los datos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los datos</SelectItem>
                    <SelectItem value="leads">Solo Leads</SelectItem>
                    <SelectItem value="customers">Solo Clientes</SelectItem>
                    <SelectItem value="opportunities">Solo Oportunidades</SelectItem>
                    <SelectItem value="tasks">Solo Tareas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Formato</label>
                <Select
                  value={selectedFormat}
                  onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON (.json)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Export progress */}
            {(isExporting || activeExportJobId) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Exportando...</span>
                  <span className="font-medium">{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={isExporting || !!activeExportJobId}
              className="w-full sm:w-auto"
            >
              {isExporting || activeExportJobId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar {getEntityLabel(selectedEntity)}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Datos
            </CardTitle>
            <CardDescription>
              Importa datos desde un archivo JSON, CSV o Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed p-6 text-center">
              <input
                type="file"
                id="import-file"
                accept=".json,.csv,.xlsx"
                onChange={handleImport}
                className="hidden"
                disabled={isImporting}
              />
              <label
                htmlFor="import-file"
                className="flex cursor-pointer flex-col items-center gap-2"
              >
                {isImporting ? (
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                ) : (
                  <FileUp className="h-10 w-10 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {isImporting ? 'Importando...' : 'Haz clic para seleccionar un archivo'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Soporta JSON, CSV y Excel
                  </p>
                </div>
              </label>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Importante
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    La importacion puede sobrescribir datos existentes. Te recomendamos
                    hacer un respaldo antes de importar.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historial de Exportaciones
            </CardTitle>
            <CardDescription>
              Ultimas exportaciones realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exportHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No hay exportaciones recientes
                </p>
              ) : (
                exportHistory.map((item) => {
                  const FormatIcon = getFormatIcon(item.format);
                  const entities = item.entities?.join(', ') || 'all';
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <FormatIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{getEntityLabel(entities as DataEntity)}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.format.toUpperCase()} · {item.fileSize ? formatBytes(item.fileSize) : '-'} · {formatRelativeTime(item.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'}
                        >
                          {item.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Completado
                            </>
                          ) : item.status === 'failed' ? (
                            <>
                              <AlertTriangle className="mr-1 h-3 w-3" /> Error
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Procesando
                            </>
                          )}
                        </Badge>
                        {item.downloadUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(item.downloadUrl, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Zona de Peligro
            </CardTitle>
            <CardDescription>
              Acciones irreversibles que afectan todos los datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">Eliminar todos los datos</p>
                <p className="text-sm text-muted-foreground">
                  Esta accion eliminara permanentemente todos los leads, clientes,
                  oportunidades y tareas. Esta accion no se puede deshacer.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="shrink-0" disabled={isDeleting}>
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Eliminar todo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Estas absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta accion no se puede deshacer. Se eliminaran permanentemente
                      todos los datos de tu organizacion incluyendo leads, clientes,
                      oportunidades y tareas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Para confirmar, escribe el nombre de tu organizacion: <strong>{tenant?.name || 'tu organizacion'}</strong>
                    </p>
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Escribe el nombre de la organizacion"
                      className="max-w-sm"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllData}
                      disabled={deleteConfirmation !== tenant?.name || isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? 'Eliminando...' : 'Si, eliminar todo'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </RBACGuard>
  );
}

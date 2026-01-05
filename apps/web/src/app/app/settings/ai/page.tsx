'use client';

/**
 * AI Assistant Settings Page
 *
 * Configure AI Assistant preferences including:
 * - Provider selection (auto/specific)
 * - Feature toggles (suggestions, sentiment, scoring)
 * - Language preference
 *
 * @module app/settings/ai/page
 */

import * as React from 'react';
import Link from 'next/link';

import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAIHealth, useAISettings, type AIAssistantSettings } from '@/lib/ai-assistant';
import { cn } from '@/lib/utils';

// ============================================
// Constants
// ============================================

const PROVIDER_OPTIONS = [
  { value: 'auto', label: 'Automático', description: 'Selecciona el mejor modelo disponible' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-4o y modelos OpenAI' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude 3.5 Sonnet' },
  { value: 'google', label: 'Google', description: 'Gemini Pro' },
  { value: 'groq', label: 'Groq', description: 'LLaMA 3.1 (alta velocidad)' },
];

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español', flag: '🇲🇽' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
];

// ============================================
// Feature Toggle Component
// ============================================

interface FeatureToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isNew?: boolean;
}

function FeatureToggle({
  icon,
  title,
  description,
  enabled,
  onToggle,
  isNew,
}: FeatureToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            enabled
              ? 'bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{title}</p>
            {isNew && (
              <Badge variant="secondary\" className="text-[10px] py-0 px-1.5 bg-fuchsia-500/10 text-fuchsia-500">
                Nuevo
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function AISettingsPage() {
  const { toast } = useToast();
  const { data: health, isLoading: healthLoading } = useAIHealth();
  const { settings, isLoading, updateSettings, isUpdating } = useAISettings();

  // Local state for form
  const [localSettings, setLocalSettings] = React.useState<Partial<AIAssistantSettings>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Initialize local state when data loads
  React.useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  // Update helper
  const updateLocal = <K extends keyof AIAssistantSettings>(
    key: K,
    value: AIAssistantSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save handler
  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      toast({
        title: 'Configuración guardada',
        description: 'Las preferencias del asistente IA han sido actualizadas.',
      });
      setHasChanges(false);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración.',
        variant: 'destructive',
      });
    }
  };

  // Reset handler
  const handleReset = () => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
      toast({
        title: 'Cambios descartados',
        description: 'Se han restaurado los valores guardados.',
      });
    }
  };

  // Service health status
  const isHealthy = health?.status === 'healthy' || health?.status === 'degraded';
  const isDegraded = health?.status === 'degraded';

  if (isLoading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href="/app/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Asistente IA</h1>
            {/* Service Status Badge */}
            {healthLoading ? (
              <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Conectando...
              </Badge>
            ) : isDegraded ? (
              <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                <Zap className="h-3 w-3 mr-1" />
                Degradado
              </Badge>
            ) : isHealthy ? (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                En linea
              </Badge>
            ) : (
              <Badge variant="outline" className="border-destructive/50 text-destructive">
                Sin conexion
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Configura las preferencias del asistente de inteligencia artificial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={!hasChanges}
            variant="outline"
            onClick={handleReset}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Descartar
          </Button>
          <Button
            disabled={!hasChanges || isUpdating}
            onClick={handleSave}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-400">
          <span>Tienes cambios sin guardar</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-fuchsia-500" />
              Configuracion General
            </CardTitle>
            <CardDescription>
              Preferencias basicas del asistente IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Habilitar Asistente IA</p>
                <p className="text-sm text-muted-foreground">
                  Activa o desactiva el asistente en todo el CRM
                </p>
              </div>
              <Switch
                checked={localSettings.enabled ?? true}
                onCheckedChange={(v) => updateLocal('enabled', v)}
              />
            </div>

            {/* Provider Selection */}
            <div className="space-y-2" id="provider">
              <Label>Proveedor de IA</Label>
              <Select
                value={localSettings.preferredProvider ?? 'auto'}
                onValueChange={(v) => updateLocal('preferredProvider', v as AIAssistantSettings['preferredProvider'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      <div className="flex flex-col">
                        <span>{provider.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {provider.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                El modo automatico selecciona el mejor modelo segun disponibilidad
              </p>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label>Idioma de respuestas</Label>
              <Select
                value={localSettings.language ?? 'es'}
                onValueChange={(v) => updateLocal('language', v as 'es' | 'en')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <div className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Service Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-fuchsia-500" />
              Estado del Servicio
            </CardTitle>
            <CardDescription>
              Informacion sobre el servicio de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  {isHealthy ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Operativo
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      Sin conexion
                    </>
                  )}
                </p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground">Proveedores</p>
                <p className="text-lg font-semibold">
                  {health?.availableProviders?.length ?? 0} disponibles
                </p>
              </div>
            </div>

            {health?.availableProviders && health.availableProviders.length > 0 && (
              <div className="p-4 rounded-lg border space-y-2">
                <p className="text-sm text-muted-foreground">Modelos disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {health.availableProviders.map((provider) => (
                    <Badge key={provider} variant="secondary">
                      {provider}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <Link href="/app/assistant">
                <MessageSquare className="h-4 w-4 mr-2" />
                Abrir Asistente IA
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="lg:col-span-2" id="suggestions">
          <CardHeader>
            <CardTitle>Funciones de IA</CardTitle>
            <CardDescription>
              Activa o desactiva las diferentes capacidades del asistente
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <FeatureToggle
              icon={<Sparkles className="h-5 w-5" />}
              title="Sugerencias automaticas"
              description="El asistente ofrece sugerencias mientras trabajas"
              enabled={localSettings.autoSuggestions ?? true}
              onToggle={(v) => updateLocal('autoSuggestions', v)}
            />

            <FeatureToggle
              icon={<Mail className="h-5 w-5" />}
              title="Asistencia en emails"
              description="Ayuda para redactar y mejorar correos electronicos"
              enabled={localSettings.emailAssistance ?? true}
              onToggle={(v) => updateLocal('emailAssistance', v)}
            />

            <FeatureToggle
              icon={<Target className="h-5 w-5" />}
              title="Scoring de leads con IA"
              description="Califica leads automaticamente usando inteligencia artificial"
              enabled={localSettings.leadScoring ?? true}
              onToggle={(v) => updateLocal('leadScoring', v)}
              isNew
            />

            <FeatureToggle
              icon={<TrendingUp className="h-5 w-5" />}
              title="Analisis de sentimiento"
              description="Analiza el tono y sentimiento de las conversaciones"
              enabled={localSettings.sentimentAnalysis ?? true}
              onToggle={(v) => updateLocal('sentimentAnalysis', v)}
              isNew
            />
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                El Asistente IA utiliza multiples proveedores de modelos de lenguaje (OpenAI, Anthropic, Google, Groq)
                para ofrecerte la mejor experiencia. Tus datos se procesan de forma segura y no se almacenan
                en servidores externos mas alla de lo necesario para generar respuestas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

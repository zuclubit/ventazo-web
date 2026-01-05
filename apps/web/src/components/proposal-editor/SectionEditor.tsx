'use client';

import * as React from 'react';
import {
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Plus,
  LayoutTemplate,
  FileText,
  Table,
  Calculator,
  Scale,
  PenTool,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  type ProposalSection,
  type ProposalSectionType,
  getSectionTypeInfo,
  createCustomSection,
} from '@/lib/proposal-templates';
import { CustomSectionEditor } from './CustomSectionEditor';
import { cn } from '@/lib/utils';

const SECTION_ICONS: Record<ProposalSectionType, React.ComponentType<{ className?: string }>> = {
  cover: LayoutTemplate,
  summary: FileText,
  details: Table,
  totals: Calculator,
  terms: Scale,
  signature: PenTool,
  custom_text: Type,
};

interface SectionEditorProps {
  sections: ProposalSection[];
  onChange: (sections: ProposalSection[]) => void;
  className?: string;
}

/**
 * Section editor with reordering and configuration
 */
export function SectionEditor({ sections, onChange, className }: SectionEditorProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  // Sort sections by order
  const sortedSections = React.useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections]
  );

  const toggleSection = (sectionId: string, enabled: boolean) => {
    onChange(
      sections.map((s) => (s.id === sectionId ? { ...s, enabled } : s))
    );
  };

  const updateSectionConfig = (sectionId: string, config: ProposalSection['config']) => {
    onChange(
      sections.map((s) => (s.id === sectionId ? { ...s, config } : s))
    );
  };

  const updateSection = (updated: ProposalSection) => {
    onChange(sections.map((s) => (s.id === updated.id ? updated : s)));
  };

  const deleteSection = (sectionId: string) => {
    onChange(sections.filter((s) => s.id !== sectionId));
  };

  const addCustomSection = () => {
    const maxOrder = Math.max(...sections.map((s) => s.order), -1);
    const newSection = createCustomSection(maxOrder + 1);
    onChange([...sections, newSection]);
    setExpandedSections((prev) => {
      const arr = Array.from(prev);
      arr.push(newSection.id);
      return new Set(arr);
    });
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const idx = sortedSections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sortedSections.length) return;

    const currentSection = sortedSections[idx];
    const swapSection = sortedSections[newIdx];
    if (!currentSection || !swapSection) return;

    const newSections = sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, order: swapSection.order };
      }
      if (s.id === swapSection.id) {
        return { ...s, order: currentSection.order };
      }
      return s;
    });

    onChange(newSections);
  };

  const toggleExpand = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {sortedSections.map((section, idx) => {
        const info = getSectionTypeInfo(section.type);
        const Icon = SECTION_ICONS[section.type] || FileText;
        const isExpanded = expandedSections.has(section.id);
        const isFirst = idx === 0;
        const isLast = idx === sortedSections.length - 1;

        return (
          <div
            key={section.id}
            className={cn(
              'border rounded-lg transition-colors',
              section.enabled ? 'bg-background' : 'bg-muted/50 opacity-60'
            )}
          >
            <div className="flex items-center gap-2 p-3">
              {/* Drag Handle / Order Buttons */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-6 p-0"
                  onClick={() => moveSection(section.id, 'up')}
                  disabled={isFirst}
                >
                  <ChevronDown className="h-3 w-3 rotate-180" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-6 p-0"
                  onClick={() => moveSection(section.id, 'down')}
                  disabled={isLast}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Icon */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded',
                  section.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{info?.label || section.id}</div>
                {info?.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {info.description}
                  </div>
                )}
              </div>

              {/* Enable/Disable Toggle */}
              <Switch
                checked={section.enabled}
                onCheckedChange={(checked) => toggleSection(section.id, checked)}
                aria-label={`${section.enabled ? 'Desactivar' : 'Activar'} ${info?.label}`}
              />

              {/* Expand Button */}
              {section.type !== 'custom_text' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleExpand(section.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Expanded Configuration */}
            {isExpanded && section.type !== 'custom_text' && (
              <div className="px-4 pb-4 border-t pt-4">
                <SectionConfigEditor section={section} onChange={updateSectionConfig} />
              </div>
            )}

            {/* Custom Section Editor */}
            {section.type === 'custom_text' && (
              <div className="px-3 pb-3">
                <CustomSectionEditor
                  section={section}
                  onChange={updateSection}
                  onDelete={() => deleteSection(section.id)}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Add Custom Section Button */}
      <Button
        variant="outline"
        className="w-full h-10 border-dashed"
        onClick={addCustomSection}
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar Seccion Personalizada
      </Button>
    </div>
  );
}

// ============================================
// Section Config Editor
// ============================================

interface SectionConfigEditorProps {
  section: ProposalSection;
  onChange: (sectionId: string, config: ProposalSection['config']) => void;
}

function SectionConfigEditor({ section, onChange }: SectionConfigEditorProps) {
  const updateConfig = (key: string, value: boolean | string) => {
    onChange(section.id, { ...section.config, [key]: value });
  };

  const renderCheckbox = (key: string, label: string) => (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`${section.id}-${key}`}
        checked={(section.config[key] as boolean) ?? true}
        onCheckedChange={(checked) => updateConfig(key, !!checked)}
      />
      <Label htmlFor={`${section.id}-${key}`} className="text-sm">
        {label}
      </Label>
    </div>
  );

  switch (section.type) {
    case 'cover':
      return (
        <div className="grid grid-cols-2 gap-3">
          {renderCheckbox('showLogo', 'Mostrar logo')}
          {renderCheckbox('showDate', 'Mostrar fecha')}
          {renderCheckbox('showQuoteNumber', 'Mostrar numero de cotizacion')}
          {renderCheckbox('showClientAddress', 'Mostrar direccion del cliente')}
        </div>
      );

    case 'details':
      return (
        <div className="grid grid-cols-2 gap-3">
          {renderCheckbox('showDescription', 'Mostrar descripcion')}
          {renderCheckbox('showQuantity', 'Mostrar cantidad')}
          {renderCheckbox('showUnitPrice', 'Mostrar precio unitario')}
          {renderCheckbox('showTotal', 'Mostrar total')}
        </div>
      );

    case 'totals':
      return (
        <div className="grid grid-cols-2 gap-3">
          {renderCheckbox('showSubtotal', 'Mostrar subtotal')}
          {renderCheckbox('showTax', 'Mostrar impuestos')}
          {renderCheckbox('showDiscount', 'Mostrar descuento')}
        </div>
      );

    case 'signature':
      return (
        <div className="grid grid-cols-2 gap-3">
          {renderCheckbox('showSignatureLine', 'Linea de firma')}
          {renderCheckbox('showDateLine', 'Linea de fecha')}
        </div>
      );

    case 'terms':
      return (
        <div className="space-y-2">
          <Label htmlFor={`${section.id}-termsTitle`} className="text-sm">
            Titulo de la seccion
          </Label>
          <input
            id={`${section.id}-termsTitle`}
            type="text"
            className="w-full h-9 px-3 text-sm border rounded-md"
            value={(section.config.termsTitle as string) || 'Terminos y Condiciones'}
            onChange={(e) => updateConfig('termsTitle', e.target.value)}
          />
        </div>
      );

    default:
      return null;
  }
}

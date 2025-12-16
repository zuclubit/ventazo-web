/**
 * Services & Catalog Module Types
 *
 * Flexible service/product management adapted to business types:
 * - Services (duration-based)
 * - Products (physical/digital goods)
 * - Packages (bundled offerings)
 *
 * Industry-aware with custom fields per business type.
 */

// ============================================
// Enums & Constants
// ============================================

/**
 * Service/Catalog Item Type
 */
export const SERVICE_TYPE = ['service', 'product', 'package'] as const;
export type ServiceType = (typeof SERVICE_TYPE)[number];

/**
 * Service Status
 */
export const SERVICE_STATUS = ['active', 'inactive', 'draft', 'archived'] as const;
export type ServiceStatus = (typeof SERVICE_STATUS)[number];

/**
 * Industry Types for dynamic field configuration
 */
export const INDUSTRY_TYPE = [
  'dental',
  'automotive',
  'beauty_salon',
  'real_estate',
  'consulting',
  'healthcare',
  'fitness',
  'restaurant',
  'retail',
  'professional_services',
  'other',
] as const;
export type IndustryType = (typeof INDUSTRY_TYPE)[number];

/**
 * Custom Field Types
 */
export const CUSTOM_FIELD_TYPE = ['text', 'number', 'boolean', 'date', 'select', 'multiselect'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPE)[number];

// ============================================
// Display Labels
// ============================================

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  service: 'Servicio',
  product: 'Producto',
  package: 'Paquete',
};

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  draft: 'Borrador',
  archived: 'Archivado',
};

export const INDUSTRY_TYPE_LABELS: Record<IndustryType, string> = {
  dental: 'Clínica Dental',
  automotive: 'Taller Automotriz',
  beauty_salon: 'Salón de Belleza / Estética',
  real_estate: 'Inmobiliaria',
  consulting: 'Consultoría',
  healthcare: 'Salud / Médico',
  fitness: 'Gimnasio / Fitness',
  restaurant: 'Restaurante',
  retail: 'Retail / Comercio',
  professional_services: 'Servicios Profesionales',
  other: 'Otro',
};

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Texto',
  number: 'Número',
  boolean: 'Sí/No',
  date: 'Fecha',
  select: 'Selección única',
  multiselect: 'Selección múltiple',
};

// ============================================
// Colors
// ============================================

export const SERVICE_TYPE_COLORS: Record<ServiceType, string> = {
  service: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  product: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  package: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export const SERVICE_STATUS_COLORS: Record<ServiceStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  archived: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

// ============================================
// Core Interfaces
// ============================================

/**
 * Service Category
 */
export interface ServiceCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  display_order: number;
  is_active: boolean;
  service_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Service / Product / Package
 */
export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  short_description?: string | null;
  service_type: ServiceType;
  status: ServiceStatus;

  // Categorization
  category_id?: string | null;
  category?: ServiceCategory | null;
  tags: string[];

  // Pricing
  price: number;
  currency: string;
  cost_price?: number | null;
  tax_rate?: number | null;
  taxable: boolean;

  // Duration (for services)
  duration_minutes?: number | null;
  buffer_time_minutes?: number | null;

  // Media
  image_url?: string | null;
  images: string[];

  // Industry-specific fields
  industry_type?: IndustryType | null;
  custom_fields: Record<string, unknown>;

  // Package/bundle info
  is_package: boolean;
  package_items?: PackageItem[];

  // Settings
  is_featured: boolean;
  is_bookable: boolean;
  max_capacity?: number | null;
  requires_deposit: boolean;
  deposit_amount?: number | null;

  // SKU/Code
  sku?: string | null;
  barcode?: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

/**
 * Package Item (for bundled services)
 */
export interface PackageItem {
  id: string;
  package_id: string;
  service_id: string;
  service?: Service;
  quantity: number;
  price_override?: number | null;
  display_order: number;
}

/**
 * Service Custom Field Definition
 */
export interface ServiceCustomField {
  id: string;
  tenant_id: string;
  service_id: string;
  key: string;
  label: string;
  field_type: CustomFieldType;
  value: unknown;
  options?: string[]; // For select/multiselect
  required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Service Activity Log
 */
export interface ServiceActivity {
  id: string;
  tenant_id: string;
  service_id: string;
  action: 'created' | 'updated' | 'archived' | 'activated' | 'deactivated' | 'price_changed';
  description: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  performed_by: string;
  performed_at: string;
}

// ============================================
// Industry-Specific Field Configurations
// ============================================

export interface IndustryFieldConfig {
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  serviceTypes?: ServiceType[]; // Which service types this applies to
}

/**
 * Industry-specific field configurations
 */
export const INDUSTRY_FIELD_CONFIGS: Record<IndustryType, IndustryFieldConfig[]> = {
  dental: [
    { key: 'specialty', label: 'Especialidad', type: 'select', required: false, options: ['General', 'Ortodoncia', 'Endodoncia', 'Periodoncia', 'Cirugía', 'Estética'], serviceTypes: ['service'] },
    { key: 'treatment_area', label: 'Área de tratamiento', type: 'text', required: false, serviceTypes: ['service'] },
    { key: 'anesthesia_required', label: 'Requiere anestesia', type: 'boolean', required: false, serviceTypes: ['service'] },
    { key: 'follow_up_days', label: 'Días para seguimiento', type: 'number', required: false, serviceTypes: ['service'] },
  ],
  automotive: [
    { key: 'service_category', label: 'Categoría de servicio', type: 'select', required: false, options: ['Mantenimiento', 'Reparación', 'Diagnóstico', 'Pintura', 'Hojalatería', 'Eléctrico'], serviceTypes: ['service'] },
    { key: 'vehicle_types', label: 'Tipos de vehículo', type: 'multiselect', required: false, options: ['Sedán', 'SUV', 'Camioneta', 'Motocicleta', 'Camión'], serviceTypes: ['service'] },
    { key: 'parts_included', label: 'Refacciones incluidas', type: 'boolean', required: false, serviceTypes: ['service', 'package'] },
    { key: 'warranty_days', label: 'Días de garantía', type: 'number', required: false, serviceTypes: ['service', 'product'] },
  ],
  beauty_salon: [
    { key: 'service_area', label: 'Área de servicio', type: 'select', required: false, options: ['Cabello', 'Uñas', 'Facial', 'Corporal', 'Maquillaje', 'Depilación'], serviceTypes: ['service'] },
    { key: 'materials_included', label: 'Materiales incluidos', type: 'boolean', required: false, serviceTypes: ['service'] },
    { key: 'skill_level', label: 'Nivel de estilista', type: 'select', required: false, options: ['Junior', 'Senior', 'Master', 'Director'], serviceTypes: ['service'] },
    { key: 'product_brand', label: 'Marca de producto', type: 'text', required: false, serviceTypes: ['product'] },
  ],
  real_estate: [
    { key: 'property_type', label: 'Tipo de propiedad', type: 'select', required: true, options: ['Casa', 'Departamento', 'Terreno', 'Local comercial', 'Oficina', 'Bodega'], serviceTypes: ['service', 'product'] },
    { key: 'transaction_type', label: 'Tipo de transacción', type: 'select', required: true, options: ['Venta', 'Renta', 'Traspaso'], serviceTypes: ['service'] },
    { key: 'area_m2', label: 'Área (m²)', type: 'number', required: false, serviceTypes: ['product'] },
    { key: 'location_zone', label: 'Zona/Ubicación', type: 'text', required: false, serviceTypes: ['product'] },
    { key: 'commission_percentage', label: 'Porcentaje de comisión', type: 'number', required: false, serviceTypes: ['service'] },
  ],
  consulting: [
    { key: 'consulting_type', label: 'Tipo de consultoría', type: 'select', required: false, options: ['Estratégica', 'Operativa', 'Financiera', 'Legal', 'TI', 'RRHH'], serviceTypes: ['service'] },
    { key: 'deliverables', label: 'Entregables', type: 'text', required: false, serviceTypes: ['service', 'package'] },
    { key: 'session_type', label: 'Tipo de sesión', type: 'select', required: false, options: ['Presencial', 'Virtual', 'Híbrido'], serviceTypes: ['service'] },
  ],
  healthcare: [
    { key: 'medical_specialty', label: 'Especialidad médica', type: 'select', required: false, options: ['General', 'Pediatría', 'Cardiología', 'Dermatología', 'Nutrición', 'Psicología'], serviceTypes: ['service'] },
    { key: 'requires_appointment', label: 'Requiere cita', type: 'boolean', required: false, serviceTypes: ['service'] },
    { key: 'prescription_required', label: 'Requiere receta', type: 'boolean', required: false, serviceTypes: ['product'] },
  ],
  fitness: [
    { key: 'class_type', label: 'Tipo de clase', type: 'select', required: false, options: ['Individual', 'Grupal', 'Semi-privada'], serviceTypes: ['service'] },
    { key: 'difficulty_level', label: 'Nivel de dificultad', type: 'select', required: false, options: ['Principiante', 'Intermedio', 'Avanzado'], serviceTypes: ['service'] },
    { key: 'equipment_required', label: 'Equipo requerido', type: 'text', required: false, serviceTypes: ['service'] },
    { key: 'max_participants', label: 'Máximo participantes', type: 'number', required: false, serviceTypes: ['service'] },
  ],
  restaurant: [
    { key: 'menu_category', label: 'Categoría del menú', type: 'select', required: false, options: ['Entrada', 'Plato fuerte', 'Postre', 'Bebida', 'Combo'], serviceTypes: ['product'] },
    { key: 'allergens', label: 'Alérgenos', type: 'multiselect', required: false, options: ['Gluten', 'Lácteos', 'Nueces', 'Mariscos', 'Soya', 'Huevo'], serviceTypes: ['product'] },
    { key: 'preparation_time', label: 'Tiempo de preparación (min)', type: 'number', required: false, serviceTypes: ['product'] },
    { key: 'calories', label: 'Calorías', type: 'number', required: false, serviceTypes: ['product'] },
  ],
  retail: [
    { key: 'brand', label: 'Marca', type: 'text', required: false, serviceTypes: ['product'] },
    { key: 'size', label: 'Talla/Tamaño', type: 'text', required: false, serviceTypes: ['product'] },
    { key: 'color', label: 'Color', type: 'text', required: false, serviceTypes: ['product'] },
    { key: 'material', label: 'Material', type: 'text', required: false, serviceTypes: ['product'] },
  ],
  professional_services: [
    { key: 'service_scope', label: 'Alcance del servicio', type: 'text', required: false, serviceTypes: ['service'] },
    { key: 'contract_required', label: 'Requiere contrato', type: 'boolean', required: false, serviceTypes: ['service'] },
    { key: 'certification', label: 'Certificación aplicable', type: 'text', required: false, serviceTypes: ['service'] },
  ],
  other: [],
};

// ============================================
// API Request/Response Types
// ============================================

export interface CreateServiceInput {
  name: string;
  description?: string;
  short_description?: string;
  service_type: ServiceType;
  status?: ServiceStatus;
  category_id?: string;
  tags?: string[];
  price: number;
  currency?: string;
  cost_price?: number;
  tax_rate?: number;
  taxable?: boolean;
  duration_minutes?: number;
  buffer_time_minutes?: number;
  image_url?: string;
  images?: string[];
  custom_fields?: Record<string, unknown>;
  is_featured?: boolean;
  is_bookable?: boolean;
  max_capacity?: number;
  requires_deposit?: boolean;
  deposit_amount?: number;
  sku?: string;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  id: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  display_order?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}

export interface CreateCustomFieldInput {
  service_id: string;
  key: string;
  label: string;
  field_type: CustomFieldType;
  value: unknown;
  options?: string[];
  required?: boolean;
  display_order?: number;
}

export interface UpdateCustomFieldInput extends Partial<CreateCustomFieldInput> {
  id: string;
}

// ============================================
// Filter Types
// ============================================

export interface ServicesFilters {
  search?: string;
  service_type?: ServiceType[];
  status?: ServiceStatus[];
  category_id?: string;
  is_featured?: boolean;
  is_bookable?: boolean;
  price_min?: number;
  price_max?: number;
  tags?: string[];
}

export interface CategoriesFilters {
  search?: string;
  is_active?: boolean;
  parent_id?: string | null;
}

// ============================================
// Statistics Types
// ============================================

export interface ServicesStatistics {
  total: number;
  by_type: Record<ServiceType, number>;
  by_status: Record<ServiceStatus, number>;
  active: number;
  featured: number;
  average_price: number;
  categories_count: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(price / 100); // Assuming price is stored in cents
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Get industry fields for a specific industry and service type
 */
export function getIndustryFields(
  industryType: IndustryType | null | undefined,
  serviceType?: ServiceType
): IndustryFieldConfig[] {
  if (!industryType) return [];
  const fields = INDUSTRY_FIELD_CONFIGS[industryType] || [];
  if (!serviceType) return fields;
  return fields.filter((f) => !f.serviceTypes || f.serviceTypes.includes(serviceType));
}

/**
 * Check if service has custom fields configured
 */
export function hasCustomFields(service: Service): boolean {
  return Object.keys(service.custom_fields || {}).length > 0;
}

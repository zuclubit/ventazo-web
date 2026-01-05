/**
 * Onboarding Internationalization
 *
 * Provides translations for the onboarding flow.
 * Supports Spanish (default) and English.
 *
 * @module lib/i18n/onboarding
 */

// ============================================
// Types
// ============================================

export type SupportedLocale = 'es' | 'en';

export interface OnboardingTranslations {
  // Common
  common: {
    next: string;
    back: string;
    skip: string;
    save: string;
    saving: string;
    continue: string;
    finish: string;
    loading: string;
    optional: string;
    required: string;
    error: string;
    success: string;
    retry: string;
    cancel: string;
  };

  // Progress
  progress: {
    completed: string;
    step: string;
    of: string;
  };

  // Steps
  steps: {
    business: {
      title: string;
      shortTitle: string;
      description: string;
    };
    branding: {
      title: string;
      shortTitle: string;
      description: string;
    };
    modules: {
      title: string;
      shortTitle: string;
      description: string;
    };
    hours: {
      title: string;
      shortTitle: string;
      description: string;
    };
    team: {
      title: string;
      shortTitle: string;
      description: string;
    };
  };

  // Create Business Page
  createBusiness: {
    title: string;
    subtitle: string;
    fields: {
      businessName: string;
      businessNamePlaceholder: string;
      businessType: string;
      businessTypePlaceholder: string;
      businessSize: string;
      phone: string;
      phonePlaceholder: string;
      country: string;
      city: string;
      cityPlaceholder: string;
      timezone: string;
    };
    validation: {
      nameRequired: string;
      typeRequired: string;
      sizeRequired: string;
      phoneInvalid: string;
    };
  };

  // Branding Page
  branding: {
    title: string;
    subtitle: string;
    fields: {
      logo: string;
      logoHint: string;
      logoOptional: string;
      companyName: string;
      companyNamePlaceholder: string;
      primaryColor: string;
      secondaryColor: string;
    };
    preview: string;
    dragDrop: string;
    uploadButton: string;
  };

  // Modules Page
  modules: {
    title: string;
    subtitle: string;
    recommended: string;
    essential: string;
    additional: string;
    moduleLabels: Record<string, { name: string; description: string }>;
  };

  // Business Hours Page
  businessHours: {
    title: string;
    subtitle: string;
    days: {
      monday: string;
      tuesday: string;
      wednesday: string;
      thursday: string;
      friday: string;
      saturday: string;
      sunday: string;
    };
    open: string;
    close: string;
    closed: string;
    applyToAll: string;
  };

  // Invite Team Page
  inviteTeam: {
    title: string;
    subtitle: string;
    fields: {
      email: string;
      emailPlaceholder: string;
      role: string;
    };
    roles: {
      admin: { name: string; description: string };
      manager: { name: string; description: string };
      sales_rep: { name: string; description: string };
      viewer: { name: string; description: string };
    };
    addAnother: string;
    inviteLater: string;
    sendInvites: string;
  };

  // Complete Page
  complete: {
    title: string;
    subtitle: string;
    features: string[];
    startButton: string;
  };

  // Footer
  footer: {
    copyright: string;
    allRightsReserved: string;
  };
}

// ============================================
// Spanish Translations (Default)
// ============================================

export const es: OnboardingTranslations = {
  common: {
    next: 'Siguiente',
    back: 'Atrás',
    skip: 'Omitir',
    save: 'Guardar',
    saving: 'Guardando...',
    continue: 'Continuar',
    finish: 'Finalizar',
    loading: 'Cargando...',
    optional: 'Opcional',
    required: 'Requerido',
    error: 'Error',
    success: 'Éxito',
    retry: 'Reintentar',
    cancel: 'Cancelar',
  },

  progress: {
    completed: 'completado',
    step: 'Paso',
    of: 'de',
  },

  steps: {
    business: {
      title: 'Tu negocio',
      shortTitle: 'Negocio',
      description: 'Información básica de tu empresa',
    },
    branding: {
      title: 'Personalización',
      shortTitle: 'Marca',
      description: 'Logo y colores de tu marca',
    },
    modules: {
      title: 'Módulos',
      shortTitle: 'Módulos',
      description: 'Funcionalidades del CRM',
    },
    hours: {
      title: 'Horarios',
      shortTitle: 'Horarios',
      description: 'Horario de atención',
    },
    team: {
      title: 'Equipo',
      shortTitle: 'Equipo',
      description: 'Invita a tu equipo',
    },
  },

  createBusiness: {
    title: 'Cuéntanos sobre tu negocio',
    subtitle: 'Esta información nos ayudará a personalizar tu experiencia en el CRM.',
    fields: {
      businessName: 'Nombre del negocio',
      businessNamePlaceholder: 'Ej: Mi Empresa S.A.',
      businessType: 'Tipo de negocio',
      businessTypePlaceholder: 'Selecciona un tipo',
      businessSize: 'Tamaño del equipo',
      phone: 'Teléfono de contacto',
      phonePlaceholder: '+52 55 1234 5678',
      country: 'País',
      city: 'Ciudad',
      cityPlaceholder: 'Ej: Ciudad de México',
      timezone: 'Zona horaria',
    },
    validation: {
      nameRequired: 'El nombre del negocio es requerido',
      typeRequired: 'Selecciona un tipo de negocio',
      sizeRequired: 'Selecciona el tamaño de tu equipo',
      phoneInvalid: 'Ingresa un número de teléfono válido',
    },
  },

  branding: {
    title: 'Personaliza tu marca',
    subtitle: 'Agrega tu logo y elige los colores que representan tu negocio.',
    fields: {
      logo: 'Logo de la empresa',
      logoHint: 'PNG, JPG, WebP o SVG hasta 5MB. Recomendado: 512x512px.',
      logoOptional: 'El logo es opcional. Puedes agregarlo después en Configuración.',
      companyName: 'Nombre comercial',
      companyNamePlaceholder: 'Mi Empresa',
      primaryColor: 'Color primario',
      secondaryColor: 'Color secundario',
    },
    preview: 'Vista previa',
    dragDrop: 'Arrastra tu logo aquí',
    uploadButton: 'Seleccionar archivo',
  },

  modules: {
    title: 'Selecciona los módulos',
    subtitle: 'Activa solo las funcionalidades que necesitas. Puedes cambiarlos después.',
    recommended: 'Recomendados para ti',
    essential: 'Esenciales',
    additional: 'Módulos adicionales',
    moduleLabels: {
      leads: { name: 'Leads', description: 'Gestión de prospectos y oportunidades' },
      customers: { name: 'Clientes', description: 'Base de datos de clientes' },
      opportunities: { name: 'Oportunidades', description: 'Pipeline de ventas' },
      tasks: { name: 'Tareas', description: 'Gestión de actividades' },
      calendar: { name: 'Calendario', description: 'Citas y eventos' },
      invoicing: { name: 'Facturación', description: 'Cotizaciones y facturas' },
      products: { name: 'Productos', description: 'Catálogo de productos' },
      teams: { name: 'Equipos', description: 'Gestión de equipos' },
      pipelines: { name: 'Pipelines', description: 'Flujos personalizados' },
      marketing: { name: 'Marketing', description: 'Campañas y automatizaciones' },
      whatsapp: { name: 'WhatsApp', description: 'Integración WhatsApp' },
      reports: { name: 'Reportes', description: 'Análisis y reportes' },
    },
  },

  businessHours: {
    title: 'Configura tus horarios',
    subtitle: 'Define los horarios de atención de tu negocio.',
    days: {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo',
    },
    open: 'Abre',
    close: 'Cierra',
    closed: 'Cerrado',
    applyToAll: 'Aplicar a todos los días',
  },

  inviteTeam: {
    title: 'Invita a tu equipo',
    subtitle: 'Agrega a los miembros de tu equipo para colaborar en el CRM.',
    fields: {
      email: 'Correo electrónico',
      emailPlaceholder: 'email@ejemplo.com',
      role: 'Rol',
    },
    roles: {
      admin: { name: 'Administrador', description: 'Acceso completo al sistema' },
      manager: { name: 'Gerente', description: 'Gestiona equipos y reportes' },
      sales_rep: { name: 'Vendedor', description: 'Gestiona leads y clientes' },
      viewer: { name: 'Observador', description: 'Solo lectura' },
    },
    addAnother: 'Agregar otro',
    inviteLater: 'Invitar después',
    sendInvites: 'Enviar invitaciones',
  },

  complete: {
    title: '¡Todo listo!',
    subtitle: 'Tu CRM está configurado y listo para usar.',
    features: [
      'Panel de control personalizado',
      'Gestión de leads y clientes',
      'Reportes y análisis',
      'Integraciones disponibles',
    ],
    startButton: 'Comenzar a usar el CRM',
  },

  footer: {
    copyright: '©',
    allRightsReserved: 'Todos los derechos reservados.',
  },
};

// ============================================
// English Translations
// ============================================

export const en: OnboardingTranslations = {
  common: {
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    save: 'Save',
    saving: 'Saving...',
    continue: 'Continue',
    finish: 'Finish',
    loading: 'Loading...',
    optional: 'Optional',
    required: 'Required',
    error: 'Error',
    success: 'Success',
    retry: 'Retry',
    cancel: 'Cancel',
  },

  progress: {
    completed: 'completed',
    step: 'Step',
    of: 'of',
  },

  steps: {
    business: {
      title: 'Your business',
      shortTitle: 'Business',
      description: 'Basic company information',
    },
    branding: {
      title: 'Customization',
      shortTitle: 'Brand',
      description: 'Logo and brand colors',
    },
    modules: {
      title: 'Modules',
      shortTitle: 'Modules',
      description: 'CRM features',
    },
    hours: {
      title: 'Business hours',
      shortTitle: 'Hours',
      description: 'Operating schedule',
    },
    team: {
      title: 'Team',
      shortTitle: 'Team',
      description: 'Invite your team',
    },
  },

  createBusiness: {
    title: 'Tell us about your business',
    subtitle: 'This information will help us personalize your CRM experience.',
    fields: {
      businessName: 'Business name',
      businessNamePlaceholder: 'e.g., My Company Inc.',
      businessType: 'Business type',
      businessTypePlaceholder: 'Select a type',
      businessSize: 'Team size',
      phone: 'Contact phone',
      phonePlaceholder: '+1 555 123 4567',
      country: 'Country',
      city: 'City',
      cityPlaceholder: 'e.g., New York',
      timezone: 'Timezone',
    },
    validation: {
      nameRequired: 'Business name is required',
      typeRequired: 'Please select a business type',
      sizeRequired: 'Please select your team size',
      phoneInvalid: 'Please enter a valid phone number',
    },
  },

  branding: {
    title: 'Customize your brand',
    subtitle: 'Add your logo and choose colors that represent your business.',
    fields: {
      logo: 'Company logo',
      logoHint: 'PNG, JPG, WebP or SVG up to 5MB. Recommended: 512x512px.',
      logoOptional: 'Logo is optional. You can add it later in Settings.',
      companyName: 'Company name',
      companyNamePlaceholder: 'My Company',
      primaryColor: 'Primary color',
      secondaryColor: 'Secondary color',
    },
    preview: 'Preview',
    dragDrop: 'Drag your logo here',
    uploadButton: 'Select file',
  },

  modules: {
    title: 'Select modules',
    subtitle: 'Enable only the features you need. You can change them later.',
    recommended: 'Recommended for you',
    essential: 'Essential',
    additional: 'Additional modules',
    moduleLabels: {
      leads: { name: 'Leads', description: 'Prospect and opportunity management' },
      customers: { name: 'Customers', description: 'Customer database' },
      opportunities: { name: 'Opportunities', description: 'Sales pipeline' },
      tasks: { name: 'Tasks', description: 'Activity management' },
      calendar: { name: 'Calendar', description: 'Appointments and events' },
      invoicing: { name: 'Invoicing', description: 'Quotes and invoices' },
      products: { name: 'Products', description: 'Product catalog' },
      teams: { name: 'Teams', description: 'Team management' },
      pipelines: { name: 'Pipelines', description: 'Custom workflows' },
      marketing: { name: 'Marketing', description: 'Campaigns and automation' },
      whatsapp: { name: 'WhatsApp', description: 'WhatsApp integration' },
      reports: { name: 'Reports', description: 'Analytics and reports' },
    },
  },

  businessHours: {
    title: 'Set your hours',
    subtitle: 'Define your business operating hours.',
    days: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    },
    open: 'Opens',
    close: 'Closes',
    closed: 'Closed',
    applyToAll: 'Apply to all days',
  },

  inviteTeam: {
    title: 'Invite your team',
    subtitle: 'Add team members to collaborate on the CRM.',
    fields: {
      email: 'Email address',
      emailPlaceholder: 'email@example.com',
      role: 'Role',
    },
    roles: {
      admin: { name: 'Administrator', description: 'Full system access' },
      manager: { name: 'Manager', description: 'Manage teams and reports' },
      sales_rep: { name: 'Sales Rep', description: 'Manage leads and customers' },
      viewer: { name: 'Viewer', description: 'Read-only access' },
    },
    addAnother: 'Add another',
    inviteLater: 'Invite later',
    sendInvites: 'Send invitations',
  },

  complete: {
    title: 'All set!',
    subtitle: 'Your CRM is configured and ready to use.',
    features: [
      'Personalized dashboard',
      'Lead and customer management',
      'Reports and analytics',
      'Available integrations',
    ],
    startButton: 'Start using the CRM',
  },

  footer: {
    copyright: '©',
    allRightsReserved: 'All rights reserved.',
  },
};

// ============================================
// Translation Map
// ============================================

export const translations: Record<SupportedLocale, OnboardingTranslations> = {
  es,
  en,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get translations for a specific locale
 */
export function getTranslations(locale: SupportedLocale = 'es'): OnboardingTranslations {
  return translations[locale] || translations.es;
}

/**
 * Detect user's preferred locale
 */
export function detectLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'es';

  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'en' ? 'en' : 'es';
}

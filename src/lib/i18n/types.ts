// ============================================
// i18n Types - Multi-language & Multi-currency
// ============================================

export type LocaleCode = 'es-MX' | 'es-CO' | 'es-AR' | 'es-CL' | 'es-PE' | 'pt-BR' | 'en-US';

export type CurrencyCode = 'MXN' | 'COP' | 'ARS' | 'CLP' | 'PEN' | 'BRL' | 'USD';

export interface Country {
  code: string;
  name: string;
  nameEn: string;
  locale: LocaleCode;
  currency: CurrencyCode;
  currencySymbol: string;
  currencyName: string;
  flag: string;
  phoneCode: string;
  taxName: string;
  taxRate: number;
  invoiceSystem: string;
  timezone: string;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
}

export interface PricingTier {
  starter: {
    price: number;
    formatted: string;
  };
  professional: {
    price: number;
    formatted: string;
  };
  enterprise: string;
}

export interface Translations {
  // Navigation
  nav: {
    features: string;
    ai: string;
    integrations: string;
    pricing: string;
    login: string;
    register: string;
    startFree: string;
    apiDocs: string;
  };
  // Hero Section
  hero: {
    badge: string;
    title: string;
    titleHighlight: string;
    titleSuffix: string;
    description: string;
    cta: string;
    ctaSecondary: string;
    noCard: string;
  };
  // Stats
  stats: {
    features: string;
    featuresLabel: string;
    integrations: string;
    integrationsLabel: string;
    uptime: string;
    uptimeLabel: string;
    setup: string;
    setupLabel: string;
  };
  // Features Section
  features: {
    title: string;
    subtitle: string;
    leads: {
      title: string;
      description: string;
      features: string[];
    };
    opportunities: {
      title: string;
      description: string;
      features: string[];
    };
    customers: {
      title: string;
      description: string;
      features: string[];
    };
    tasks: {
      title: string;
      description: string;
      features: string[];
    };
    automations: {
      title: string;
      description: string;
      features: string[];
    };
    analytics: {
      title: string;
      description: string;
      features: string[];
    };
    catalog: {
      title: string;
      description: string;
      features: string[];
    };
    calendar: {
      title: string;
      description: string;
      features: string[];
    };
  };
  // AI Section
  ai: {
    badge: string;
    title: string;
    subtitle: string;
    scoring: {
      title: string;
      description: string;
    };
    emails: {
      title: string;
      description: string;
    };
    conversations: {
      title: string;
      description: string;
    };
    forecasting: {
      title: string;
      description: string;
    };
    summaries: {
      title: string;
      description: string;
    };
    alerts: {
      title: string;
      description: string;
    };
    assistant: {
      title: string;
      subtitle: string;
      message: string;
      actions: string;
      action1: string;
      action2: string;
      action3: string;
      button: string;
      buttonSecondary: string;
    };
  };
  // Communication Section
  communication: {
    title: string;
    subtitle: string;
    whatsapp: {
      name: string;
      description: string;
    };
    email: {
      name: string;
      description: string;
    };
    calls: {
      name: string;
      description: string;
    };
    sms: {
      name: string;
      description: string;
    };
    notifications: {
      name: string;
      description: string;
    };
    inbox: {
      title: string;
      unread: string;
    };
  };
  // Integrations Section
  integrations: {
    title: string;
    subtitle: string;
    invoice: {
      title: string;
      description: string;
      features: string[];
    };
  };
  // Security Section
  security: {
    title: string;
    subtitle: string;
    encryption: {
      title: string;
      description: string;
    };
    gdpr: {
      title: string;
      description: string;
    };
    access: {
      title: string;
      description: string;
    };
    audit: {
      title: string;
      description: string;
    };
  };
  // Pricing Section
  pricing: {
    title: string;
    subtitle: string;
    perUser: string;
    starter: {
      name: string;
      description: string;
      features: string[];
      cta: string;
    };
    professional: {
      name: string;
      description: string;
      features: string[];
      cta: string;
      popular: string;
    };
    enterprise: {
      name: string;
      price: string;
      description: string;
      features: string[];
      cta: string;
    };
  };
  // CTA Section
  cta: {
    title: string;
    subtitle: string;
    button: string;
    buttonSecondary: string;
  };
  // Footer
  footer: {
    description: string;
    countries: string;
    product: string;
    resources: string;
    legal: string;
    demo: string;
    documentation: string;
    api: string;
    blog: string;
    privacy: string;
    terms: string;
    cookies: string;
    copyright: string;
    status: string;
  };
  // Common
  common: {
    free: string;
    custom: string;
    learnMore: string;
    getStarted: string;
    contactSales: string;
  };
  // Authentication
  // Onboarding
  onboarding: {
    // Steps
    steps: {
      signup: string;
      createBusiness: string;
      branding: string;
      modules: string;
      businessHours: string;
      inviteTeam: string;
      complete: string;
    };
    // Create Business Page
    createBusiness: {
      title: string;
      subtitle: string;
      detectingLocation: string;
      // Sections
      sections: {
        businessInfo: {
          title: string;
          description: string;
        };
        contact: {
          title: string;
          description: string;
        };
        location: {
          title: string;
          description: string;
        };
        fiscal: {
          title: string;
          description: string;
        };
        digital: {
          title: string;
          description: string;
        };
      };
      // Fields
      fields: {
        businessName: {
          label: string;
          placeholder: string;
          description: string;
        };
        businessType: {
          label: string;
          placeholder: string;
          description: string;
        };
        businessSize: {
          label: string;
          placeholder: string;
          description: string;
        };
        phone: {
          label: string;
          description: string;
        };
        city: {
          label: string;
          placeholder: string;
        };
        country: {
          label: string;
        };
        timezone: {
          label: string;
        };
        legalName: {
          label: string;
          placeholder: string;
          description: string;
        };
        taxId: {
          label: string;
          labelAlt: string;
          placeholder: string;
          placeholderAlt: string;
          tooltip: string;
          tooltipAlt: string;
        };
        email: {
          label: string;
          placeholder: string;
          description: string;
        };
        website: {
          label: string;
          placeholder: string;
          description: string;
        };
        industry: {
          label: string;
          placeholder: string;
          description: string;
        };
      };
      // Buttons & Actions
      actions: {
        back: string;
        continue: string;
        creating: string;
        advancedOptions: string;
      };
      // Benefits by business type
      benefits: {
        title: string;
        dental: string[];
        medical: string[];
        automotive: string[];
        realEstate: string[];
        beautySalon: string[];
        professionalServices: string[];
        retail: string[];
        restaurant: string[];
        fitness: string[];
        education: string[];
        other: string[];
      };
      // Validation messages
      validation: {
        businessNameMin: string;
        businessNameMax: string;
        businessNameInvalid: string;
        businessTypeRequired: string;
        businessSizeRequired: string;
        phoneMin: string;
        phoneMax: string;
        cityMin: string;
        countryRequired: string;
        timezoneRequired: string;
        emailInvalid: string;
        websiteInvalid: string;
        legalNameMin: string;
        legalNameMax: string;
        taxIdInvalid: string;
      };
      // Success state
      success: {
        title: string;
        description: string;
      };
      // Errors
      errors: {
        generic: string;
        createFailed: string;
      };
    };
    // Business Types
    businessTypes: {
      dental: string;
      medical: string;
      automotive: string;
      realEstate: string;
      beautySalon: string;
      education: string;
      professionalServices: string;
      retail: string;
      restaurant: string;
      fitness: string;
      other: string;
    };
    // Business Sizes
    businessSizes: {
      solo: { label: string; description: string };
      small: { label: string; description: string };
      medium: { label: string; description: string };
      growing: { label: string; description: string };
      established: { label: string; description: string };
      large: { label: string; description: string };
      enterprise: { label: string; description: string };
    };
  };
  auth: {
    login: {
      title: string;
      subtitle: string;
      emailLabel: string;
      emailPlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      forgotPassword: string;
      submitButton: string;
      submitting: string;
      noAccount: string;
      registerLink: string;
      termsPrefix: string;
      termsLink: string;
      andText: string;
      privacyLink: string;
    };
    register: {
      title: string;
      subtitle: string;
      nameLabel: string;
      namePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      confirmPasswordLabel: string;
      confirmPasswordPlaceholder: string;
      submitButton: string;
      submitting: string;
      hasAccount: string;
      loginLink: string;
    };
    forgotPassword: {
      title: string;
      subtitle: string;
      emailLabel: string;
      emailPlaceholder: string;
      submitButton: string;
      submitting: string;
      backToLogin: string;
      successTitle: string;
      successMessage: string;
    };
    resetPassword: {
      title: string;
      subtitle: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      confirmPasswordLabel: string;
      confirmPasswordPlaceholder: string;
      submitButton: string;
      submitting: string;
      successTitle: string;
      successMessage: string;
    };
    errors: {
      emailRequired: string;
      emailInvalid: string;
      passwordRequired: string;
      passwordMinLength: string;
      passwordMismatch: string;
      passwordNeedsUppercase: string;
      passwordNeedsLowercase: string;
      passwordNeedsNumber: string;
      passwordNeedsSpecial: string;
      nameRequired: string;
      sessionExpired: string;
      accessDenied: string;
      invalidCredentials: string;
      emailNotConfirmed: string;
      emailNotConfirmedDescription: string;
      emailNotConfirmedHint: string;
      resendConfirmation: string;
      resendConfirmationSuccess: string;
      userNotFound: string;
      accountLocked: string;
      tooManyAttempts: string;
      networkError: string;
      unknownError: string;
    };
    validation: {
      showPassword: string;
      hidePassword: string;
      passwordStrength: {
        weak: string;
        fair: string;
        good: string;
        strong: string;
      };
    };
    loading: {
      authenticating: string;
      creatingAccount: string;
      sendingEmail: string;
      updatingPassword: string;
      redirecting: string;
      verifyingToken: string;
    };
  };
}

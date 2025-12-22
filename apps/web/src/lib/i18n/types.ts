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
    // Hero panel for split-screen auth layouts
    hero: {
      headline: string;
      subheadline: string;
      features: {
        security: string;
        speed: string;
        collaboration: string;
        analytics: string;
      };
      stats: {
        users: string;
        uptime: string;
      };
    };
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
  // Leads Module (CRM App)
  leads: {
    // Page titles
    title: string;
    subtitle: string;
    newLead: string;
    editLead: string;
    // Status labels
    status: {
      label: string;
      new: string;
      newShort: string;
      contacted: string;
      contactedShort: string;
      inProgress: string;
      inProgressShort: string;
      qualified: string;
      qualifiedShort: string;
      proposal: string;
      proposalShort: string;
      negotiation: string;
      negotiationShort: string;
      won: string;
      wonShort: string;
      lost: string;
      lostShort: string;
    };
    // Form sections
    form: {
      // Progress
      progress: string;
      // Personal info section
      personalInfo: {
        title: string;
        description: string;
      };
      // Company info section
      companyInfo: {
        title: string;
        description: string;
      };
      // Classification section
      classification: {
        title: string;
        description: string;
      };
      // Notes section
      notes: {
        title: string;
        description: string;
      };
      // Field labels
      fields: {
        fullName: {
          label: string;
          placeholder: string;
        };
        email: {
          label: string;
          placeholder: string;
        };
        phone: {
          label: string;
          placeholder: string;
          hint: string;
        };
        company: {
          label: string;
          placeholder: string;
          hint: string;
        };
        jobTitle: {
          label: string;
          placeholder: string;
          hint: string;
        };
        website: {
          label: string;
          placeholder: string;
          hint: string;
        };
        industry: {
          label: string;
          placeholder: string;
          hint: string;
        };
        source: {
          label: string;
          placeholder: string;
        };
        stage: {
          label: string;
          placeholder: string;
          noStage: string;
        };
        tags: {
          label: string;
          placeholder: string;
          addHint: string;
          limitReached: string;
        };
        notes: {
          label: string;
          placeholder: string;
        };
      };
      // Actions
      actions: {
        create: string;
        creating: string;
        save: string;
        saving: string;
        cancel: string;
        close: string;
      };
      // Validation
      validation: {
        required: string;
        nameMin: string;
        nameMax: string;
        nameInvalid: string;
        emailRequired: string;
        emailInvalid: string;
        emailMax: string;
        phoneMax: string;
        phoneInvalid: string;
        companyMax: string;
        jobTitleMax: string;
        websiteInvalid: string;
        websiteMax: string;
        industryMax: string;
        notesMax: string;
        fixErrors: string;
      };
      // Success messages
      success: {
        created: string;
        createdDescription: string;
        updated: string;
        updatedDescription: string;
      };
      // Error messages
      errors: {
        saveFailed: string;
        loadFailed: string;
      };
    };
    // Source labels (matches LeadSource enum)
    sources: {
      manual: string;
      website: string;
      referral: string;
      social: string;
      advertising: string;  // Maps to LeadSource.AD
      organic: string;      // Maps to LeadSource.ORGANIC
      other: string;
    };
    // Quick actions
    quickActions: {
      call: string;
      callTooltip: string;
      email: string;
      emailTooltip: string;
      whatsapp: string;
      edit: string;
      addTask: string;
      cancelEdit: string;
      editLead: string;
    };
    // Dialog/Toast messages
    dialogs: {
      updated: string;
      created: string;
      converted: string;
      deleted: string;
      selectStage: string;
    };
    // Accessibility labels
    a11y: {
      selectStatus: string;
      validField: string;
    };
    // KPI Dashboard
    kpi: {
      total: string;
      new: string;
      qualified: string;
      converted: string;
      thisMonth: string;
      trend: string;
    };
    // Empty state
    empty: {
      title: string;
      description: string;
      cta: string;
    };
    // Filters
    filters: {
      all: string;
      status: string;
      source: string;
      dateRange: string;
      search: string;
      searchPlaceholder: string;
      clear: string;
    };
    // List
    list: {
      score: string;
      lastActivity: string;
      noActivity: string;
      noResults: string;
      loadMore: string;
    };
    // Card component (LeadCardV3)
    card: {
      noName: string;
      score: string;
      scoreHot: string;
      scoreWarm: string;
      scoreCold: string;
      overdue: string;
      upcoming: string;
      loading: string;
      loadingInfo: string;
      channels: {
        whatsapp: string;
        social: string;
        email: string;
        referral: string;
        phone: string;
        manual: string;
        website: string;
        ad: string;
        organic: string;
      };
      actions: {
        whatsapp: string;
        whatsappDisabled: string;
        call: string;
        callDisabled: string;
        email: string;
        emailDisabled: string;
        quickActions: string;
      };
      aria: {
        leadInfo: string;
        scoreIndicator: string;
      };
      time: {
        minutes: string;
        hours: string;
        days: string;
        weeks: string;
        months: string;
        upcoming: string;
      };
    };
  };
  // Opportunities Module (CRM App)
  opportunities: {
    // Page titles
    title: string;
    subtitle: string;
    pipelineSubtitle: string;
    newOpportunity: string;
    editOpportunity: string;
    // Status labels
    status: {
      label: string;
      open: string;
      won: string;
      lost: string;
      all: string;
    };
    // Priority labels
    priority: {
      label: string;
      low: string;
      medium: string;
      high: string;
      critical: string;
      all: string;
    };
    // Source labels
    source: {
      label: string;
      leadConversion: string;
      direct: string;
      referral: string;
      upsell: string;
      crossSell: string;
      unspecified: string;
    };
    // Probability labels
    probability: {
      label: string;
      closeProbability: string;
      low: string;
      medium: string;
      high: string;
      forecast: string;
    };
    // Form
    form: {
      // Sections
      sections: {
        basic: {
          title: string;
          description: string;
        };
        value: {
          title: string;
          description: string;
        };
        details: {
          title: string;
          description: string;
        };
      };
      // Field labels
      fields: {
        name: {
          label: string;
          placeholder: string;
        };
        description: {
          label: string;
          placeholder: string;
        };
        stage: {
          label: string;
          placeholder: string;
        };
        priority: {
          label: string;
          placeholder: string;
        };
        amount: {
          label: string;
          placeholder: string;
        };
        currency: {
          label: string;
        };
        probability: {
          label: string;
        };
        expectedCloseDate: {
          label: string;
          placeholder: string;
        };
        source: {
          label: string;
          placeholder: string;
        };
        tags: {
          label: string;
          placeholder: string;
          hint: string;
        };
      };
      // Actions
      actions: {
        create: string;
        creating: string;
        save: string;
        saving: string;
        cancel: string;
      };
      // Validation
      validation: {
        nameMin: string;
        stageRequired: string;
        stageInvalid: string;
        amountPositive: string;
        probabilityRange: string;
      };
      // Success messages
      success: {
        created: string;
        createdDescription: string;
        updated: string;
        updatedDescription: string;
      };
      // Error messages
      errors: {
        createFailed: string;
        updateFailed: string;
        loadFailed: string;
      };
    };
    // Win/Lost Dialog
    winLostDialog: {
      win: {
        title: string;
        description: string;
        notesLabel: string;
        notesPlaceholder: string;
        confirm: string;
      };
      lost: {
        title: string;
        description: string;
        reasonLabel: string;
        reasonPlaceholder: string;
        reasonRequired: string;
        confirm: string;
      };
      success: {
        won: string;
        wonDescription: string;
        lost: string;
        lostDescription: string;
      };
      errors: {
        wonFailed: string;
        lostFailed: string;
      };
    };
    // Delete Dialog
    deleteDialog: {
      title: string;
      description: string;
      confirm: string;
      success: string;
      successDescription: string;
      error: string;
    };
    // Preview Panel
    preview: {
      noClient: string;
      opportunityValue: string;
      closeProbability: string;
      details: string;
      expectedCloseDate: string;
      client: string;
      associatedLead: string;
      owner: string;
      unassigned: string;
      created: string;
      description: string;
      tags: string;
      edit: string;
      viewDetails: string;
      opportunityDetails: string;
    };
    // KPI Dashboard
    kpi: {
      pipelineTotal: string;
      opportunities: string;
      forecast: string;
      weightedValue: string;
      won: string;
      closed: string;
      lost: string;
    };
    // Empty state
    empty: {
      badge: string;
      title: string;
      description: string;
      createFromLead: {
        badge: string;
        title: string;
        description: string;
        feature1: string;
        feature2: string;
        feature3: string;
        selectLead: string;
        viewAllLeads: string;
      };
      createManually: {
        title: string;
        description: string;
        button: string;
      };
      importExcel: {
        title: string;
        description: string;
        button: string;
      };
      divider: string;
      noResults: string;
      noResultsSearch: string;
      noResultsFilters: string;
      tryOtherTerms: string;
      noOpportunitiesInState: string;
      noOpportunitiesMatchFilter: string;
      viewAll: string;
      clearFilters: string;
      noOpportunities: string;
    };
    // Filters
    filters: {
      label: string;
      search: string;
      searchPlaceholder: string;
      status: string;
      priority: string;
      stage: string;
      allStages: string;
      clearAll: string;
      activeStage: string;
    };
    // Kanban
    kanban: {
      addOpportunity: string;
      total: string;
      viewToggle: {
        kanban: string;
        list: string;
      };
      listViewInProgress: string;
      backToKanban: string;
    };
    // Actions
    actions: {
      refresh: string;
      newOpportunity: string;
      edit: string;
      delete: string;
      cancel: string;
      create: string;
    };
    // Activity labels
    activity: {
      created: string;
      updated: string;
      statusChanged: string;
      stageChanged: string;
      ownerChanged: string;
      amountChanged: string;
      probabilityChanged: string;
      won: string;
      lost: string;
      reopened: string;
      noteAdded: string;
      noteUpdated: string;
      noteDeleted: string;
      closeDateChanged: string;
      contactLinked: string;
      contactUnlinked: string;
    };
    // Detail page
    detail: {
      backToList: string;
      noCustomer: string;
      refresh: string;
      won: string;
      lost: string;
      amount: string;
      probability: string;
      forecast: string;
      forecastFormula: string;
      expectedClose: string;
      tabs: {
        overview: string;
        aiInsights: string;
        notes: string;
        activity: string;
        related: string;
      };
      generalInfo: string;
      stage: string;
      currency: string;
      description: string;
      tags: string;
      datesAndStatus: string;
      created: string;
      updated: string;
      actualClose: string;
      closingNotes: string;
      lossReason: string;
      activityHistory: string;
      activityDescription: string;
      noActivity: string;
      customer: string;
      lead: string;
      owner: string;
      contact: string;
      noCustomerAssigned: string;
      noLeadAssigned: string;
      noOwnerAssigned: string;
      noContactAssigned: string;
      notes: {
        placeholder: string;
        addNote: string;
        noteAdded: string;
        noteAddedDescription: string;
        notePinned: string;
        noteUnpinned: string;
        noteDeleted: string;
        noNotes: string;
        pin: string;
        unpin: string;
        delete: string;
        user: string;
        by: string;
      };
      error: {
        title: string;
        description: string;
        retry: string;
        back: string;
        notFound: string;
        backToOpportunities: string;
      };
    };
    // Pipeline page
    pipeline: {
      title: string;
      subtitle: string;
      refresh: string;
      pipelineTotal: string;
      opportunitiesCount: string;
      forecast: string;
      weightedValue: string;
      won: string;
      wonClosed: string;
      stages: string;
      stagesInPipeline: string;
      noStages: string;
      noStagesDescription: string;
      noOpportunities: string;
      total: string;
      opportunityMoved: string;
      opportunityMovedTo: string;
      markWon: string;
      markLost: string;
    };
  };
}

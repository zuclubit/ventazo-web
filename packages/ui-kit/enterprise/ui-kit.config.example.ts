/**
 * @zuclubit/ui-kit Enterprise Configuration
 *
 * Copy this file to your project root as `ui-kit.config.ts`
 * and customize according to your adoption path.
 *
 * @see ENTERPRISE_ADOPTION.md for detailed configuration options
 */

import type { UIKitConfig } from '@zuclubit/ui-kit';

// =============================================================================
// CONFIGURATION PRESETS
// =============================================================================

/**
 * MINIMAL CONFIGURATION (Path 1)
 * - Required for all projects
 * - Conformance Bronze (60+)
 * - Basic governance
 */
const minimalConfig: UIKitConfig = {
  // Policies
  policies: 'core', // ENTERPRISE_POLICIES.CORE
  enforceMode: 'strict',

  // Conformance
  conformance: {
    minLevel: 'bronze',
    minScore: 60,
    blockBuild: true,
  },

  // Accessibility
  accessibility: {
    standard: 'wcag-aa',
    blockOnCritical: true,
  },

  // Development
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
    showViolations: true,
  },
};

/**
 * STANDARD CONFIGURATION (Path 2) - RECOMMENDED
 * - For production applications
 * - Conformance Silver (75+)
 * - Full governance + token coverage
 */
const standardConfig: UIKitConfig = {
  // Policies
  policies: 'standard', // ENTERPRISE_POLICIES.STANDARD
  enforceMode: 'strict',

  // Conformance
  conformance: {
    minLevel: 'silver',
    minScore: 75,
    blockBuild: true,
    tokenCoverage: {
      min: 0.80,
      warnBelow: 0.85,
    },
  },

  // Accessibility
  accessibility: {
    standard: 'wcag-aa',
    apca: {
      bodyText: 60,
      uiElements: 45,
    },
    blockOnCritical: true,
    blockOnSerious: false,
  },

  // Audit
  audit: {
    enabled: true,
    logLevel: 'warn',
  },

  // Development
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
    showViolations: true,
    highlightIssues: true,
    overlay: {
      enabled: true,
      position: 'bottom-right',
    },
  },

  // CI/CD
  ci: {
    generateReport: true,
    reportFormat: ['json', 'markdown'],
    failOnRegression: true,
    regressionThreshold: 5, // points
  },
};

/**
 * PREMIUM CONFIGURATION (Path 3)
 * - For design-critical applications
 * - Conformance Gold (85+)
 * - Full audit trail + APCA compliance
 */
const premiumConfig: UIKitConfig = {
  // Policies
  policies: 'premium', // ENTERPRISE_POLICIES.PREMIUM
  enforceMode: 'strict',

  // Conformance
  conformance: {
    minLevel: 'gold',
    minScore: 85,
    blockBuild: true,
    tokenCoverage: {
      min: 0.95,
      warnBelow: 0.98,
    },
  },

  // Accessibility
  accessibility: {
    standard: 'apca-body',
    apca: {
      bodyText: 75,
      uiElements: 60,
      largeText: 45,
    },
    blockOnCritical: true,
    blockOnSerious: true,
  },

  // Audit
  audit: {
    enabled: true,
    logLevel: 'info',
    persist: true,
    exportFormat: 'w3c-dtcg',
  },

  // Development
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
    showViolations: true,
    highlightIssues: true,
    overlay: {
      enabled: true,
      position: 'bottom-right',
      maxHeight: '400px',
    },
    realTimeValidation: true,
  },

  // CI/CD
  ci: {
    generateReport: true,
    reportFormat: ['json', 'markdown', 'html'],
    failOnRegression: true,
    regressionThreshold: 3, // points
    publishMetrics: true,
    metricsEndpoint: process.env.METRICS_ENDPOINT,
  },

  // Performance
  performance: {
    cacheEnabled: true,
    memoization: true,
    batchValidation: true,
  },
};

// =============================================================================
// EXPORT CONFIGURATION
// =============================================================================

// Choose your configuration based on adoption path
// Uncomment the one you need:

// export default minimalConfig;
export default standardConfig;
// export default premiumConfig;

// =============================================================================
// CUSTOM CONFIGURATION EXAMPLE
// =============================================================================

/**
 * Example of extending standard config with custom settings
 */
export const customConfig: UIKitConfig = {
  ...standardConfig,

  // Custom product tokens
  tokens: {
    extend: {
      colors: {
        'product-accent': {
          value: 'oklch(0.7 0.15 220)',
          description: 'Product-specific accent color',
        },
      },
    },
  },

  // Custom policies
  customPolicies: [
    {
      id: 'product-brand-colors',
      name: 'Product Brand Colors',
      description: 'Ensure brand colors are used correctly',
      category: 'brand',
      scope: 'component',
      enforcement: 'required',
      severity: 'high',
      rules: [
        {
          id: 'brand-primary-usage',
          type: 'color',
          condition: {
            check: 'brand-alignment',
            threshold: 0.95,
          },
        },
      ],
    },
  ],

  // Environment-specific overrides
  environments: {
    development: {
      enforceMode: 'warn',
      conformance: {
        blockBuild: false,
      },
    },
    staging: {
      enforceMode: 'strict',
      conformance: {
        blockBuild: true,
      },
    },
    production: {
      enforceMode: 'strict',
      conformance: {
        blockBuild: true,
      },
      audit: {
        persist: true,
      },
    },
  },
};

// =============================================================================
// TYPE DEFINITIONS (for reference)
// =============================================================================

/**
 * Full type definition available at:
 * import type { UIKitConfig } from '@zuclubit/ui-kit';
 *
 * interface UIKitConfig {
 *   policies: 'core' | 'standard' | 'premium' | PolicySet;
 *   enforceMode: 'strict' | 'warn' | 'off';
 *   conformance: ConformanceConfig;
 *   accessibility: AccessibilityConfig;
 *   audit: AuditConfig;
 *   devtools: DevtoolsConfig;
 *   ci: CIConfig;
 *   tokens: TokenConfig;
 *   customPolicies: PolicyDefinition[];
 *   environments: EnvironmentOverrides;
 *   performance: PerformanceConfig;
 * }
 */

/**
 * Bottom Navigation AI-Readable Contracts
 *
 * LLM-interpretable decision contracts for bottom navigation colors.
 * These contracts explain WHY certain colors were chosen and
 * provide guidance for future color decisions.
 *
 * Uses Color Intelligence v5.x AIActionContractGenerator
 *
 * @module lib/theme/contracts/bottom-nav-ai-contracts
 * @version 1.0.0
 */

import {
  AIActionContractGenerator,
  createContractGenerator,
  createQuickContract,
  createStrictContract,
  createBrandContract,
  generateContractFromPolicy,
  validateAction,
  type AIActionContract,
  type AIAction,
  type AIActionType,
  type PerceptualConstraints,
  type ActionValidationResult,
} from '@/lib/color-intelligence';

// ============================================
// Types
// ============================================

export interface BottomNavColorDecision {
  element: string;
  color: string;
  background: string;
  apcaLc: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  reasoning: string;
  alternatives: string[];
  autoRemediated: boolean;
}

export interface BottomNavAIContract {
  version: string;
  timestamp: string;
  component: string;
  wcag3Tier: 'gold' | 'platinum';

  // Contract sections
  summary: string;
  constraints: PerceptualConstraints;
  decisions: BottomNavColorDecision[];
  governanceNotes: string[];

  // Machine-readable contract
  contract: AIActionContract;

  // Validation results
  validation: ActionValidationResult;
}

export interface ContractGeneratorConfig {
  primaryColor: string;
  accentColor?: string;
  mode: 'light' | 'dark';
  strictness: 'lenient' | 'standard' | 'strict';
}

// ============================================
// Contract Templates
// ============================================

const BOTTOM_NAV_CONSTRAINTS: PerceptualConstraints = {
  minApcaLc: 75, // Gold tier minimum
  maxApcaLc: 106,
  minWcagRatio: 4.5,
  preferredColorSpace: 'oklch',
  gamutMapping: 'perceptual',
  chromaPreservation: 0.85,
  hueStability: 0.95,
};

const PLATINUM_CONSTRAINTS: PerceptualConstraints = {
  ...BOTTOM_NAV_CONSTRAINTS,
  minApcaLc: 90, // Platinum tier for active states
};

// ============================================
// Contract Generation
// ============================================

/**
 * Generate AI-readable contract for bottom navigation
 */
export function generateBottomNavAIContract(
  config: ContractGeneratorConfig,
  decisions: BottomNavColorDecision[]
): BottomNavAIContract {
  const { primaryColor, accentColor, mode, strictness } = config;

  // Create appropriate contract based on strictness
  const contract = strictness === 'strict'
    ? createStrictContract(primaryColor, [
        'bottomNav.item.text',
        'bottomNav.item.icon',
        'bottomNav.itemActive.text',
        'bottomNav.itemActive.icon',
        'bottomNav.sheet.sectionHeader',
        'bottomNav.sheet.itemIcon',
      ])
    : strictness === 'lenient'
    ? createQuickContract(primaryColor)
    : createBrandContract(primaryColor, accentColor);

  // Validate all decisions against the contract
  const actions: AIAction[] = decisions.map(d => ({
    type: 'setForeground' as AIActionType,
    target: d.element,
    value: d.color,
    context: {
      background: d.background,
      purpose: d.reasoning,
    },
  }));

  // Validate combined actions
  const validation = validateActions(contract, actions);

  // Generate governance notes
  const governanceNotes = generateGovernanceNotes(decisions, mode);

  // Generate human-readable summary
  const summary = generateSummary(decisions, config);

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    component: 'MobileBottomBar',
    wcag3Tier: decisions.some(d => d.tier === 'platinum') ? 'platinum' : 'gold',
    summary,
    constraints: strictness === 'strict' ? PLATINUM_CONSTRAINTS : BOTTOM_NAV_CONSTRAINTS,
    decisions,
    governanceNotes,
    contract,
    validation,
  };
}

// ============================================
// Helper Functions
// ============================================

function validateActions(
  contract: AIActionContract,
  actions: AIAction[]
): ActionValidationResult {
  // Validate each action and aggregate results
  const results = actions.map(action => validateAction(contract, action));

  const allValid = results.every(r => r.valid);
  const violations = results.flatMap(r => r.violations || []);
  const suggestions = results.flatMap(r => r.suggestions || []);

  return {
    valid: allValid,
    violations: violations.length > 0 ? violations : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    metadata: {
      actionsValidated: actions.length,
      passedCount: results.filter(r => r.valid).length,
      failedCount: results.filter(r => !r.valid).length,
    },
  };
}

function generateGovernanceNotes(
  decisions: BottomNavColorDecision[],
  mode: 'light' | 'dark'
): string[] {
  const notes: string[] = [];

  // Check for auto-remediated colors
  const remediated = decisions.filter(d => d.autoRemediated);
  if (remediated.length > 0) {
    notes.push(
      `⚠️ ${remediated.length} color(s) were auto-remediated to meet WCAG 3.0 Gold tier requirements.`
    );
    remediated.forEach(d => {
      notes.push(`   - ${d.element}: Adjusted to Lc ${d.apcaLc.toFixed(1)}`);
    });
  }

  // Check tier distribution
  const tiers = decisions.reduce((acc, d) => {
    acc[d.tier] = (acc[d.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  notes.push('');
  notes.push('📊 APCA Tier Distribution:');
  Object.entries(tiers).forEach(([tier, count]) => {
    const emoji = tier === 'platinum' ? '🏆' : tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉';
    notes.push(`   ${emoji} ${tier}: ${count} element(s)`);
  });

  // Mode-specific notes
  notes.push('');
  notes.push(`🎨 Color Mode: ${mode}`);
  if (mode === 'dark') {
    notes.push('   - Light text on dark backgrounds optimized for APCA readability');
    notes.push('   - Reduced chroma to prevent halation effects');
  } else {
    notes.push('   - Dark text on light backgrounds for maximum clarity');
    notes.push('   - Higher chroma permitted for accent elements');
  }

  // Touch target compliance
  notes.push('');
  notes.push('👆 Touch Accessibility:');
  notes.push('   - Minimum touch target: 48x48px (WCAG 2.5.5 Level AAA)');
  notes.push('   - Active feedback: scale(0.95) transform');
  notes.push('   - Focus indicators: 2px ring with brand color');

  return notes;
}

function generateSummary(
  decisions: BottomNavColorDecision[],
  config: ContractGeneratorConfig
): string {
  const passingGold = decisions.filter(d => d.apcaLc >= 75).length;
  const passingPlatinum = decisions.filter(d => d.apcaLc >= 90).length;
  const totalDecisions = decisions.length;
  const conformanceRate = Math.round((passingGold / totalDecisions) * 100);

  return `
# Bottom Navigation AI Contract

## Executive Summary

This contract defines the color decisions for the MobileBottomBar component,
ensuring WCAG 3.0 Gold tier compliance (Lc ≥ 75) for all interactive elements.

### Key Metrics
- **Total Decisions**: ${totalDecisions}
- **Gold Tier Compliance**: ${passingGold}/${totalDecisions} (${conformanceRate}%)
- **Platinum Tier Elements**: ${passingPlatinum}
- **Auto-Remediated**: ${decisions.filter(d => d.autoRemediated).length}

### Configuration
- **Primary Color**: ${config.primaryColor}
${config.accentColor ? `- **Accent Color**: ${config.accentColor}` : ''}
- **Mode**: ${config.mode}
- **Strictness**: ${config.strictness}

### Perceptual Color Science

All colors are derived using:
- **OKLCH**: Perceptually uniform color space for lightness adjustments
- **HCT**: Hue, Chroma, Tone for Material Design 3 tonal palettes
- **APCA**: Advanced Perceptual Contrast Algorithm for WCAG 3.0 compliance

### Contract Binding

This contract is machine-readable and can be used by:
1. AI assistants for color suggestions
2. Automated testing for accessibility validation
3. Design tools for token synchronization
4. CI/CD pipelines for regression detection
`.trim();
}

// ============================================
// Pre-built Contracts
// ============================================

/**
 * Create a standard contract for bottom navigation
 */
export function createBottomNavContract(
  primaryColor: string,
  mode: 'light' | 'dark' = 'dark'
): AIActionContract {
  return createBrandContract(primaryColor, undefined);
}

/**
 * Create a strict contract for bottom navigation (active states)
 */
export function createBottomNavStrictContract(primaryColor: string): AIActionContract {
  return createStrictContract(primaryColor, [
    'bottomNav.itemActive.text',
    'bottomNav.itemActive.icon',
  ]);
}

// ============================================
// Decision Builders
// ============================================

/**
 * Build a color decision record
 */
export function buildColorDecision(
  element: string,
  color: string,
  background: string,
  apcaLc: number,
  reasoning: string,
  autoRemediated: boolean = false
): BottomNavColorDecision {
  const tier = apcaLc >= 90 ? 'platinum'
    : apcaLc >= 75 ? 'gold'
    : apcaLc >= 60 ? 'silver'
    : 'bronze';

  return {
    element,
    color,
    background,
    apcaLc: Math.round(apcaLc * 10) / 10,
    tier,
    reasoning,
    alternatives: [], // Can be populated by AI suggestions
    autoRemediated,
  };
}

// ============================================
// Export for Testing
// ============================================

export {
  BOTTOM_NAV_CONSTRAINTS,
  PLATINUM_CONSTRAINTS,
};

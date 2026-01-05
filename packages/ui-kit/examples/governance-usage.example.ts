/**
 * @fileoverview Enterprise Governance Usage Examples
 *
 * This file demonstrates how to use the Enterprise Design Governance
 * system for enforcing design policies across your organization.
 *
 * @module ui-kit/examples/governance-usage
 * @version 1.0.0
 */

import {
  // Core Governance
  EnforceEnterpriseGovernance,
  checkColorGovernance,
  checkAccessibilityGovernance,

  // Governance Domain
  EnterprisePolicy,
  PolicySet,
  createDefaultPolicySet,
  createStrictPolicySet,
  ENTERPRISE_POLICIES,

  // Audit Adapters
  consoleAuditAdapter,
  NoOpAuditAdapter,

  // Color Intelligence
  PerceptualColor,

  // Types
  type GovernanceConfig,
  type GovernanceEnforcementOutput,
} from '../index';

// ============================================================================
// EXAMPLE 1: Quick Color Governance Check
// ============================================================================

/**
 * Quick check if a color meets governance requirements.
 *
 * This is the simplest way to validate a color decision.
 */
async function quickColorCheck() {
  console.log('=== Example 1: Quick Color Governance Check ===\n');

  // Check a brand color
  const result = await checkColorGovernance('#3B82F6', 'brand');

  if (result.success) {
    const output = result.value;
    console.log(`Compliant: ${output.compliant}`);
    console.log(`Score: ${output.complianceScore.toFixed(1)}%`);
    console.log(`Status: ${output.summary.status}`);
    console.log(`Headline: ${output.summary.headline}`);

    if (output.summary.recommendations.length > 0) {
      console.log('\nRecommendations:');
      output.summary.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
  } else {
    console.error('Error:', result.error.message);
  }

  console.log('\n');
}

// ============================================================================
// EXAMPLE 2: Quick Accessibility Governance Check
// ============================================================================

/**
 * Quick check if a color pair meets accessibility requirements.
 */
async function quickAccessibilityCheck() {
  console.log('=== Example 2: Quick Accessibility Governance Check ===\n');

  // Check foreground/background combination
  const result = await checkAccessibilityGovernance('#1E293B', '#F1F5F9');

  if (result.success) {
    const output = result.value;
    console.log(`Compliant: ${output.compliant}`);
    console.log(`Score: ${output.complianceScore.toFixed(1)}%`);

    if (output.evaluation.allViolations.length > 0) {
      console.log('\nViolations:');
      output.evaluation.allViolations.forEach(v => {
        console.log(`  [${v.severity}] ${v.message}`);
        if (v.suggestion) {
          console.log(`    Suggestion: ${v.suggestion}`);
        }
      });
    }
  }

  console.log('\n');
}

// ============================================================================
// EXAMPLE 3: Full Governance Orchestrator with Configuration
// ============================================================================

/**
 * Using the full governance orchestrator with custom configuration.
 */
async function fullGovernanceOrchestrator() {
  console.log('=== Example 3: Full Governance Orchestrator ===\n');

  // Create governance instance with configuration
  const config: GovernanceConfig = {
    policySet: createDefaultPolicySet(),
    failFast: false,
    autoFix: false,
    auditPort: consoleAuditAdapter, // Log decisions to console
  };

  const governance = new EnforceEnterpriseGovernance(config);

  // Check a color
  const colorResult = await governance.execute({
    subject: {
      type: 'color',
      color: PerceptualColor.fromHex('#3B82F6'),
      purpose: 'brand',
    },
  });

  if (colorResult.success) {
    console.log('\nColor Governance Result:');
    console.log(`  Compliant: ${colorResult.value.compliant}`);
    console.log(`  Audit ID: ${colorResult.value.auditId}`);
  }

  // Check a theme configuration
  const themeResult = await governance.execute({
    subject: {
      type: 'theme',
      hasLightMode: true,
      hasDarkMode: true,
      brandColor: PerceptualColor.fromHex('#3B82F6'),
    },
  });

  if (themeResult.success) {
    console.log('\nTheme Governance Result:');
    console.log(`  Compliant: ${themeResult.value.compliant}`);
    console.log(`  Score: ${themeResult.value.complianceScore.toFixed(1)}%`);
  }

  console.log('\n');
}

// ============================================================================
// EXAMPLE 4: Using Quick Check for Validation-Only Mode
// ============================================================================

/**
 * Quick check for validation without side effects (no audit logging).
 */
async function validationOnlyCheck() {
  console.log('=== Example 4: Validation-Only Quick Check ===\n');

  const governance = new EnforceEnterpriseGovernance();

  // Quick boolean check - no audit, no side effects
  const passes = await governance.quickCheck({
    subject: {
      type: 'accessibility',
      foreground: PerceptualColor.fromHex('#000000'),
      background: PerceptualColor.fromHex('#FFFFFF'),
      contrastRatio: 21,
      apcaValue: 106,
    },
  });

  console.log(`Accessibility check passes: ${passes}`);
  console.log('\n');
}

// ============================================================================
// EXAMPLE 5: Creating Custom Policies
// ============================================================================

/**
 * Creating and using custom enterprise policies.
 */
async function customPolicies() {
  console.log('=== Example 5: Custom Enterprise Policies ===\n');

  // Create a custom policy
  const customPolicyConfig = {
    id: 'custom-brand-hue',
    name: 'Brand Hue Alignment',
    description: 'Ensures colors align with brand hue (blue range)',
    category: 'brand-consistency' as const,
    scope: 'component' as const,
    enforcement: 'required' as const,
    severity: 'medium' as const,
    version: '1.0.0',
    rules: [
      {
        id: 'hue-range',
        name: 'Hue in Blue Range',
        condition: {
          type: 'custom' as const,
          evaluator: 'brand-hue-check',
          params: { minHue: 200, maxHue: 250 },
        },
        message: 'Color hue should be in the blue range (200-250)',
        suggestion: 'Adjust color hue to be between 200 and 250 degrees',
        autoFixable: true,
      },
    ],
  };

  const customPolicyResult = EnterprisePolicy.create(customPolicyConfig);

  if (customPolicyResult.success) {
    console.log(`Custom policy created: ${customPolicyResult.value.name}`);

    // Create governance with custom policy
    const governance = new EnforceEnterpriseGovernance({
      customEvaluators: {
        'brand-hue-check': (input, params) => {
          if (!input.color) return { passed: true };

          const hue = input.color.oklch.h;
          const minHue = (params?.minHue as number) ?? 0;
          const maxHue = (params?.maxHue as number) ?? 360;

          const passed = hue >= minHue && hue <= maxHue;
          return {
            passed,
            message: passed ? undefined : `Hue ${hue.toFixed(0)} is outside range ${minHue}-${maxHue}`,
          };
        },
      },
    });

    // Add custom policy and check
    const governanceWithPolicy = governance.withPolicies([customPolicyResult.value]);

    const result = await governanceWithPolicy.execute({
      subject: {
        type: 'color',
        color: PerceptualColor.fromHex('#3B82F6'), // Blue color
        purpose: 'brand',
      },
    });

    if (result.success) {
      console.log(`Custom policy check: ${result.value.compliant ? 'PASS' : 'FAIL'}`);
    }
  }

  console.log('\n');
}

// ============================================================================
// EXAMPLE 6: Using Strict vs Lenient Policy Sets
// ============================================================================

/**
 * Comparing strict vs lenient policy enforcement.
 */
async function policySetComparison() {
  console.log('=== Example 6: Strict vs Lenient Policy Sets ===\n');

  const color = PerceptualColor.fromHex('#94A3B8'); // Low saturation gray

  // Default policy set
  const defaultGovernance = new EnforceEnterpriseGovernance();
  const defaultResult = await defaultGovernance.execute({
    subject: { type: 'color', color, purpose: 'brand' },
  });

  // Strict policy set
  const strictGovernance = new EnforceEnterpriseGovernance({
    policySet: createStrictPolicySet(),
  });
  const strictResult = await strictGovernance.execute({
    subject: { type: 'color', color, purpose: 'brand' },
  });

  console.log('Low saturation color (#94A3B8) results:');
  console.log(`  Default: ${defaultResult.success ? (defaultResult.value.compliant ? 'PASS' : 'FAIL') : 'ERROR'}`);
  console.log(`  Strict:  ${strictResult.success ? (strictResult.value.compliant ? 'PASS' : 'FAIL') : 'ERROR'}`);

  console.log('\n');
}

// ============================================================================
// EXAMPLE 7: Inspecting Available Policies
// ============================================================================

/**
 * Inspecting the available enterprise policies.
 */
function inspectPolicies() {
  console.log('=== Example 7: Available Enterprise Policies ===\n');

  console.log('Built-in Enterprise Policies:');

  Object.entries(ENTERPRISE_POLICIES).forEach(([id, config]) => {
    console.log(`\n  ${config.name} (${id})`);
    console.log(`    Category: ${config.category}`);
    console.log(`    Scope: ${config.scope}`);
    console.log(`    Enforcement: ${config.enforcement}`);
    console.log(`    Severity: ${config.severity}`);
    console.log(`    Description: ${config.description}`);
  });

  console.log('\n');
}

// ============================================================================
// EXAMPLE 8: Policy Set Operations
// ============================================================================

/**
 * Working with policy sets - filtering, enabling, disabling.
 */
function policySetOperations() {
  console.log('=== Example 8: Policy Set Operations ===\n');

  const policySet = createDefaultPolicySet();

  // Get all policies
  console.log(`Total policies: ${policySet.all().length}`);

  // Get blocking policies
  console.log(`Blocking policies: ${policySet.blocking().length}`);

  // Get policies by scope
  console.log(`Accessibility policies: ${policySet.byScope('accessibility').length}`);
  console.log(`Theme policies: ${policySet.byScope('theme').length}`);
  console.log(`Token policies: ${policySet.byScope('token').length}`);
  console.log(`Component policies: ${policySet.byScope('component').length}`);

  // Enable/disable policies
  const modifiedSet = policySet
    .disable('color-minimum-saturation')
    .enable('accessibility-wcag-aa');

  console.log(`\nAfter modification:`);
  console.log(`  Total enabled: ${modifiedSet.all().length}`);

  console.log('\n');
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function runAllExamples() {
  console.log('\n========================================');
  console.log('  ENTERPRISE GOVERNANCE USAGE EXAMPLES  ');
  console.log('========================================\n');

  await quickColorCheck();
  await quickAccessibilityCheck();
  await fullGovernanceOrchestrator();
  await validationOnlyCheck();
  await customPolicies();
  await policySetComparison();
  inspectPolicies();
  policySetOperations();

  console.log('========================================');
  console.log('  ALL EXAMPLES COMPLETED SUCCESSFULLY  ');
  console.log('========================================\n');
}

// Export for testing
export {
  quickColorCheck,
  quickAccessibilityCheck,
  fullGovernanceOrchestrator,
  validationOnlyCheck,
  customPolicies,
  policySetComparison,
  inspectPolicies,
  policySetOperations,
  runAllExamples,
};

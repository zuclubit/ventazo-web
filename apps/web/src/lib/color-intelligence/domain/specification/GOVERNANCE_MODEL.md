# Color Intelligence Governance Model

**Version:** 5.0.0
**Status:** Stable
**Parent:** SPECIFICATION.md
**Last Updated:** 2026-01-04

---

## 1. Overview

The Governance Model defines how perceptual policies are structured, composed, evaluated, and enforced within the Color Intelligence system. This model enables organizations to:

- Define custom accessibility and brand requirements
- Compose policies from reusable rules
- Enforce standards across design systems
- Integrate with CI/CD pipelines
- Maintain audit trails for compliance

---

## 2. Policy Architecture

### 2.1 Policy Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Organization Policy                           │
│                    (Highest Priority)                            │
│  • Enterprise-wide accessibility standards                       │
│  • Legal/regulatory requirements                                 │
│  • Corporate brand guidelines                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Brand Policy                               │
│                    (High Priority)                               │
│  • Product-specific brand colors                                 │
│  • Hue preservation rules                                        │
│  • Chroma constraints                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Accessibility Policy                           │
│                   (Medium Priority)                              │
│  • WCAG 2.1 / 3.0 compliance                                     │
│  • APCA tier requirements                                        │
│  • Font size / weight constraints                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Default Policy                              │
│                    (Lowest Priority)                             │
│  • System defaults                                               │
│  • Fallback behaviors                                            │
│  • Safe mode constraints                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Policy Resolution

When multiple policies apply, resolution follows:

1. **Priority Order**: Higher priority policies override lower
2. **Specificity**: More specific context wins over general
3. **Conflict Resolution**: Stricter constraint wins
4. **Explicit Override**: `!important` declarations break hierarchy

```typescript
// Resolution algorithm
function resolvePolicies(
  policies: PerceptualPolicy[],
  context: PolicyContext
): ResolvedPolicy {
  return policies
    .filter(p => matchesContext(p, context))
    .sort((a, b) => comparePriority(a, b))
    .reduce(mergePolicies, defaultPolicy);
}
```

---

## 3. Policy Structure

### 3.1 Core Policy Schema

```typescript
interface PerceptualPolicy {
  // Identity
  readonly id: PolicyId;
  readonly name: string;
  readonly description: string;
  readonly version: PolicyVersion;

  // Classification
  readonly priority: PolicyPriority;
  readonly enforcement: EnforcementMode;
  readonly category: PolicyCategory;

  // Applicability
  readonly applicableContexts: PolicyContext[];
  readonly excludedContexts?: PolicyContext[];

  // Composition
  readonly extends?: PolicyId;
  readonly rules: PolicyRule[];
  readonly combinator: RuleCombinator;

  // Lifecycle
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;

  // Metadata
  readonly author: string;
  readonly tags: string[];
  readonly documentation?: string;
}
```

### 3.2 Policy Categories

| Category | Description | Typical Priority |
|----------|-------------|------------------|
| `regulatory` | Legal/compliance requirements | Critical |
| `accessibility` | WCAG/APCA standards | High |
| `brand` | Brand identity rules | High |
| `usability` | UX best practices | Medium |
| `experimental` | Testing new standards | Low |
| `default` | System fallbacks | Lowest |

### 3.3 Priority Levels

| Level | Value | Behavior |
|-------|-------|----------|
| `critical` | 100 | Never overridden, blocks on failure |
| `high` | 75 | Rarely overridden, warns strongly |
| `medium` | 50 | Standard priority, can be adjusted |
| `low` | 25 | Advisory, easily overridden |
| `advisory` | 0 | Suggestions only, never blocks |

---

## 4. Policy Rules

### 4.1 Rule Structure

```typescript
interface PolicyRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: RuleCategory;

  // Condition
  readonly condition: RuleCondition;

  // Requirement
  readonly requirement: RuleRequirement;

  // Violation handling
  readonly severity: ViolationSeverity;
  readonly message: string;
  readonly remediation?: RemediationStrategy;

  // Metadata
  readonly wcagCriteria?: string[];
  readonly references?: string[];
}
```

### 4.2 Rule Categories

| Category | Examples |
|----------|----------|
| `contrast` | APCA Lc minimums, WCAG ratios |
| `color` | Hue preservation, chroma limits |
| `typography` | Font size minimums, weight constraints |
| `component` | Button contrast, input borders |
| `theme` | Dark mode requirements, high-contrast |

### 4.3 Condition Types

```typescript
type RuleCondition =
  | { type: 'always' }                                    // Always applies
  | { type: 'colorScheme'; value: 'light' | 'dark' }     // Theme-specific
  | { type: 'component'; value: string }                  // Component-specific
  | { type: 'textSize'; min?: number; max?: number }     // Font size range
  | { type: 'fontWeight'; min?: number; max?: number }   // Font weight range
  | { type: 'accessibilityMode'; value: string }         // A11y mode
  | { type: 'viewport'; value: ViewportSize }            // Responsive
  | { type: 'custom'; predicate: string };               // Custom logic
```

### 4.4 Requirement Types

```typescript
type RuleRequirement =
  | { type: 'minContrast'; metric: 'apca' | 'wcag21'; value: number }
  | { type: 'maxContrast'; metric: 'apca' | 'wcag21'; value: number }
  | { type: 'tier'; minimum: WCAG3Tier }
  | { type: 'wcagLevel'; minimum: WCAGLevel }
  | { type: 'preserveHue'; tolerance: number }
  | { type: 'chromaRange'; min: number; max: number }
  | { type: 'lightnessRange'; min: number; max: number }
  | { type: 'colorDifference'; minimum: number }
  | { type: 'fontSizeMinimum'; value: number; unit: 'px' | 'rem' }
  | { type: 'custom'; validator: string };
```

---

## 5. Enforcement Modes

### 5.1 Mode Definitions

| Mode | Behavior | Use Case |
|------|----------|----------|
| `strict` | Reject non-compliant decisions | Production, regulated |
| `advisory` | Warn but allow violations | Development, transition |
| `monitoring` | Log violations silently | Analytics, audit |
| `disabled` | Policy inactive | Maintenance, testing |

### 5.2 Mode Behaviors

```
Decision Input
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Policy Evaluation                          │
├──────────────┬──────────────┬──────────────┬───────────────┤
│    strict    │   advisory   │  monitoring  │   disabled    │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ Violations?  │ Violations?  │ Violations?  │               │
│      │       │      │       │      │       │    Pass       │
│    Yes       │    Yes       │    Yes       │    through    │
│      │       │      │       │      │       │               │
│      ▼       │      ▼       │      ▼       │               │
│  ┌───────┐   │  ┌───────┐   │  ┌───────┐   │               │
│  │Reject │   │  │ Warn  │   │  │ Log   │   │               │
│  │ + try │   │  │ + try │   │  │ only  │   │               │
│  │adjust │   │  │adjust │   │  │       │   │               │
│  └───────┘   │  └───────┘   │  └───────┘   │               │
│      │       │      │       │      │       │               │
│      ▼       │      ▼       │      ▼       │               │
│ Adjusted?    │   Allow      │   Allow      │               │
│  Yes│No      │   original   │   original   │               │
│   ▼  ▼       │              │              │               │
│ Allow Reject │              │              │               │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

### 5.3 Enforcement Escalation

Organizations can configure escalation paths:

```typescript
interface EnforcementEscalation {
  readonly initialMode: EnforcementMode;
  readonly escalateAfter: number;        // Number of violations
  readonly escalateTo: EnforcementMode;
  readonly notifyChannels: string[];
  readonly cooldownPeriod: number;       // Hours before reset
}
```

---

## 6. Policy Composition

### 6.1 Inheritance

Policies can extend other policies:

```typescript
// Base accessibility policy
const baseAccessibility: PerceptualPolicy = {
  id: 'ci/accessibility-base' as PolicyId,
  rules: [
    { id: 'min-body-contrast', requirement: { type: 'minContrast', metric: 'apca', value: 60 } },
    { id: 'min-heading-contrast', requirement: { type: 'minContrast', metric: 'apca', value: 75 } },
  ],
  // ...
};

// Extended for AAA compliance
const aaaAccessibility: PerceptualPolicy = {
  id: 'ci/accessibility-aaa' as PolicyId,
  extends: 'ci/accessibility-base' as PolicyId,
  rules: [
    // Overrides base rule
    { id: 'min-body-contrast', requirement: { type: 'minContrast', metric: 'apca', value: 75 } },
    // Adds new rule
    { id: 'min-ui-contrast', requirement: { type: 'minContrast', metric: 'apca', value: 60 } },
  ],
  // ...
};
```

### 6.2 Rule Combinators

| Combinator | Behavior |
|------------|----------|
| `all` | All rules must pass |
| `any` | At least one rule must pass |
| `majority` | More than 50% of rules must pass |
| `weighted` | Weighted score threshold |

```typescript
interface WeightedCombinator {
  readonly type: 'weighted';
  readonly weights: Record<string, number>;
  readonly threshold: number;   // 0-100
  readonly passingWeight: number;  // Weight for passed rules
}
```

### 6.3 Policy Merging

When policies are merged, rules are combined by:

1. Rules with same ID: Higher priority policy wins
2. Rules with different IDs: All included
3. Conflicting requirements: Stricter requirement wins

---

## 7. Governance Evaluation

### 7.1 Evaluation Flow

```
                    Input Decision
                          │
                          ▼
         ┌────────────────────────────────────┐
         │       Context Extraction           │
         │  (colorScheme, component, etc.)    │
         └───────────────┬────────────────────┘
                         │
                         ▼
         ┌────────────────────────────────────┐
         │        Policy Resolution           │
         │  (find applicable policies)        │
         └───────────────┬────────────────────┘
                         │
                         ▼
         ┌────────────────────────────────────┐
         │       Rule Evaluation              │
         │  (evaluate each rule)              │
         └───────────────┬────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         All Pass             Violations Found
              │                     │
              ▼                     ▼
         ┌─────────┐    ┌───────────────────────┐
         │Approved │    │  Adjustment Phase     │
         └─────────┘    │  (attempt auto-fix)   │
                        └───────────┬───────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                    Adjustment            Adjustment
                    Succeeded              Failed
                         │                     │
                         ▼                     ▼
                    ┌─────────┐         ┌──────────┐
                    │Adjusted │         │ Rejected │
                    └─────────┘         └──────────┘
```

### 7.2 Evaluation Result

```typescript
interface GovernanceEvaluation {
  // Original vs final
  readonly originalDecision: ContrastDecision;
  readonly finalDecision: ContrastDecision;

  // Outcome
  readonly outcome: GovernanceOutcome;
  readonly outcomeReason: string;

  // Policy details
  readonly evaluatedPolicies: PolicyEvaluationResult[];
  readonly appliedRules: AppliedRule[];
  readonly violations: PolicyViolation[];

  // Adjustments
  readonly adjustments: DecisionAdjustment[];
  readonly adjustmentAttempts: number;
  readonly adjustmentSuccess: boolean;

  // Warnings
  readonly warnings: GovernanceWarning[];

  // Audit
  readonly auditEntry: AuditEntry;
  readonly evaluatedAt: string;
  readonly evaluationDuration: number;
}
```

### 7.3 Violation Structure

```typescript
interface PolicyViolation {
  readonly policyId: PolicyId;
  readonly ruleId: string;
  readonly ruleName: string;
  readonly severity: ViolationSeverity;
  readonly category: RuleCategory;

  // Details
  readonly message: string;
  readonly expectedValue: string;
  readonly actualValue: string;
  readonly gap: number;          // How far from compliance

  // Remediation
  readonly canAutoFix: boolean;
  readonly remediationSuggestion?: string;
  readonly estimatedAdjustment?: AdjustmentSpecification;

  // References
  readonly wcagCriteria?: string[];
  readonly documentationUrl?: string;
}
```

---

## 8. Adjustment Strategies

### 8.1 Available Strategies

| Strategy | Description | Risk Level |
|----------|-------------|------------|
| `contrastIncrease` | Adjust lightness to increase contrast | Low |
| `chromaReduction` | Reduce saturation for better contrast | Low |
| `fontSizeIncrease` | Increase font size for lower contrast | Medium |
| `fontWeightIncrease` | Increase font weight for better readability | Medium |
| `backgroundSwap` | Swap to alternative background | Medium |
| `colorSubstitution` | Replace with accessible alternative | High |

### 8.2 Adjustment Specification

```typescript
interface AdjustmentSpecification {
  readonly strategy: AdjustmentStrategy;
  readonly targetProperty: 'foreground' | 'background' | 'fontSize' | 'fontWeight';
  readonly operation: 'increase' | 'decrease' | 'setMinimum' | 'replace';
  readonly magnitude: number;
  readonly unit: 'Lc' | 'percentage' | 'px' | 'points';
  readonly constraints: AdjustmentConstraints;
}

interface AdjustmentConstraints {
  readonly preserveHue?: boolean;
  readonly maxHueShift?: number;
  readonly preserveChroma?: boolean;
  readonly maxChromaReduction?: number;
  readonly minLightness?: number;
  readonly maxLightness?: number;
  readonly preserveBrandColor?: boolean;
}
```

### 8.3 Adjustment Limits

To prevent over-adjustment:

| Property | Maximum Adjustment |
|----------|-------------------|
| Lightness | ±30% of original |
| Chroma | -50% of original |
| Hue | ±5° (if preservation enabled) |
| Font size | +50% of original |
| Font weight | +200 (e.g., 400→600) |

---

## 9. Built-in Policies

### 9.1 WCAG 2.1 Policies

```typescript
// WCAG 2.1 Level AA
{
  id: 'ci/wcag21-aa',
  rules: [
    { id: 'normal-text', requirement: { type: 'minContrast', metric: 'wcag21', value: 4.5 } },
    { id: 'large-text', requirement: { type: 'minContrast', metric: 'wcag21', value: 3.0 } },
    { id: 'ui-components', requirement: { type: 'minContrast', metric: 'wcag21', value: 3.0 } },
    { id: 'graphical-objects', requirement: { type: 'minContrast', metric: 'wcag21', value: 3.0 } },
  ]
}

// WCAG 2.1 Level AAA
{
  id: 'ci/wcag21-aaa',
  extends: 'ci/wcag21-aa',
  rules: [
    { id: 'normal-text', requirement: { type: 'minContrast', metric: 'wcag21', value: 7.0 } },
    { id: 'large-text', requirement: { type: 'minContrast', metric: 'wcag21', value: 4.5 } },
  ]
}
```

### 9.2 WCAG 3.0 / APCA Policies

```typescript
// APCA Bronze
{
  id: 'ci/apca-bronze',
  rules: [
    { id: 'body-text', requirement: { type: 'minContrast', metric: 'apca', value: 60 } },
    { id: 'large-text', requirement: { type: 'minContrast', metric: 'apca', value: 45 } },
    { id: 'ui-text', requirement: { type: 'minContrast', metric: 'apca', value: 45 } },
  ]
}

// APCA Silver
{
  id: 'ci/apca-silver',
  extends: 'ci/apca-bronze',
  rules: [
    { id: 'body-text', requirement: { type: 'minContrast', metric: 'apca', value: 75 } },
    { id: 'large-text', requirement: { type: 'minContrast', metric: 'apca', value: 60 } },
  ]
}

// APCA Gold
{
  id: 'ci/apca-gold',
  extends: 'ci/apca-silver',
  rules: [
    { id: 'body-text', requirement: { type: 'minContrast', metric: 'apca', value: 90 } },
    { id: 'large-text', requirement: { type: 'minContrast', metric: 'apca', value: 75 } },
    { id: 'critical-text', requirement: { type: 'minContrast', metric: 'apca', value: 90 } },
  ]
}

// APCA Platinum
{
  id: 'ci/apca-platinum',
  extends: 'ci/apca-gold',
  rules: [
    { id: 'body-text', requirement: { type: 'minContrast', metric: 'apca', value: 100 } },
    { id: 'all-text', requirement: { type: 'minContrast', metric: 'apca', value: 90 } },
  ]
}
```

### 9.3 Brand Preservation Policies

```typescript
{
  id: 'ci/brand-preservation',
  category: 'brand',
  rules: [
    {
      id: 'preserve-primary-hue',
      requirement: { type: 'preserveHue', tolerance: 5 },
      condition: { type: 'custom', predicate: 'isPrimaryColor' },
    },
    {
      id: 'maintain-chroma',
      requirement: { type: 'chromaRange', min: 0.8, max: 1.0 },  // Relative to original
    },
    {
      id: 'allow-lightness-adjustment',
      requirement: { type: 'lightnessRange', min: 0.7, max: 1.3 },  // Relative to original
    },
  ]
}
```

---

## 10. Policy Contexts

### 10.1 Context Structure

```typescript
interface PolicyContext {
  // Theme
  readonly colorScheme?: 'light' | 'dark' | 'high-contrast';

  // Component
  readonly component?: string;
  readonly componentVariant?: string;

  // Accessibility
  readonly accessibilityMode?: 'standard' | 'enhanced' | 'reduced-motion';
  readonly userPreferences?: UserAccessibilityPreferences;

  // Responsive
  readonly viewport?: 'mobile' | 'tablet' | 'desktop' | 'large';
  readonly orientation?: 'portrait' | 'landscape';

  // Application
  readonly appSection?: string;
  readonly userRole?: string;

  // Custom
  readonly custom?: Record<string, unknown>;
}
```

### 10.2 Context Matching

```typescript
function matchesContext(
  policy: PerceptualPolicy,
  context: PolicyContext
): boolean {
  // Check exclusions first
  if (policy.excludedContexts?.some(exc => contextMatches(exc, context))) {
    return false;
  }

  // If no applicable contexts defined, applies to all
  if (!policy.applicableContexts?.length) {
    return true;
  }

  // Check if any applicable context matches
  return policy.applicableContexts.some(ac => contextMatches(ac, context));
}

function contextMatches(
  pattern: PolicyContext,
  actual: PolicyContext
): boolean {
  return Object.entries(pattern).every(([key, value]) => {
    const actualValue = actual[key as keyof PolicyContext];
    if (value === undefined) return true;
    if (actualValue === undefined) return false;
    return value === actualValue;
  });
}
```

---

## 11. Audit Trail

### 11.1 Governance Audit Entry

Every governance evaluation generates an audit entry:

```typescript
interface GovernanceAuditEntry extends AuditEntry {
  readonly category: 'governance';
  readonly governanceData: {
    readonly originalDecision: ContrastDecision;
    readonly finalDecision: ContrastDecision;
    readonly outcome: GovernanceOutcome;
    readonly policiesEvaluated: PolicyId[];
    readonly rulesApplied: string[];
    readonly violationsFound: number;
    readonly adjustmentsApplied: number;
    readonly evaluationDuration: number;
  };
}
```

### 11.2 Audit Retention

| Data Type | Retention Period | Compression |
|-----------|-----------------|-------------|
| Full audit entries | 90 days | No |
| Summarized entries | 2 years | Yes |
| Violation counts | Indefinite | Aggregated |
| Policy change history | Indefinite | No |

---

## 12. Error Handling

### 12.1 Governance Error Codes

| Code | Name | Description |
|------|------|-------------|
| `GOV-001` | PolicyNotFound | Referenced policy does not exist |
| `GOV-002` | PolicyInvalid | Policy schema validation failed |
| `GOV-003` | CircularInheritance | Policy inheritance cycle detected |
| `GOV-004` | RuleConflict | Conflicting rules cannot be resolved |
| `GOV-005` | AdjustmentFailed | Auto-adjustment could not fix violations |
| `GOV-006` | ContextInvalid | Policy context is malformed |
| `GOV-007` | EnforcementBlocked | Strict enforcement blocked decision |
| `GOV-008` | PolicyExpired | Policy has expired |
| `GOV-009` | PolicyDisabled | Policy is disabled |
| `GOV-010` | InheritanceDepth | Policy inheritance too deep (max 10) |

### 12.2 Recovery Strategies

```typescript
interface GovernanceErrorRecovery {
  readonly GOV_001: 'useDefaultPolicy';
  readonly GOV_002: 'skipInvalidPolicy';
  readonly GOV_003: 'breakInheritance';
  readonly GOV_004: 'useStricterRule';
  readonly GOV_005: 'rejectDecision';
  readonly GOV_006: 'useEmptyContext';
  readonly GOV_007: 'returnRejection';
  readonly GOV_008: 'skipExpiredPolicy';
  readonly GOV_009: 'skipDisabledPolicy';
  readonly GOV_010: 'truncateInheritance';
}
```

---

## 13. Performance Requirements

| Operation | Target | Maximum |
|-----------|--------|---------|
| Policy resolution | < 1ms | 5ms |
| Single rule evaluation | < 0.5ms | 2ms |
| Full governance evaluation | < 5ms | 20ms |
| Adjustment attempt | < 10ms | 50ms |
| Audit entry creation | < 1ms | 5ms |
| Policy merge (2 policies) | < 2ms | 10ms |

---

## 14. Integration Points

### 14.1 CI/CD Integration

```yaml
# GitHub Actions example
- name: Audit Color Tokens
  run: |
    npx color-intelligence audit ./tokens.json \
      --policy=ci/apca-gold \
      --mode=strict \
      --output=governance-report.json

- name: Upload Report
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: governance-violations
    path: governance-report.json
```

### 14.2 Design Tool Integration

```typescript
// Figma plugin integration
const result = await governanceEngine.evaluate(
  figmaColorPair,
  { colorScheme: 'light', component: 'button' }
);

if (result.outcome === 'rejected') {
  figma.notify(`Color combination violates policy: ${result.outcomeReason}`);
}
```

---

## 15. Versioning

### 15.1 Policy Versioning

Policies follow semantic versioning:

- **MAJOR**: Breaking rule changes
- **MINOR**: New rules, backward compatible
- **PATCH**: Rule clarifications, documentation

### 15.2 Migration Path

When policy versions change:

1. **Deprecation Notice**: Old version logs warnings
2. **Parallel Evaluation**: Both versions evaluated during transition
3. **Sunset Period**: Minimum 90 days before removal
4. **Forced Migration**: Old version removed

---

## 16. Future Considerations

- **Machine Learning Policies**: AI-driven rule generation
- **Federated Policies**: Cross-organization policy sharing
- **Real-time Monitoring**: Live policy violation dashboards
- **Policy Marketplace**: Community-contributed policies

---

## 17. References

- [SPECIFICATION.md](./SPECIFICATION.md) - Parent specification
- [DECISION_MODEL.md](./DECISION_MODEL.md) - Decision flow details
- [CONFORMANCE_LEVELS.md](./CONFORMANCE_LEVELS.md) - Conformance tier details
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/
- WCAG 3.0 Draft: https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/
- APCA: https://git.apcacontrast.com/

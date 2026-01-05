# Color Intelligence Decision Model

**Version:** 5.0.0
**Last Updated:** 2026-01-04
**Status:** Stable

---

## 1. Overview

The Decision Model defines how Color Intelligence transforms color inputs into accessibility-validated, policy-compliant decisions. Every decision is:

- **Deterministic**: Same inputs always produce same outputs
- **Explainable**: Factors and reasoning are documented
- **Reproducible**: Can be verified via audit trail
- **Auditable**: Full chain of custody maintained

---

## 2. Decision Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DECISION PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   INPUT                                                                      │
│   ├── foreground: string (hex, rgb, oklch, hsl)                             │
│   ├── background: string                                                     │
│   ├── fontSize?: number (px)                                                 │
│   ├── fontWeight?: number (100-900)                                          │
│   └── context?: PolicyContext                                                │
│                                                                              │
│         │                                                                    │
│         ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     STAGE 1: NORMALIZATION                          │   │
│   │                                                                     │   │
│   │   • Parse input colors to internal representation                  │   │
│   │   • Convert to OKLCH (canonical perceptual space)                  │   │
│   │   • Validate color values are in gamut                             │   │
│   │   • Apply gamut mapping if necessary                               │   │
│   │                                                                     │   │
│   │   Output: NormalizedColorPair                                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     STAGE 2: CONTRAST ANALYSIS                      │   │
│   │                                                                     │   │
│   │   • Calculate APCA Lc (primary metric)                             │   │
│   │   • Calculate WCAG 2.1 contrast ratio (compatibility)              │   │
│   │   • Determine polarity (light-on-dark vs dark-on-light)            │   │
│   │   • Calculate absolute Lc value                                     │   │
│   │                                                                     │   │
│   │   Output: ContrastMetrics                                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     STAGE 3: ACCESSIBILITY TIER                     │   │
│   │                                                                     │   │
│   │   • Map Lc to WCAG 3.0 tier (Bronze/Silver/Gold/Platinum)          │   │
│   │   • Apply font size modifiers                                       │   │
│   │   • Apply font weight modifiers                                     │   │
│   │   • Generate tier-specific recommendations                          │   │
│   │                                                                     │   │
│   │   Output: AccessibilityTier                                         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     STAGE 4: POLICY EVALUATION                      │   │
│   │                                                                     │   │
│   │   • Find applicable policies from context                          │   │
│   │   • Evaluate each policy in priority order                         │   │
│   │   • Collect violations and warnings                                │   │
│   │   • Determine if adjustment is needed                              │   │
│   │                                                                     │   │
│   │   Output: PolicyEvaluation                                          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ├──[If violations exist]──►                                          │
│         │                          │                                         │
│         │   ┌──────────────────────▼──────────────────────────────────┐     │
│         │   │              STAGE 5: ADJUSTMENT                        │     │
│         │   │                                                         │     │
│         │   │   • Calculate minimum adjustment to meet policy         │     │
│         │   │   • Preserve hue when possible                          │     │
│         │   │   • Apply lightness shift to foreground/background      │     │
│         │   │   • Re-evaluate adjusted pair                           │     │
│         │   │                                                         │     │
│         │   │   Output: AdjustedColorPair                             │     │
│         │   └─────────────────────────────────────────────────────────┘     │
│         │                          │                                         │
│         ◄──────────────────────────┘                                         │
│         │                                                                    │
│         ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     STAGE 6: DECISION OUTPUT                        │   │
│   │                                                                     │   │
│   │   • Generate ContrastDecision                                       │   │
│   │   • Attach explanation (factors, reasoning, confidence)            │   │
│   │   • Create audit entry                                              │   │
│   │   • Return GovernedDecision                                         │   │
│   │                                                                     │   │
│   │   Output: GovernedDecision                                          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   OUTPUT                                                                     │
│   ├── decision: ContrastDecision                                            │
│   ├── outcome: 'approved' | 'adjusted' | 'rejected'                         │
│   ├── adjustments: DecisionAdjustment[]                                     │
│   ├── explanation: DecisionExplanation                                      │
│   └── auditEntry: AuditEntry                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stage Details

### 3.1 Stage 1: Normalization

**Purpose:** Convert arbitrary color inputs to a canonical internal representation.

**Input Types Supported:**

| Format | Example | Parsing Method |
|--------|---------|----------------|
| Hex | `#3B82F6`, `#3B82F680` | Regex extraction |
| RGB | `rgb(59, 130, 246)` | Numeric parsing |
| RGBA | `rgba(59, 130, 246, 0.5)` | Numeric with alpha |
| HSL | `hsl(217, 91%, 60%)` | Degree/percentage parsing |
| OKLCH | `oklch(0.65 0.18 250)` | Native format |
| Named | `blue`, `rebeccapurple` | CSS named color lookup |

**Normalization Steps:**

1. **Parse Input**
   ```
   Input: "#3B82F6"
   Parsed: { r: 59, g: 130, b: 246, a: 1.0 }
   ```

2. **Convert to Linear RGB**
   ```
   Linear: { r: 0.0487, g: 0.2232, b: 0.9175 }
   ```

3. **Convert to OKLCH**
   ```
   OKLCH: { L: 0.648, C: 0.182, H: 250.7 }
   ```

4. **Validate Gamut**
   ```
   inGamut: true (sRGB)
   ```

5. **Apply Gamut Mapping (if needed)**
   - Reduce chroma while preserving lightness and hue
   - Use binary search to find maximum in-gamut chroma

**Output:**
```typescript
interface NormalizedColorPair {
  foreground: {
    original: string;
    hex: string;
    oklch: { L: number; C: number; H: number };
    inGamut: boolean;
  };
  background: {
    original: string;
    hex: string;
    oklch: { L: number; C: number; H: number };
    inGamut: boolean;
  };
}
```

---

### 3.2 Stage 2: Contrast Analysis

**Purpose:** Calculate perceptual contrast using industry-standard algorithms.

**APCA Calculation:**

The APCA (Accessible Perceptual Contrast Algorithm) calculates contrast as:

```
Lc = (Y_text^0.57 - Y_bg^0.56) × 1.14
```

Where:
- `Y_text` = relative luminance of text
- `Y_bg` = relative luminance of background
- `Lc` = Lightness contrast (−108 to +106)

**Polarity:**
- Positive Lc: Dark text on light background
- Negative Lc: Light text on dark background

**WCAG 2.1 Calculation (Compatibility):**

```
ratio = (L1 + 0.05) / (L2 + 0.05)
```

Where L1 is the lighter luminance and L2 is the darker.

**Output:**
```typescript
interface ContrastMetrics {
  apcaLc: number;         // Signed Lc (-108 to +106)
  absoluteLc: number;     // Absolute value of Lc
  wcagRatio: number;      // WCAG 2.1 ratio (1:1 to 21:1)
  polarity: 'light-bg' | 'dark-bg';
}
```

---

### 3.3 Stage 3: Accessibility Tier

**Purpose:** Map contrast values to conformance tiers.

**APCA Tier Thresholds:**

| Tier | Body Text Lc | Large Text Lc | Non-Text Lc | Use Cases |
|------|--------------|---------------|-------------|-----------|
| Platinum | ≥90 | ≥75 | ≥60 | Critical UI, high accessibility |
| Gold | ≥75 | ≥60 | ≥45 | Preferred level for most apps |
| Silver | ≥60 | ≥45 | ≥30 | Minimum for consumer apps |
| Bronze | ≥45 | ≥30 | ≥15 | Decorative, non-essential |
| Fail | <45 | <30 | <15 | Not accessible |

**Font Size Modifiers:**

| Font Size | Modifier |
|-----------|----------|
| < 14px | +15 Lc requirement |
| 14-18px | +0 (baseline) |
| 18-24px | -10 Lc requirement |
| 24-36px | -15 Lc requirement |
| > 36px | -20 Lc requirement |

**Font Weight Modifiers:**

| Weight | Modifier |
|--------|----------|
| 100-300 | +10 Lc requirement |
| 400-500 | +0 (baseline) |
| 600-700 | -5 Lc requirement |
| 800-900 | -10 Lc requirement |

**Output:**
```typescript
interface AccessibilityTier {
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Fail';
  score: number;                    // 0-100
  baseRequirement: number;          // Lc without modifiers
  adjustedRequirement: number;      // Lc with font modifiers
  meetsRequirement: boolean;
  recommendations: string[];
}
```

---

### 3.4 Stage 4: Policy Evaluation

**Purpose:** Evaluate the decision against applicable governance policies.

**Policy Matching:**

1. Collect all registered policies
2. Filter by context applicability
3. Sort by priority (critical > high > medium > low)
4. Evaluate each policy in order

**Evaluation Logic:**

```typescript
for (const policy of applicablePolicies) {
  const result = evaluatePolicy(decision, policy);

  if (result.violations.length > 0) {
    if (policy.enforcement === 'strict') {
      // Must fix or reject
      violations.push(...result.violations);
    } else if (policy.enforcement === 'advisory') {
      // Warn but allow
      warnings.push(...result.warnings);
    } else {
      // Monitoring only - log
      auditLog.append(result);
    }
  }
}
```

**Output:**
```typescript
interface PolicyEvaluation {
  policies: PolicyResult[];
  violations: PolicyViolation[];
  warnings: string[];
  requiresAdjustment: boolean;
  canAutoFix: boolean;
}
```

---

### 3.5 Stage 5: Adjustment

**Purpose:** Automatically adjust colors to meet policy requirements.

**Adjustment Strategy:**

1. **Analyze Violation**
   - Determine required Lc increase
   - Check if foreground or background should move

2. **Calculate Adjustment**
   ```
   Required Lc increase = policy.minLc - current.absoluteLc
   Lightness delta = calculateLightnessDelta(increase)
   ```

3. **Apply Adjustment**
   - Prefer adjusting the color with more room to move
   - Preserve hue when possible
   - Minimize chroma reduction

4. **Verify Adjustment**
   - Re-run contrast calculation
   - Verify policy compliance
   - If still failing, try alternative adjustment

**Adjustment Constraints:**

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max lightness shift | 0.3 | Preserve color identity |
| Max chroma reduction | 50% | Maintain vibrancy |
| Hue preservation | ±5° | Brand color fidelity |
| Minimum iterations | 1 | Always attempt |
| Maximum iterations | 10 | Prevent infinite loops |

**Output:**
```typescript
interface AdjustedColorPair {
  foreground: string;
  background: string;
  adjustments: DecisionAdjustment[];
  adjustmentMagnitude: number;    // 0-1
}
```

---

### 3.6 Stage 6: Decision Output

**Purpose:** Compile final decision with explanation and audit trail.

**Decision Structure:**

```typescript
interface GovernedDecision {
  // Core decision
  decision: ContrastDecision;

  // Governance outcome
  outcome: 'approved' | 'adjusted' | 'rejected' | 'conditional';

  // Changes made
  adjustments: DecisionAdjustment[];

  // Explanation (for AI/human consumption)
  explanation: {
    summary: string;
    factors: DecisionFactor[];
    alternatives: DecisionAlternative[];
    confidence: number;
    reasoning: string;
  };

  // Audit trail
  auditEntry: AuditEntry;

  // Metadata
  evaluatedAt: string;
  processingTime: number;
}
```

---

## 4. Decision Factors

Each decision documents the factors that influenced it:

### 4.1 Factor Categories

| Category | Examples |
|----------|----------|
| **Perceptual** | APCA Lc, lightness difference, chroma contrast |
| **Accessibility** | WCAG tier, font size impact, font weight impact |
| **Policy** | Brand requirements, org standards, context rules |
| **Context** | Color scheme, viewport, accessibility mode |

### 4.2 Factor Weights

| Factor | Default Weight | Impact |
|--------|----------------|--------|
| APCA Lc | 0.40 | Primary contrast metric |
| WCAG Ratio | 0.20 | Compatibility metric |
| Font Size | 0.15 | Readability modifier |
| Policy Score | 0.15 | Governance compliance |
| Hue Harmony | 0.10 | Aesthetic consideration |

---

## 5. Explanation Format

The explanation is designed to be consumed by both humans and AI systems:

### 5.1 Human-Readable

```
Summary: This color pair meets Gold accessibility tier with
         APCA Lc of 78.4, suitable for body text.

Reasoning: The foreground (#FFFFFF) on background (#1E40AF)
           provides sufficient contrast for body text at 16px.
           The light-on-dark polarity is appropriate for the
           dark color scheme context.

Key Factors:
- APCA Lc: 78.4 (Gold tier requires ≥75)
- Font size: 16px (baseline, no modifier)
- Polarity: Light text on dark background
```

### 5.2 AI-Readable (JSON)

```json
{
  "summary": "Gold tier contrast, approved for body text",
  "confidence": 0.95,
  "factors": [
    {
      "name": "apcaLc",
      "value": 78.4,
      "weight": 0.4,
      "impact": "positive",
      "explanation": "Exceeds Gold tier threshold of 75"
    },
    {
      "name": "fontSize",
      "value": 16,
      "weight": 0.15,
      "impact": "neutral",
      "explanation": "Baseline size, no modifier applied"
    }
  ],
  "alternatives": [
    {
      "description": "Increase foreground lightness to L:0.98",
      "rejected": true,
      "reason": "Current contrast already exceeds threshold"
    }
  ],
  "reasoning": "Decision approved based on sufficient APCA contrast..."
}
```

---

## 6. Error Handling

### 6.1 Error Categories

| Category | Code Range | Example |
|----------|------------|---------|
| Input | 1000-1999 | Invalid color format |
| Calculation | 2000-2999 | Division by zero |
| Policy | 3000-3999 | Unknown policy ID |
| Adjustment | 4000-4999 | Cannot meet requirements |
| System | 5000-5999 | Memory allocation failure |

### 6.2 Error Response

```typescript
interface DecisionError {
  code: number;
  category: string;
  message: string;
  input: unknown;
  suggestion?: string;
  documentationUrl?: string;
}
```

---

## 7. Determinism Guarantees

### 7.1 Invariants

1. **Input Normalization**
   - Equivalent colors (e.g., `#F00` vs `#FF0000`) produce identical outputs

2. **Calculation Precision**
   - All floating-point operations use 64-bit IEEE 754
   - Results rounded to 4 decimal places for comparison

3. **Policy Ordering**
   - Policies evaluated in deterministic priority order
   - Tie-breaking by policy ID (alphabetical)

4. **Adjustment Determinism**
   - Same violation always triggers same adjustment strategy
   - Iterative adjustments follow fixed algorithm

### 7.2 Verification

To verify determinism:

```typescript
// Run same decision twice
const result1 = engine.evaluate(input);
const result2 = engine.evaluate(input);

// Hash outputs
const hash1 = computeHash(result1.decision);
const hash2 = computeHash(result2.decision);

// Must be identical
assert(hash1 === hash2);
```

---

## 8. Performance Characteristics

| Metric | Target | Measured |
|--------|--------|----------|
| Single decision | < 2ms | ~0.8ms |
| With policy evaluation | < 5ms | ~2.1ms |
| With adjustment | < 10ms | ~4.5ms |
| Batch (100 pairs) | < 200ms | ~85ms |

---

## 9. Integration Points

### 9.1 Plugin Hooks

| Hook | When Called | Can Modify |
|------|-------------|------------|
| `beforeDecision` | Before Stage 1 | Input |
| `afterDecision` | After Stage 6 | Output |

### 9.2 Event Emissions

| Event | Payload |
|-------|---------|
| `decision:start` | Input data |
| `decision:normalized` | Normalized pair |
| `decision:contrast` | Contrast metrics |
| `decision:tier` | Accessibility tier |
| `decision:policy` | Policy evaluation |
| `decision:adjusted` | Adjustment details |
| `decision:complete` | Full decision |
| `decision:error` | Error details |

---

## 10. Testing Considerations

### 10.1 Unit Tests

- Test each stage independently
- Verify normalization edge cases
- Validate calculation accuracy

### 10.2 Integration Tests

- Full pipeline with various inputs
- Policy integration scenarios
- Adjustment verification

### 10.3 Property-Based Tests

```typescript
// Determinism property
fc.assert(fc.property(
  arbitraryColorPair,
  (pair) => {
    const r1 = engine.evaluate(pair);
    const r2 = engine.evaluate(pair);
    return deepEqual(r1, r2);
  }
));

// Idempotency property
fc.assert(fc.property(
  arbitraryColorPair,
  (pair) => {
    const adjusted = engine.evaluate(pair).decision;
    const readjusted = engine.evaluate({
      foreground: adjusted.foreground,
      background: adjusted.background
    });
    return readjusted.outcome === 'approved';
  }
));
```

---

## 11. Version History

| Version | Date | Changes |
|---------|------|---------|
| 5.0.0 | 2026-01-04 | Phase 5 standardization |
| 4.0.0 | 2025-12-01 | Governance integration |
| 3.0.0 | 2025-11-01 | Initial decision engine |

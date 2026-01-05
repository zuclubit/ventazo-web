# Color Intelligence Perceptual Specification

**Version:** 5.0.0
**Status:** Stable
**Scope:** UI, Brand, Accessibility, AI
**Last Updated:** 2026-01-04

---

## 1. Introduction

The Color Intelligence Perceptual Specification defines a formal standard for perceptually-accurate color decisions in digital interfaces. This specification enables:

- **Third-party reimplementation** with guaranteed compatibility
- **External auditing** of color decisions
- **Regulatory compliance** for accessibility requirements
- **AI agent guidance** through explicit contracts

This document serves as the canonical reference for any implementation claiming Color Intelligence conformance.

---

## 2. Scope

### 2.1 What This Specification Covers

| Domain | Description |
|--------|-------------|
| **Perceptual Color Spaces** | OKLCH, HCT, CAM16 color model implementations |
| **Contrast Calculation** | APCA (Accessible Perceptual Contrast Algorithm) |
| **Accessibility Validation** | WCAG 2.1/3.0 conformance checking |
| **Decision Engine** | Deterministic color pairing recommendations |
| **Governance Policies** | Policy-based color approval system |
| **Export Formats** | Design token generation (DTCG, Style Dictionary, Figma, Tailwind) |

### 2.2 What This Specification Does NOT Cover

| Non-Goal | Rationale | Alternative |
|----------|-----------|-------------|
| **Color Naming** | Subjective, varies by culture | Use dedicated color naming services |
| **Aesthetic Preferences** | Purely subjective domain | Defer to brand guidelines |
| **Color Psychology** | Insufficient scientific consensus | Consult domain experts |
| **Hardware Calibration** | Device-specific implementation | Use OS-level calibration |
| **Print Color** | Different perceptual models (CMYK) | Use print-specific specifications |

---

## 3. External References

This specification builds upon and references the following standards:

### 3.1 Implements

| Standard | Version | Section | URL |
|----------|---------|---------|-----|
| APCA | 0.1.9 | Full | https://git.apcacontrast.com/documentation |
| WCAG 2.1 | 2.1 | 1.4.3, 1.4.6, 1.4.11 | https://www.w3.org/WAI/WCAG21/ |
| WCAG 3.0 | Draft | Visual Contrast | https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/ |

### 3.2 References

| Standard | Version | Relationship |
|----------|---------|--------------|
| OKLCH | 1.0 | Color space foundation |
| HCT | 1.0 | Tonal palette generation |
| CIE LCH | 1976 | Historical reference |
| sRGB | IEC 61966-2-1 | Output color space |

---

## 4. Formal Guarantees

The following guarantees are provided by any conforming implementation:

### 4.1 Perceptual Guarantees

| ID | Guarantee | Testable |
|----|-----------|----------|
| G-P-001 | APCA Lc values are accurate within ±0.1 Lc | ✓ |
| G-P-002 | OKLCH conversions preserve perceptual uniformity | ✓ |
| G-P-003 | HCT tonal palettes maintain consistent chroma | ✓ |
| G-P-004 | Gamut mapping preserves hue within 2° | ✓ |
| G-P-005 | Lightness interpolation is perceptually linear | ✓ |

### 4.2 Accessibility Guarantees

| ID | Guarantee | Testable |
|----|-----------|----------|
| G-A-001 | WCAG 2.1 contrast ratios are calculated per spec | ✓ |
| G-A-002 | APCA Lc thresholds match published requirements | ✓ |
| G-A-003 | Font size adjustments follow APCA guidelines | ✓ |
| G-A-004 | Color-only information is flagged as violation | ✓ |

### 4.3 Determinism Guarantees

| ID | Guarantee | Testable |
|----|-----------|----------|
| G-D-001 | Same inputs always produce same outputs | ✓ |
| G-D-002 | Decision chains are fully reproducible | ✓ |
| G-D-003 | Audit trails are cryptographically verifiable | ✓ |
| G-D-004 | Policy evaluations are idempotent | ✓ |

### 4.4 Performance Guarantees

| ID | Guarantee | Testable |
|----|-----------|----------|
| G-F-001 | Single contrast calculation < 1ms | ✓ |
| G-F-002 | Palette generation (12 colors) < 10ms | ✓ |
| G-F-003 | Policy evaluation < 5ms per rule | ✓ |
| G-F-004 | Export generation < 100ms per format | ✓ |

---

## 5. Conformance Levels

Color Intelligence defines four conformance levels, aligned with WCAG 3.0 scoring:

### 5.1 Bronze (CI-Bronze)

**Minimum Score:** 60

**Requirements:**
- APCA Lc ≥ 45 for body text
- WCAG 2.1 AA compliance
- Basic audit logging
- Deterministic outputs

**Use Cases:** Internal tools, prototypes, MVP applications

### 5.2 Silver (CI-Silver)

**Minimum Score:** 75

**Requirements:**
- All Bronze requirements
- APCA Lc ≥ 60 for body text
- WCAG 2.1 AA for all UI components
- Full audit trail with reproducibility
- Policy governance enabled

**Use Cases:** Consumer applications, enterprise software

### 5.3 Gold (CI-Gold)

**Minimum Score:** 85

**Requirements:**
- All Silver requirements
- APCA Lc ≥ 75 for critical text
- WCAG 2.1 AAA where applicable
- Regulatory compliance reporting
- Explainable AI outputs
- Plugin ecosystem isolation

**Use Cases:** Healthcare, finance, government applications

### 5.4 Platinum (CI-Platinum)

**Minimum Score:** 95

**Requirements:**
- All Gold requirements
- APCA Lc ≥ 90 for all text
- WCAG 3.0 Gold equivalence
- Third-party audit certification
- Reference implementation compliance
- Zero tolerance for policy violations

**Use Cases:** Critical infrastructure, accessibility-first organizations

---

## 6. Decision Model

See [DECISION_MODEL.md](./DECISION_MODEL.md) for the complete decision flow specification.

### 6.1 Decision Flow Summary

```
Input (foreground, background, context)
         │
         ▼
┌─────────────────────────┐
│ Color Space Conversion  │ OKLCH, HCT
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Contrast Calculation    │ APCA Lc, WCAG ratio
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Accessibility Tier      │ Bronze/Silver/Gold/Platinum
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Policy Evaluation       │ Governance rules
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Decision Output         │ Approved/Adjusted/Rejected
└─────────────────────────┘
```

---

## 7. Governance Model

See [GOVERNANCE_MODEL.md](./GOVERNANCE_MODEL.md) for the complete policy framework.

### 7.1 Policy Hierarchy

```
Organization Policy (highest priority)
         │
         ▼
     Brand Policy
         │
         ▼
  Accessibility Policy
         │
         ▼
   Default Policy (lowest priority)
```

### 7.2 Enforcement Modes

| Mode | Behavior |
|------|----------|
| **strict** | Reject non-compliant decisions |
| **advisory** | Warn but allow non-compliant decisions |
| **monitoring** | Log violations without intervention |

---

## 8. Plugin System

The plugin system allows extending Color Intelligence without modifying core functionality.

### 8.1 Hook Lifecycle

```
Plugin Load
     │
     ├─► beforeDecision ──► Core Decision ──► afterDecision
     │
     ├─► beforeExport ──► Core Export ──► afterExport
     │
     ├─► beforeValidation ──► Core Validation ──► afterValidation
     │
     └─► afterGovernance
```

### 8.2 Plugin Capabilities

| Capability | Description | Risk Level |
|------------|-------------|------------|
| canModifyDecisions | Alter decision outputs | High |
| canModifyExports | Alter export content | Medium |
| canAccessGovernance | Read policy evaluations | Low |
| canViolatePolicies | Override policy rules | Critical |
| requiresNetwork | External API access | Medium |
| requiresStorage | Persistent data storage | Low |

### 8.3 Sandboxing

Plugins execute in isolation with:
- No direct DOM access
- No global state mutation
- Timeout enforcement (5s default)
- Memory limits (50MB default)

---

## 9. Audit & Reproducibility

### 9.1 Audit Entry Structure

Every decision generates an audit entry containing:

```typescript
interface AuditEntry {
  id: string;              // Unique identifier
  timestamp: string;       // ISO 8601
  category: string;        // decision | governance | export
  input: {
    data: unknown;
    hash: string;          // SHA-256 of input
  };
  output: {
    data: unknown;
    hash: string;          // SHA-256 of output
  };
  decision?: {
    summary: string;
    factors: Factor[];
    confidence: number;    // 0-1
    reasoning: string;
  };
  systemVersion: string;
}
```

### 9.2 Reproducibility Verification

To verify a decision can be reproduced:

1. Extract `input.hash` from audit entry
2. Re-run decision with same input
3. Compare `output.hash` with stored hash
4. If hashes match, decision is reproducible

---

## 10. Versioning & Compatibility

### 10.1 Version Format

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes to specification
MINOR: New features, backward compatible
PATCH: Bug fixes, clarifications
```

### 10.2 Compatibility Matrix

| Spec Version | API Version | Breaking |
|--------------|-------------|----------|
| 5.0.0 | 5.x | Initial release |
| 4.0.0 | 4.x | Pre-standardization |

### 10.3 Deprecation Policy

- Features deprecated in version N
- Warnings issued in version N+1
- Removed in version N+2
- Minimum 6-month deprecation window

---

## 11. Certification

### 11.1 Self-Certification

Organizations may self-certify by:

1. Running the conformance test suite
2. Achieving target score for desired level
3. Generating conformance report
4. Publishing badge with report link

### 11.2 Third-Party Certification

For regulatory or compliance purposes:

1. Engage accredited auditor
2. Provide audit trail access
3. Demonstrate reproducibility
4. Receive signed certification

---

## 12. Reference Implementation

The canonical reference implementation is maintained at:

```
zuclubit-smart-crm/apps/web/src/lib/color-intelligence/
```

### 12.1 Golden Test Sets

Located at `__tests__/golden/`:

| Test Set | Purpose |
|----------|---------|
| contrast-calculations.json | APCA/WCAG reference values |
| color-conversions.json | Color space transformations |
| policy-evaluations.json | Governance decisions |
| accessibility-tiers.json | Tier classifications |

---

## 13. Authors & Contributors

- Color Intelligence Team
- Zuclubit Design Systems
- Open source contributors

---

## 14. Changelog

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 5.0.0 | 2026-01-04 | Feature | Phase 5: Standardization Layer |
| 4.0.0 | 2025-12-01 | Feature | Phase 4: Governance & Adoption |
| 3.0.0 | 2025-11-01 | Feature | Phase 3: Decision Engine |
| 2.0.0 | 2025-10-01 | Feature | Phase 2: Core Implementation |
| 1.0.0 | 2025-09-01 | Feature | Phase 1: Foundation |

---

## 15. License

This specification is released under the MIT License.

Implementation source code may have different licensing terms.

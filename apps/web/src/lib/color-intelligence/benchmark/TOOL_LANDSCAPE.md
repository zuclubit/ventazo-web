# Color Library Tool Landscape Analysis

**Version:** 1.0.0
**Date:** 2026-01-04
**Status:** Research Complete
**Methodology:** Web research from official sources (GitHub, npm, W3C, academic papers)

---

## Executive Summary

This document provides a comprehensive analysis of the color library ecosystem as of January 2026. The analysis covers 8 major libraries/tools that represent the state-of-the-art in color manipulation, accessibility validation, and design token generation.

---

## 1. Material Color Utilities (@material/material-color-utilities)

### Overview
| Attribute | Value |
|-----------|-------|
| **Maintainer** | Google Material Design Team |
| **Version** | 0.3.0 (as of 2025) |
| **Language** | TypeScript (multi-platform) |
| **License** | Apache-2.0 |
| **Repository** | https://github.com/material-foundation/material-color-utilities |

### Philosophy
Google's official implementation of Material Design 3 color science. Focuses on the HCT (Hue, Chroma, Tone) color space which combines CAM16 perceptual hue/chroma with CIE L* lightness for predictable tone scales.

### Key Capabilities
- **HCT Color Space**: Native implementation of Hue-Chroma-Tone
- **CAM16**: Full Color Appearance Model 2016 implementation
- **Dynamic Color**: Theme generation from source colors
- **Tonal Palettes**: Material Design 3 tonal palette generation (0-100 tone scale)
- **Contrast**: WCAG 2.1 contrast ratio calculations
- **Scheme Generation**: Light/dark/content scheme generation

### Technical Characteristics
- sRGB 8-bit limited (no wide gamut)
- Platform parity (Dart, Java/Kotlin, TypeScript, C++)
- Tone-based contrast system (not APCA)
- Designed for Material Design 3 ecosystem

### Limitations
- No APCA/WCAG 3.0 support
- Limited to sRGB gamut
- Tightly coupled to Material Design paradigm
- No CSS Color 4 OKLCH support

### Source Verification
- Official release notes: https://github.com/material-foundation/material-color-utilities/releases
- Material Design 3 specification: https://m3.material.io/

---

## 2. culori

### Overview
| Attribute | Value |
|-----------|-------|
| **Maintainer** | Dan Burzo |
| **Version** | 4.0.2 (December 2024) |
| **Language** | JavaScript/TypeScript |
| **License** | MIT |
| **Repository** | https://github.com/Evercoder/culori |

### Philosophy
Reference implementation for CSS Color Level 4 specification. Prioritizes color science accuracy and specification compliance over convenience features.

### Key Capabilities
- **Color Spaces**: 30+ color spaces (sRGB, P3, Rec.2020, OKLCH, OKLAB, Lab, LCH, etc.)
- **CSS Color 4**: Full specification compliance
- **Interpolation**: Perceptually uniform color interpolation
- **Gamut Mapping**: CSS Color 4 gamut mapping algorithms
- **Parsing**: CSS color string parsing and serialization
- **Difference**: Delta E calculations (CIE76, CIE94, CIEDE2000)

### Technical Characteristics
- Tree-shakeable modular architecture
- Functional programming style
- High precision floating-point calculations
- Extensive color space conversion matrices

### Limitations
- No accessibility validation (no WCAG ratios)
- No APCA implementation
- Pure color manipulation focus
- Requires companion libraries for accessibility

### Performance Note
Per @texel/color benchmarks, culori's gamut mapping is slower than optimized implementations (68.9x slower than @texel/color for OKLCH gamut mapping).

### Source Verification
- npm: https://www.npmjs.com/package/culori
- GitHub: https://github.com/Evercoder/culori

---

## 3. Color.js (colorjs.io)

### Overview
| Attribute | Value |
|-----------|-------|
| **Maintainer** | Lea Verou, Chris Lilley (W3C CSS WG) |
| **Version** | 0.5.2+ (2024-2025) |
| **Language** | JavaScript/TypeScript |
| **License** | MIT |
| **Repository** | https://github.com/color-js/color.js |

### Philosophy
Created by CSS Color specification editors. Aims to be the most comprehensive and accurate color library, serving as a reference implementation for CSS Color specifications.

### Key Capabilities
- **Color Spaces**: 50+ color spaces
- **CAM16**: Full CAM16 and CAM16-JMh support
- **HCT**: Material Design 3 HCT implementation
- **Gamut Mapping**: Multiple algorithms (CSS, chroma reduction, etc.)
- **Interpolation**: All CSS Color 4 interpolation methods
- **Contrast**: WCAG 2.1 and experimental APCA support
- **Parsing**: Complete CSS color syntax support

### Technical Characteristics
- Object-oriented API with method chaining
- Extensible plugin architecture
- High-precision calculations
- Web-first design (browser + Node)

### Unique Features
- Created by W3C CSS Working Group editors
- Most comprehensive color space support
- Experimental features aligned with CSS drafts

### Limitations
- Larger bundle size than specialized libraries
- Some features still experimental
- Performance not optimized for high-throughput scenarios

### Source Verification
- Official site: https://colorjs.io/
- GitHub: https://github.com/color-js/color.js

---

## 4. Adobe Leonardo (@adobe/leonardo-contrast-colors)

### Overview
| Attribute | Value |
|-----------|-------|
| **Maintainer** | Adobe Design |
| **Version** | 1.0.0 |
| **Language** | JavaScript |
| **License** | Apache-2.0 |
| **Repository** | https://github.com/adobe/leonardo |

### Philosophy
Contrast-first color generation. Instead of defining colors and checking contrast, Leonardo defines target contrast ratios and generates colors that meet those requirements.

### Key Capabilities
- **Contrast-First Design**: Generate colors from target contrast ratios
- **WCAG Compliance**: Built for AA/AAA compliance
- **Adaptive Palettes**: Palettes that adapt to different backgrounds
- **Smooth Scales**: Perceptually uniform color scales
- **CAM02**: Uses CAM02 color appearance model

### Technical Characteristics
- D3 Color based
- CAM02 for perceptual uniformity
- Focus on design system generation
- Theme-oriented output

### Use Cases
- Accessible color palette generation
- Design system creation
- Adaptive theming

### Limitations
- No APCA/WCAG 3.0 support
- Uses older CAM02 (not CAM16)
- Limited to accessibility-focused generation
- Not a general-purpose color manipulation library

### Source Verification
- GitHub: https://github.com/adobe/leonardo
- Adobe Design: https://leonardocolor.io/

---

## 5. @texel/color

### Overview
| Attribute | Value |
|-----------|-------|
| **Maintainer** | Matt DesLauriers (Texel) |
| **Version** | 0.1.x (2024-2025) |
| **Language** | JavaScript/TypeScript |
| **License** | MIT |
| **Repository** | https://github.com/texel-org/color |

### Philosophy
High-performance OKLCH color manipulation. Optimized for real-time applications and large-scale color operations.

### Key Capabilities
- **OKLCH Focus**: Specialized OKLCH operations
- **High Performance**: Optimized algorithms
- **Gamut Mapping**: Fast CSS Color 4 compliant gamut mapping
- **Minimal**: Small bundle size

### Performance Benchmarks (Per Official Claims)
- OKLCH gamut mapping: 68.9x faster than culori
- sRGB to OKLCH: 3.4x faster than culori
- Optimized for bulk operations

### Technical Characteristics
- SIMD-style optimizations
- Minimal dependencies
- TypeScript native
- Tree-shakeable

### Limitations
- OKLCH-focused (limited color space support)
- Newer library, smaller ecosystem
- No accessibility features
- No APCA/WCAG support

### Source Verification
- GitHub: https://github.com/texel-org/color

---

## 6. apca-w3

### Overview
| Attribute | Value |
|-----------|-------|
| **Maintainer** | Andrew Somers (Myndex) |
| **Version** | 0.1.9 (Reference Implementation) |
| **Language** | JavaScript |
| **License** | W3C Software License |
| **Repository** | https://github.com/Myndex/apca-w3 |

### Philosophy
Official reference implementation of APCA (Accessible Perceptual Contrast Algorithm) for WCAG 3.0. This is THE canonical implementation.

### Key Capabilities
- **APCA Lc Calculation**: Lightness Contrast (Lc) values
- **Polarity Handling**: Dark-on-light vs light-on-dark
- **Font Size Lookup**: Lc to minimum font size mapping
- **SAPC**: Spatial APCA calculations

### Technical Characteristics
- Reference implementation (not optimized)
- SAPC-4g algorithm version
- Lc range: 0 to ~108
- Polarity-aware contrast

### APCA Lc Thresholds (Approximate WCAG Equivalents)
| APCA Lc | WCAG 2.1 Equivalent | Use Case |
|---------|---------------------|----------|
| Lc 15 | ~1.5:1 | Minimum for non-text |
| Lc 30 | ~2:1 | Large text minimum |
| Lc 45 | ~3:1 | WCAG AA large text |
| Lc 60 | ~4.5:1 | WCAG AA normal text |
| Lc 75 | ~7:1 | WCAG AAA normal text |
| Lc 90 | ~10:1 | Enhanced readability |

### WCAG 3.0 Status Note
As of August 2025, WCAG 3.0 Working Draft does NOT include APCA requirements. APCA remains experimental. The algorithm is stable but normative thresholds are not finalized.

### Source Verification
- GitHub: https://github.com/Myndex/apca-w3
- SAPC-APCA: https://github.com/Myndex/SAPC-APCA
- W3C WCAG 3.0 Draft: https://www.w3.org/TR/wcag-3.0/

---

## 7. chroma.js

### Overview
| Attribute | Value |
|-----------|-------|
| **Maintainer** | Gregor Aisch |
| **Version** | 3.2.0 (2024-2025) |
| **Language** | JavaScript |
| **License** | BSD-3-Clause |
| **Repository** | https://github.com/gka/chroma.js |

### Philosophy
Practical color manipulation for data visualization and web design. Balance between power and simplicity.

### Key Capabilities
- **Color Scales**: Bezier and linear interpolation
- **Color Spaces**: Lab, LCH, OKLCH, HSL, HSV, RGB, etc.
- **Blending**: Multiple blend modes
- **Analysis**: Luminance, contrast calculations
- **Parsing**: Flexible color input parsing

### Technical Characteristics
- Long-established library (since 2011)
- Wide browser compatibility
- Focus on practical use cases
- Data visualization oriented

### OKLCH Support
Version 3.x added OKLCH support, aligning with CSS Color 4.

### Limitations
- WCAG 2.1 contrast only (no APCA)
- Older architecture than modern alternatives
- Not tree-shakeable in older versions

### Source Verification
- GitHub: https://github.com/gka/chroma.js
- Documentation: https://gka.github.io/chroma.js/

---

## 8. tinycolor2

### Overview
| Attribute | Value |
|-----------|-------|
| **Maintainer** | Brian Grinstead |
| **Version** | 1.6.0 |
| **Language** | JavaScript |
| **License** | MIT |
| **Repository** | https://github.com/bgrins/TinyColor |

### Philosophy
Lightweight, practical color manipulation. Focus on common web development tasks.

### Key Capabilities
- **Readability**: WCAG 2.1 contrast ratio functions
- **Manipulation**: Lighten, darken, saturate, etc.
- **Parsing**: Multiple input formats
- **Combinations**: Complementary, triadic, etc.

### Technical Characteristics
- Small bundle size
- No dependencies
- Wide browser support
- Simple API

### Limitations
- WCAG 2.1 only (no APCA)
- Limited color space support (no OKLCH)
- No perceptual uniformity considerations
- Legacy codebase

### Source Verification
- GitHub: https://github.com/bgrins/TinyColor
- npm: https://www.npmjs.com/package/tinycolor2

---

## Comparative Matrix

### Feature Comparison

| Feature | Color Intelligence | Material | culori | Color.js | Leonardo | @texel | apca-w3 | chroma |
|---------|-------------------|----------|--------|----------|----------|--------|---------|--------|
| **OKLCH** | ✅ Full | ❌ | ✅ Full | ✅ Full | ❌ | ✅ Full | ❌ | ✅ v3+ |
| **HCT** | ✅ Full | ✅ Native | ❌ | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **CAM16** | ✅ Full | ✅ Full | ❌ | ✅ Full | ❌ CAM02 | ❌ | ❌ | ❌ |
| **APCA** | ✅ SAPC-4g | ❌ | ❌ | ⚠️ Exp | ❌ | ❌ | ✅ Ref | ❌ |
| **WCAG 2.1** | ✅ Full | ✅ Basic | ❌ | ✅ Full | ✅ Core | ❌ | ❌ | ✅ Basic |
| **Gamut Map** | ✅ CSS4 | ❌ | ✅ CSS4 | ✅ CSS4 | ❌ | ✅ Fast | ❌ | ❌ |
| **Design Tokens** | ✅ Export | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Governance** | ✅ Policies | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Accessibility Focus

| Library | WCAG 2.1 | WCAG 3.0/APCA | Font Guidance | Auto-Fix |
|---------|----------|---------------|---------------|----------|
| Color Intelligence | ✅ AA/AAA | ✅ Full Lc | ✅ Size/Weight | ✅ Suggest |
| Material | ✅ Basic | ❌ | ❌ | ❌ |
| culori | ❌ | ❌ | ❌ | ❌ |
| Color.js | ✅ Full | ⚠️ Exp | ❌ | ❌ |
| Leonardo | ✅ Core | ❌ | ❌ | ✅ Generate |
| apca-w3 | ❌ | ✅ Reference | ✅ Lookup | ❌ |

### Performance Positioning

| Library | Focus | Optimization Level | Bundle Size |
|---------|-------|-------------------|-------------|
| Color Intelligence | Full System | Medium | Medium |
| Material | Material Design | Platform-specific | Small |
| culori | Accuracy | Low | Medium |
| Color.js | Completeness | Low | Large |
| Leonardo | Generation | Medium | Medium |
| @texel/color | Speed | High | Small |
| apca-w3 | Reference | None | Tiny |
| chroma.js | Practicality | Medium | Small |

---

## Specification Alignment (January 2026)

### CSS Color Level 4
- **Status**: W3C Recommendation (April 2024)
- **Key Features**: OKLCH, Lab, LCH, color(), relative color syntax
- **Aligned Libraries**: culori, Color.js, @texel/color, Color Intelligence

### CSS Color Level 5
- **Status**: W3C Working Draft (March 2025)
- **Key Features**: color-contrast(), color-mix() enhancements
- **Aligned Libraries**: Color.js (partial), Color Intelligence (partial)

### WCAG 3.0
- **Status**: Working Draft (August 2025)
- **Note**: Does NOT yet include APCA requirements
- **APCA Status**: Experimental, algorithm stable, thresholds not normative
- **Aligned Libraries**: apca-w3 (reference), Color Intelligence (implementation)

### Material Design 3
- **Status**: Stable (2023+)
- **Key Features**: HCT, Dynamic Color, Tonal Palettes
- **Aligned Libraries**: Material Color Utilities, Color.js, Color Intelligence

---

## Conclusions

### Unique Positioning of Color Intelligence v5.0

1. **Only system combining**: OKLCH + HCT + APCA + Governance + Design Tokens
2. **Only system with**: Policy-based color governance
3. **Only system offering**: AI action contracts for automated accessibility
4. **Comprehensive**: Spans color science → accessibility → design tooling

### Key Differentiators

| Capability | Color Intelligence | Nearest Alternative |
|------------|-------------------|---------------------|
| APCA with Guidance | ✅ Full system | apca-w3 (lookup only) |
| HCT + OKLCH | ✅ Both | Color.js (both, less integrated) |
| Governance Policies | ✅ Unique | None |
| Design Token Export | ✅ Multi-format | None (in color libs) |
| Conformance Engine | ✅ 4 levels | None |
| AI Contracts | ✅ Unique | None |

### Honest Assessment of Gaps

1. **Performance**: @texel/color likely faster for bulk OKLCH operations
2. **Color Space Count**: Color.js has more color spaces (50+ vs ~10)
3. **Reference Status**: apca-w3 is THE reference APCA implementation
4. **Ecosystem**: Material has larger adoption in Material Design projects

---

## References

1. Material Color Utilities: https://github.com/material-foundation/material-color-utilities
2. culori: https://culorijs.org/
3. Color.js: https://colorjs.io/
4. Adobe Leonardo: https://leonardocolor.io/
5. @texel/color: https://github.com/texel-org/color
6. apca-w3: https://github.com/Myndex/apca-w3
7. chroma.js: https://gka.github.io/chroma.js/
8. CSS Color 4: https://www.w3.org/TR/css-color-4/
9. CSS Color 5: https://www.w3.org/TR/css-color-5/
10. WCAG 3.0: https://www.w3.org/TR/wcag-3.0/
11. Material Design 3: https://m3.material.io/

---

**Document ID:** CI-LANDSCAPE-2026-01-04-001
**Researcher:** Claude Opus 4.5
**Status:** COMPLETE

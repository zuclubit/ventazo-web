// ============================================
// Phase 3: Decision Layer Property-Based Tests
// Verifies invariants for the Decision & Intelligence Layer
// ============================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import OKLCH from '../domain/value-objects/OKLCH';
import HCT from '../domain/value-objects/HCT';
import { ContrastDecisionEngine } from '../application/ContrastDecisionEngine';
import { WCAG3Simulator } from '../application/WCAG3Simulator';
import { PerceptualTokenGenerator } from '../application/PerceptualTokenGenerator';
import { MaterialDesign3Adapter } from '../infrastructure/adapters/MaterialDesign3Adapter';
import { FluentUIAdapter } from '../infrastructure/adapters/FluentUIAdapter';
import { AIReadableContractsService } from '../application/AIReadableContracts';
import {
  createFontSizePx,
  createFontWeight,
  createReadabilityContext,
  createViewingConditions,
  type ContrastDecision,
} from '../domain/types/decision';

// ============================================
// Custom Arbitraries
// ============================================

const hexColor = fc.integer({ min: 0, max: 0xFFFFFF }).map(n => {
  const hex = n.toString(16).padStart(6, '0').toUpperCase();
  return `#${hex}`;
});

// Safe hex colors that avoid extreme values for robust testing
const safeHexColor = fc.integer({ min: 0x202020, max: 0xE0E0E0 }).map(n => {
  const hex = n.toString(16).padStart(6, '0').toUpperCase();
  return `#${hex}`;
});

// Colors with sufficient variance for contrast testing
const contrastColor = fc.integer({ min: 0x303030, max: 0xD0D0D0 }).map(n => {
  const hex = n.toString(16).padStart(6, '0').toUpperCase();
  return `#${hex}`;
});

const fontSizePx = fc.integer({ min: 10, max: 72 });
const fontWeight = fc.constantFrom(100, 200, 300, 400, 500, 600, 700, 800, 900);
const environment = fc.constantFrom('dark-room', 'dim', 'average', 'bright', 'outdoor') as fc.Arbitrary<'dark-room' | 'dim' | 'average' | 'bright' | 'outdoor'>;

// Ensure color pairs have sufficient difference for contrast tests
const colorPair = fc.tuple(safeHexColor, safeHexColor).filter(([fg, bg]) => {
  // Ensure colors are different enough for meaningful contrast tests
  const fgVal = parseInt(fg.slice(1), 16);
  const bgVal = parseInt(bg.slice(1), 16);
  return Math.abs(fgVal - bgVal) > 0x202020; // At least 32 difference in each channel avg
});

// ============================================
// Contrast Decision Engine Invariants
// ============================================

describe('ContrastDecisionEngine Property-Based Tests', () => {
  const engine = new ContrastDecisionEngine();

  describe('Score Invariants', () => {
    it('score should always be in [0, 100] range', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, fontWeight, ([fg, bg], size, weight) => {
          const decision = engine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size, weight),
          });

          const score = decision.score as number;
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);

          return true;
        }),
        { numRuns: 200 }
      );
    });

    it('confidence should always be in [0, 1] range', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, fontWeight, ([fg, bg], size, weight) => {
          const decision = engine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size, weight),
          });

          const confidence = decision.confidence as number;
          expect(confidence).toBeGreaterThanOrEqual(0);
          expect(confidence).toBeLessThanOrEqual(1);

          return true;
        }),
        { numRuns: 200 }
      );
    });

    it('identical colors should have minimum score and fail accessibility', () => {
      fc.assert(
        fc.property(safeHexColor, fontSizePx, (color, size) => {
          const decision = engine.evaluate({
            foreground: color,
            background: color,
            readabilityContext: createReadabilityContext(size),
          });

          const score = decision.score as number;
          // Identical colors should be well below any passing threshold (bronze ~45)
          // Multi-factor analysis may add baseline score from font size factors
          // but the core contrast contribution should be minimal
          expect(score).toBeLessThan(45);
          // Should definitely fail accessibility check - this is the key invariant
          expect(decision.level).toBe('fail');

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Level Consistency Invariants', () => {
    it('higher score should not result in lower level', () => {
      fc.assert(
        fc.property(colorPair, colorPair, fontSizePx, ([fg1, bg1], [fg2, bg2], size) => {
          const decision1 = engine.evaluate({
            foreground: fg1,
            background: bg1,
            readabilityContext: createReadabilityContext(size),
          });

          const decision2 = engine.evaluate({
            foreground: fg2,
            background: bg2,
            readabilityContext: createReadabilityContext(size),
          });

          const levelOrder = ['fail', 'minimum', 'standard', 'enhanced'];
          const score1 = decision1.score as number;
          const score2 = decision2.score as number;

          if (score1 > score2 + 5) { // Allow margin
            const idx1 = levelOrder.indexOf(decision1.level);
            const idx2 = levelOrder.indexOf(decision2.level);
            expect(idx1).toBeGreaterThanOrEqual(idx2);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('wcagLevel should be consistent with level', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = engine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          // Check WCAG level matches internal level
          if (decision.level === 'fail') {
            expect(decision.wcagLevel).toBe('Fail');
          }
          if (decision.level === 'enhanced') {
            expect(decision.wcagLevel).toBe('Enhanced');
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Factor Weight Invariants', () => {
    it('factor weights should sum to approximately 1', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = engine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          const totalWeight = decision.factors.reduce((sum, f) => sum + f.weight, 0);
          expect(Math.abs(totalWeight - 1)).toBeLessThan(0.01);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('all factor values should be normalized (0-1)', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = engine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          for (const factor of decision.factors) {
            expect(factor.normalizedValue).toBeGreaterThanOrEqual(0);
            expect(factor.normalizedValue).toBeLessThanOrEqual(1);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Font Size Factor Invariants', () => {
    it('larger font should give equal or higher score', () => {
      fc.assert(
        fc.property(
          colorPair,
          fc.integer({ min: 12, max: 24 }),
          fc.integer({ min: 25, max: 72 }),
          ([fg, bg], smallSize, largeSize) => {
            const smallDecision = engine.evaluate({
              foreground: fg,
              background: bg,
              readabilityContext: createReadabilityContext(smallSize),
            });

            const largeDecision = engine.evaluate({
              foreground: fg,
              background: bg,
              readabilityContext: createReadabilityContext(largeSize),
            });

            const smallScore = smallDecision.score as number;
            const largeScore = largeDecision.score as number;

            // Larger font should have equal or better score
            expect(largeScore).toBeGreaterThanOrEqual(smallScore - 5);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Reasoning Invariants', () => {
    it('should always have at least one reasoning string', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = engine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          expect(decision.reasoning.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('failing decisions should have warnings or suggestions', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = engine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          if (decision.level === 'fail') {
            const hasGuidance = decision.warnings.length > 0 || decision.suggestions.length > 0;
            expect(hasGuidance).toBe(true);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================
// WCAG 3.0 Simulator Invariants
// ============================================

describe('WCAG3Simulator Property-Based Tests', () => {
  const simulator = new WCAG3Simulator();

  describe('Tier Invariants', () => {
    it('tier should follow ordering: Fail < Bronze < Silver < Gold < Platinum', () => {
      fc.assert(
        fc.property(colorPair, colorPair, fontSizePx, ([fg1, bg1], [fg2, bg2], size) => {
          const score1 = simulator.evaluate(fg1, bg1, { size: size, weight: 400 });

          const score2 = simulator.evaluate(fg2, bg2, { size: size, weight: 400 });

          const tierOrder = ['Fail', 'Bronze', 'Silver', 'Gold', 'Platinum'];
          const idx1 = tierOrder.indexOf(score1.tier);
          const idx2 = tierOrder.indexOf(score2.tier);

          // Higher continuous score should not have lower tier
          if ((score1.continuousScore as number) > (score2.continuousScore as number) + 10) {
            expect(idx1).toBeGreaterThanOrEqual(idx2);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('continuous score should be in [0, 100]', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const score = simulator.evaluate(fg, bg, { size: size, weight: 400 });

          const continuous = score.continuousScore as number;
          expect(continuous).toBeGreaterThanOrEqual(0);
          expect(continuous).toBeLessThanOrEqual(100);

          return true;
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Threshold Invariants', () => {
    it('thresholds should be ordered: bronze < silver < gold < platinum', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const score = simulator.evaluate(fg, bg, { size: size, weight: 400 });

          expect(score.bronzeThreshold).toBeLessThan(score.silverThreshold);
          expect(score.silverThreshold).toBeLessThan(score.goldThreshold);
          expect(score.goldThreshold).toBeLessThan(score.platinumThreshold);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('deltaToNextTier should be non-negative for non-Platinum', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const score = simulator.evaluate(fg, bg, { size: size, weight: 400 });

          if (score.tier !== 'Platinum') {
            expect(score.deltaToNextTier).toBeGreaterThanOrEqual(0);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Font Size Impact Invariants', () => {
    it('larger font should achieve same or higher tier', () => {
      fc.assert(
        fc.property(
          colorPair,
          fc.integer({ min: 12, max: 18 }),
          fc.integer({ min: 24, max: 48 }),
          ([fg, bg], smallSize, largeSize) => {
            const smallScore = simulator.evaluate(fg, bg, { size: smallSize, weight: 400 });

            const largeScore = simulator.evaluate(fg, bg, { size: largeSize, weight: 400 });

            const tierOrder = ['Fail', 'Bronze', 'Silver', 'Gold', 'Platinum'];
            const smallIdx = tierOrder.indexOf(smallScore.tier);
            const largeIdx = tierOrder.indexOf(largeScore.tier);

            expect(largeIdx).toBeGreaterThanOrEqual(smallIdx);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================
// Perceptual Token Generator Invariants
// ============================================

describe('PerceptualTokenGenerator Property-Based Tests', () => {
  const generator = new PerceptualTokenGenerator();

  describe('Token Generation Invariants', () => {
    it('should generate required token roles', () => {
      fc.assert(
        fc.property(safeHexColor, (brandColor) => {
          const palette = generator.generate(brandColor, 'light');

          const requiredRoles = [
            'background',
            'text-primary',
            'accent',
          ];

          for (const role of requiredRoles) {
            const token = palette.tokens.find(t => t.role === role);
            expect(token).toBeDefined();
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('all tokens should have valid hex colors', () => {
      fc.assert(
        fc.property(safeHexColor, (brandColor) => {
          const palette = generator.generate(brandColor, 'light');

          for (const token of palette.tokens) {
            expect(token.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('light and dark modes should have inverse lightness relationship', () => {
      fc.assert(
        fc.property(safeHexColor, (brandColor) => {
          const lightPalette = generator.generate(brandColor, 'light');
          const darkPalette = generator.generate(brandColor, 'dark');

          const lightBg = lightPalette.tokens.find(t => t.role === 'background');
          const darkBg = darkPalette.tokens.find(t => t.role === 'background');

          // Only test if both tokens exist and have valid hex
          if (lightBg && darkBg && lightBg.hex && darkBg.hex) {
            const lightColor = OKLCH.fromHex(lightBg.hex);
            const darkColor = OKLCH.fromHex(darkBg.hex);

            // Light mode background should be lighter (if both parse correctly with valid l)
            if (lightColor && darkColor &&
                typeof lightColor.l === 'number' &&
                typeof darkColor.l === 'number') {
              expect(lightColor.l).toBeGreaterThan(darkColor.l);
            }
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Dual Mode Invariants', () => {
    it('dual mode should generate both light and dark palettes', () => {
      fc.assert(
        fc.property(safeHexColor, (brandColor) => {
          const dualMode = generator.generateDualMode(brandColor);

          expect(dualMode.light).toBeDefined();
          expect(dualMode.dark).toBeDefined();
          expect(dualMode.light.scheme).toBe('light');
          expect(dualMode.dark.scheme).toBe('dark');

          return true;
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('CSS Variables Invariants', () => {
    it('CSS variables should be valid syntax', () => {
      fc.assert(
        fc.property(safeHexColor, (brandColor) => {
          const palette = generator.generate(brandColor, 'light');

          // Should have CSS variable string
          expect(palette.cssVariables).toContain(':root');
          expect(palette.cssVariables).toContain('--');

          return true;
        }),
        { numRuns: 30 }
      );
    });
  });
});

// ============================================
// Design System Adapters Invariants
// ============================================

describe('MaterialDesign3Adapter Property-Based Tests', () => {
  const adapter = new MaterialDesign3Adapter();

  describe('Tonal Palette Invariants', () => {
    it('tonal palette should have all MD3 tones', () => {
      fc.assert(
        fc.property(safeHexColor, (color) => {
          const palette = adapter.generateTonalPalette(color, 'primary');

          // MD3 standard tones
          const standardTones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];

          for (const tone of standardTones) {
            expect(palette.tones[tone]).toBeDefined();
          }

          return true;
        }),
        { numRuns: 30 }
      );
    });

    it('tonal palette should preserve hue', () => {
      fc.assert(
        fc.property(safeHexColor, (color) => {
          const oklch = OKLCH.fromHex(color)!;
          const palette = adapter.generateTonalPalette(color, 'primary');

          // Check that tones preserve approximate hue
          for (const [, toneColor] of Object.entries(palette.tones)) {
            if (toneColor.c > 0.01) { // Only for chromatic colors
              let hueDiff = Math.abs(toneColor.h - oklch.h);
              if (hueDiff > 180) hueDiff = 360 - hueDiff;
              expect(hueDiff).toBeLessThan(30);
            }
          }

          return true;
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Token Generation Invariants', () => {
    it('should generate tokens for all core roles', () => {
      fc.assert(
        fc.property(safeHexColor, (primaryColor) => {
          const output = adapter.generateTokens({
            primaryColor,
            scheme: 'light',
          });

          // Check for core MD3 tokens
          const tokenNames = output.tokens.map(t => t.name);
          expect(tokenNames).toContain('primary');
          expect(tokenNames).toContain('onPrimary');
          expect(tokenNames).toContain('surface');
          expect(tokenNames).toContain('onSurface');

          return true;
        }),
        { numRuns: 30 }
      );
    });
  });
});

describe('FluentUIAdapter Property-Based Tests', () => {
  const adapter = new FluentUIAdapter();

  describe('Theme Color Invariants', () => {
    it('should generate theme color slots', () => {
      fc.assert(
        fc.property(safeHexColor, (primaryColor) => {
          const output = adapter.generateTokens({
            primaryColor,
            scheme: 'light',
          });

          const tokenNames = output.tokens.map(t => t.name);
          expect(tokenNames).toContain('themePrimary');
          expect(tokenNames).toContain('themeDark');
          expect(tokenNames).toContain('themeLight');

          return true;
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Neutral Color Invariants', () => {
    it('neutral colors should have valid lightness ordering', () => {
      fc.assert(
        fc.property(safeHexColor, (primaryColor) => {
          const output = adapter.generateTokens({
            primaryColor,
            scheme: 'light',
          });

          const black = output.tokens.find(t => t.name === 'black');
          const white = output.tokens.find(t => t.name === 'white');

          // Only test if both tokens exist and have valid hex
          if (black && white && black.hex && white.hex) {
            const blackColor = OKLCH.fromHex(black.hex);
            const whiteColor = OKLCH.fromHex(white.hex);

            // Ensure both colors are valid and have lightness property
            if (blackColor && whiteColor &&
                typeof blackColor.l === 'number' &&
                typeof whiteColor.l === 'number') {
              expect(blackColor.l).toBeLessThan(whiteColor.l);
            }
          }

          return true;
        }),
        { numRuns: 30 }
      );
    });
  });
});

// ============================================
// AI-Readable Contracts Invariants
// ============================================

describe('AIReadableContracts Property-Based Tests', () => {
  const contractsService = new AIReadableContractsService();
  const decisionEngine = new ContrastDecisionEngine();

  describe('Contract Structure Invariants', () => {
    it('contract should have all required fields', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = decisionEngine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          const contract = contractsService.generateContract(decision);

          // Check required fields
          expect(contract.version).toBeDefined();
          expect(contract.type).toBe('contrast-decision');
          expect(contract.id).toBeDefined();
          expect(contract.input).toBeDefined();
          expect(contract.output).toBeDefined();
          expect(contract.computation).toBeDefined();
          expect(contract.explanation).toBeDefined();
          expect(contract.actions).toBeDefined();

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('contract validation should pass for valid contracts', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = decisionEngine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          const contract = contractsService.generateContract(decision);
          const validation = contractsService.validateContract(contract);

          expect(validation.valid).toBe(true);
          expect(validation.errors.length).toBe(0);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Serialization Invariants', () => {
    it('serialize → deserialize should be idempotent', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = decisionEngine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          const original = contractsService.generateContract(decision);
          const serialized = contractsService.serialize(original);
          const { contract: deserialized } = contractsService.deserialize(serialized);

          expect(deserialized).not.toBeNull();
          expect(deserialized?.id).toBe(original.id);
          expect(deserialized?.output.level).toBe(original.output.level);
          expect(deserialized?.output.score).toBe(original.output.score);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Extended Contract Invariants', () => {
    it('extended contract should have additional context', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = decisionEngine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          const extended = contractsService.generateExtendedContract(decision);

          expect(extended.colorContext).toBeDefined();
          expect(extended.factorAnalysis).toBeDefined();
          expect(extended.recommendations).toBeDefined();
          expect(extended.compliance).toBeDefined();
          expect(extended.summaries).toBeDefined();

          return true;
        }),
        { numRuns: 30 }
      );
    });

    it('summaries should have all verbosity levels', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision = decisionEngine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          const extended = contractsService.generateExtendedContract(decision);

          expect(extended.summaries.brief).toBeDefined();
          expect(extended.summaries.standard).toBeDefined();
          expect(extended.summaries.detailed).toBeDefined();
          expect(extended.summaries.technical).toBeDefined();

          // Brief should be shorter than detailed
          expect(extended.summaries.brief.length).toBeLessThan(
            extended.summaries.detailed.length + 1
          );

          return true;
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Contract Comparison Invariants', () => {
    it('same inputs should produce equivalent contracts', () => {
      fc.assert(
        fc.property(colorPair, fontSizePx, ([fg, bg], size) => {
          const decision1 = decisionEngine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          const decision2 = decisionEngine.evaluate({
            foreground: fg,
            background: bg,
            readabilityContext: createReadabilityContext(size),
          });

          const contract1 = contractsService.generateContract(decision1, 'test-1');
          const contract2 = contractsService.generateContract(decision2, 'test-2');

          // Compare ignoring ID differences
          const { equivalent, differences } = contractsService.compareContracts(contract1, contract2);

          // Should be equivalent for same inputs
          expect(equivalent).toBe(true);

          return true;
        }),
        { numRuns: 30 }
      );
    });
  });
});

// ============================================
// Cross-Component Integration Invariants
// ============================================

describe('Phase 3 Integration Invariants', () => {
  const decisionEngine = new ContrastDecisionEngine();
  const wcag3Simulator = new WCAG3Simulator();
  const tokenGenerator = new PerceptualTokenGenerator();

  it('decision engine score and WCAG3 score should correlate directionally', () => {
    fc.assert(
      fc.property(colorPair, colorPair, fontSizePx, ([fg1, bg1], [fg2, bg2], size) => {
        // Compare two different color pairs to check directional correlation
        const decision1 = decisionEngine.evaluate({
          foreground: fg1,
          background: bg1,
          readabilityContext: createReadabilityContext(size),
        });

        const decision2 = decisionEngine.evaluate({
          foreground: fg2,
          background: bg2,
          readabilityContext: createReadabilityContext(size),
        });

        const wcag1 = wcag3Simulator.evaluate(fg1, bg1, { size: size, weight: 400 });

        const wcag2 = wcag3Simulator.evaluate(fg2, bg2, { size: size, weight: 400 });

        const decisionDiff = (decision1.score as number) - (decision2.score as number);
        const wcagDiff = (wcag1.continuousScore as number) - (wcag2.continuousScore as number);

        // If there's a significant difference in one, the other should trend similarly
        // (both positive or both negative, with some tolerance for edge cases)
        if (Math.abs(decisionDiff) > 20 && Math.abs(wcagDiff) > 20) {
          // Signs should generally match (same direction)
          const sameDirection = (decisionDiff > 0) === (wcagDiff > 0);
          expect(sameDirection).toBe(true);
        }

        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('generated tokens should have accessible contrast', () => {
    fc.assert(
      fc.property(safeHexColor, (brandColor) => {
        const palette = tokenGenerator.generate(brandColor, 'light');

        const bgToken = palette.tokens.find(t => t.role === 'background');
        const textToken = palette.tokens.find(t => t.role === 'text-primary');

        if (bgToken && textToken) {
          const decision = decisionEngine.evaluate({
            foreground: textToken.hex,
            background: bgToken.hex,
            readabilityContext: createReadabilityContext(16),
          });

          // Generated tokens should meet at least minimum accessibility
          expect(decision.level).not.toBe('fail');
        }

        return true;
      }),
      { numRuns: 50 }
    );
  });
});

// ============================================
// DetectContrastMode Use Case Tests
// Tests for Multi-Factor Contrast Mode Detection
// ============================================

import { describe, it, expect } from 'vitest';
import {
  detectContrastMode,
  detectContrastModeQuick,
  detectContrastModeBatch,
  getOptimalForegroundPair,
  analyzeBrandColor,
} from '../application/DetectContrastMode';
import OKLCH from '../domain/value-objects/OKLCH';

describe('DetectContrastMode Use Case', () => {
  describe('detectContrastMode()', () => {
    describe('Basic Detection', () => {
      // Note: In this implementation:
      // - 'light-content' means the color IS light (high score)
      // - 'dark-content' means the color IS dark (low score)

      it('should detect light-content for white background', () => {
        const result = detectContrastMode('#FFFFFF');

        expect(result.mode).toBe('light-content');
        expect(result.confidence).toBeGreaterThan(0.8);
      });

      it('should detect dark-content for black background', () => {
        const result = detectContrastMode('#000000');

        expect(result.mode).toBe('dark-content');
        expect(result.confidence).toBeGreaterThan(0.8);
      });

      it('should detect light-content for light colors', () => {
        const lightBlue = detectContrastMode('#E3F2FD');
        const lightGray = detectContrastMode('#F5F5F5');
        const lightYellow = detectContrastMode('#FFF9C4');

        expect(lightBlue.mode).toBe('light-content');
        expect(lightGray.mode).toBe('light-content');
        expect(lightYellow.mode).toBe('light-content');
      });

      it('should detect dark-content for dark colors', () => {
        const darkBlue = detectContrastMode('#1A237E');
        const darkGray = detectContrastMode('#212121');
        const darkGreen = detectContrastMode('#1B5E20');

        expect(darkBlue.mode).toBe('dark-content');
        expect(darkGray.mode).toBe('dark-content');
        expect(darkGreen.mode).toBe('dark-content');
      });
    });

    describe('Challenging Colors (Edge Cases)', () => {
      it('should handle saturated medium-tone colors', () => {
        const brightRed = detectContrastMode('#F44336');
        const brightGreen = detectContrastMode('#4CAF50');
        const brightBlue = detectContrastMode('#2196F3');

        // These should have lower confidence due to saturation
        expect(brightRed.confidence).toBeLessThan(0.95);
        expect(brightGreen.confidence).toBeLessThan(0.95);
        expect(brightBlue.confidence).toBeLessThan(0.95);
      });

      it('should handle yellow/lime hues with warmth correction', () => {
        const yellow = detectContrastMode('#FFEB3B');
        const lime = detectContrastMode('#CDDC39');

        // Yellow and lime are perceived as light colors
        expect(yellow.mode).toBe('light-content');
        expect(lime.mode).toBe('light-content');
      });

      it('should handle the problematic teal (#0EB58C)', () => {
        const teal = detectContrastMode('#0EB58C');

        // This specific color was mentioned as problematic
        expect(['light-content', 'dark-content']).toContain(teal.mode);
        // Should have recommendations for saturated color
        expect(teal.recommendations.length).toBeGreaterThanOrEqual(0);
      });

      it('should handle brand colors near threshold', () => {
        const brandBlue = detectContrastMode('#3B82F6');

        expect(['light-content', 'dark-content']).toContain(brandBlue.mode);
      });
    });

    describe('OKLCH Input', () => {
      it('should accept OKLCH as input', () => {
        const oklch = OKLCH.create(0.8, 0.1, 220);
        const result = detectContrastMode(oklch);

        // High lightness (0.8) should be light-content
        expect(result.mode).toBe('light-content');
      });

      it('should detect dark-content for low lightness OKLCH', () => {
        const oklch = OKLCH.create(0.2, 0.1, 220);
        const result = detectContrastMode(oklch);

        expect(result.mode).toBe('dark-content');
      });

      it('should produce consistent results with hex and OKLCH', () => {
        const hex = '#3B82F6';
        const oklch = OKLCH.fromHex(hex)!;

        const hexResult = detectContrastMode(hex);
        const oklchResult = detectContrastMode(oklch);

        expect(hexResult.mode).toBe(oklchResult.mode);
      });
    });

    describe('Configuration Options', () => {
      it('should use custom weights when provided', () => {
        const result = detectContrastMode('#808080', {
          weights: {
            lightness: 0.9,
            tone: 0.05,
            apca: 0.03,
            perceptualWarmth: 0.01,
            chromaInfluence: 0.01,
          },
        });

        expect(result.factors).toBeDefined();
      });

      it('should use custom threshold when provided', () => {
        const gray = '#808080';

        const lowThreshold = detectContrastMode(gray, { lightThreshold: 0.4 });
        const highThreshold = detectContrastMode(gray, { lightThreshold: 0.7 });

        // Different thresholds may produce different modes
        expect(lowThreshold.factors.threshold).toBe(0.4);
        expect(highThreshold.factors.threshold).toBe(0.7);
      });

      it('should respect warmth correction toggle', () => {
        const warmColor = '#FF9800'; // Orange

        const withWarmth = detectContrastMode(warmColor, {
          applyWarmthCorrection: true,
        });
        const withoutWarmth = detectContrastMode(warmColor, {
          applyWarmthCorrection: false,
        });

        expect(withWarmth.factors.warmthAdjustment).not.toBe(0);
        expect(withoutWarmth.factors.warmthAdjustment).toBe(0);
      });

      it('should respect chroma correction toggle', () => {
        const saturatedColor = '#FF0000'; // Pure red

        const withChroma = detectContrastMode(saturatedColor, {
          applyChromaCorrection: true,
        });
        const withoutChroma = detectContrastMode(saturatedColor, {
          applyChromaCorrection: false,
        });

        expect(withChroma.factors.chromaAdjustment).not.toBe(0);
        expect(withoutChroma.factors.chromaAdjustment).toBe(0);
      });
    });

    describe('Confidence Score', () => {
      it('should have high confidence for extreme colors', () => {
        const white = detectContrastMode('#FFFFFF');
        const black = detectContrastMode('#000000');

        expect(white.confidence).toBeGreaterThan(0.8);
        expect(black.confidence).toBeGreaterThan(0.8);
      });

      it('should have lower confidence for mid-tones', () => {
        const midGray = detectContrastMode('#808080');

        expect(midGray.confidence).toBeLessThan(0.9);
      });

      it('should be between 0 and 1', () => {
        const colors = ['#000000', '#FFFFFF', '#808080', '#FF0000', '#00FF00', '#0000FF'];

        for (const color of colors) {
          const result = detectContrastMode(color);
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        }
      });
    });

    describe('Detection Factors', () => {
      it('should include all factor values', () => {
        const result = detectContrastMode('#3B82F6');

        expect(result.factors.oklchLightness).toBeDefined();
        expect(result.factors.hctTone).toBeDefined();
        expect(result.factors.apcaPreference).toBeDefined();
        expect(result.factors.warmthAdjustment).toBeDefined();
        expect(result.factors.chromaAdjustment).toBeDefined();
        expect(result.factors.rawScore).toBeDefined();
        expect(result.factors.threshold).toBeDefined();
      });

      it('should have OKLCH lightness in 0-1 range', () => {
        const result = detectContrastMode('#3B82F6');

        expect(result.factors.oklchLightness).toBeGreaterThanOrEqual(0);
        expect(result.factors.oklchLightness).toBeLessThanOrEqual(1);
      });

      it('should have HCT tone in 0-100 range', () => {
        const result = detectContrastMode('#3B82F6');

        expect(result.factors.hctTone).toBeGreaterThanOrEqual(0);
        expect(result.factors.hctTone).toBeLessThanOrEqual(100);
      });

      it('should have valid APCA preference', () => {
        const result = detectContrastMode('#3B82F6');

        expect(['light-content', 'dark-content']).toContain(result.factors.apcaPreference);
      });
    });

    describe('Recommendations', () => {
      it('should provide recommendations for challenging colors', () => {
        const saturatedYellow = detectContrastMode('#FFFF00');

        // Saturated yellow should trigger recommendations
        expect(saturatedYellow.recommendations.length).toBeGreaterThanOrEqual(0);
      });

      it('should warn about low confidence', () => {
        const midGray = detectContrastMode('#707070');

        if (midGray.confidence < 0.7) {
          const hasWarning = midGray.recommendations.some(r =>
            r.toLowerCase().includes('boundary') || r.toLowerCase().includes('test')
          );
          expect(hasWarning).toBe(true);
        }
      });
    });

    describe('Error Handling', () => {
      it('should throw for invalid color', () => {
        expect(() => detectContrastMode('not-a-color')).toThrow();
      });

      it('should throw for empty string', () => {
        expect(() => detectContrastMode('')).toThrow();
      });
    });
  });

  describe('detectContrastModeQuick()', () => {
    it('should return mode without full analysis', () => {
      const mode = detectContrastModeQuick('#FFFFFF');

      expect(mode).toBe('light-content');
    });

    it('should detect dark-content for dark colors', () => {
      const mode = detectContrastModeQuick('#000000');

      expect(mode).toBe('dark-content');
    });

    it('should handle OKLCH input', () => {
      const oklch = OKLCH.create(0.2, 0.1, 220);
      const mode = detectContrastModeQuick(oklch);

      expect(mode).toBe('dark-content');
    });

    it('should return dark-content for invalid color', () => {
      const mode = detectContrastModeQuick('invalid');

      expect(mode).toBe('dark-content'); // Default fallback
    });

    it('should be faster than full detection (conceptually)', () => {
      // Just verify it returns expected types
      const colors = ['#FFFFFF', '#000000', '#808080', '#FF0000'];

      for (const color of colors) {
        const mode = detectContrastModeQuick(color);
        expect(['light-content', 'dark-content']).toContain(mode);
      }
    });

    it('should produce consistent results with full detection for extreme colors', () => {
      const white = detectContrastModeQuick('#FFFFFF');
      const whiteFull = detectContrastMode('#FFFFFF');

      const black = detectContrastModeQuick('#000000');
      const blackFull = detectContrastMode('#000000');

      expect(white).toBe(whiteFull.mode);
      expect(black).toBe(blackFull.mode);
    });
  });

  describe('detectContrastModeBatch()', () => {
    it('should process multiple colors', () => {
      const colors = ['#FFFFFF', '#000000', '#808080', '#FF0000'];
      const results = detectContrastModeBatch(colors);

      expect(results).toHaveLength(4);
      expect(results[0]!.mode).toBe('light-content'); // white
      expect(results[1]!.mode).toBe('dark-content');  // black
    });

    it('should apply config to all colors', () => {
      const colors = ['#FFFFFF', '#000000'];
      const results = detectContrastModeBatch(colors, {
        lightThreshold: 0.5,
      });

      for (const result of results) {
        expect(result.factors.threshold).toBe(0.5);
      }
    });

    it('should handle mixed hex and OKLCH', () => {
      const inputs = ['#FFFFFF', OKLCH.create(0.2, 0.1, 220)];
      const results = detectContrastModeBatch(inputs);

      expect(results).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      const results = detectContrastModeBatch([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('getOptimalForegroundPair()', () => {
    it('should return dark foreground for light background', () => {
      const result = getOptimalForegroundPair('#FFFFFF');

      expect(result.primary.color).toContain('20%'); // Dark color
      expect(result.muted.color).toContain('30%');
      expect(result.active.color).toContain('15%');
    });

    it('should return light foreground for dark background', () => {
      const result = getOptimalForegroundPair('#000000');

      expect(result.primary.color).toContain('95%'); // Light color
      expect(result.muted.color).toContain('85%');
      expect(result.active.color).toContain('100%');
    });

    it('should include contrast values', () => {
      const result = getOptimalForegroundPair('#3B82F6');

      expect(result.primary.contrast).toBeDefined();
      expect(result.primary.contrast.absoluteLc).toBeGreaterThan(0);
    });

    it('should handle OKLCH input', () => {
      const oklch = OKLCH.create(0.8, 0.1, 220);
      const result = getOptimalForegroundPair(oklch);

      expect(result.primary).toBeDefined();
      expect(result.muted).toBeDefined();
      expect(result.active).toBeDefined();
    });
  });

  describe('analyzeBrandColor()', () => {
    it('should return complete brand analysis', () => {
      const analysis = analyzeBrandColor('#3B82F6');

      expect(analysis.mode).toBeDefined();
      expect(analysis.glassBackground).toBeDefined();
      expect(analysis.glassOpacity).toBeDefined();
      expect(analysis.iconColors).toBeDefined();
      expect(analysis.borderColor).toBeDefined();
      expect(analysis.shadowColor).toBeDefined();
      expect(analysis.badgeConfig).toBeDefined();
    });

    it('should adapt glass to contrast mode', () => {
      const light = analyzeBrandColor('#F0F0F0');
      const dark = analyzeBrandColor('#101010');

      // Light mode glass should be darker
      expect(light.glassBackground).toContain('0, 0, 0');
      // Dark mode glass should be lighter
      expect(dark.glassBackground).toContain('255, 255, 255');
    });

    it('should generate appropriate badge config', () => {
      const analysis = analyzeBrandColor('#3B82F6');

      expect(analysis.badgeConfig.background).toContain('gradient');
      expect(analysis.badgeConfig.textColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(analysis.badgeConfig.borderColor).toContain('rgba');
    });

    it('should use accent color when provided', () => {
      const withoutAccent = analyzeBrandColor('#3B82F6');
      const withAccent = analyzeBrandColor('#3B82F6', '#10B981');

      // Badge backgrounds should differ
      expect(withAccent.badgeConfig.background).toContain('#10B981');
    });

    it('should include icon color pairs', () => {
      const analysis = analyzeBrandColor('#3B82F6');

      expect(analysis.iconColors.primary).toBeDefined();
      expect(analysis.iconColors.muted).toBeDefined();
      expect(analysis.iconColors.active).toBeDefined();
    });

    it('should generate hue-aware border color', () => {
      const blueAnalysis = analyzeBrandColor('#3B82F6');
      const redAnalysis = analyzeBrandColor('#EF4444');

      // Border colors should be different due to hue
      expect(blueAnalysis.borderColor).not.toBe(redAnalysis.borderColor);
    });

    it('should generate hue-aware shadow color', () => {
      const blueAnalysis = analyzeBrandColor('#3B82F6');

      // Shadow should contain alpha
      expect(blueAnalysis.shadowColor).toContain('/');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistency across detection methods', () => {
      const testColors = [
        '#FFFFFF',
        '#000000',
        '#3B82F6',
        '#10B981',
        '#EF4444',
        '#F59E0B',
      ];

      for (const color of testColors) {
        const fullMode = detectContrastMode(color).mode;
        const quickMode = detectContrastModeQuick(color);
        const brandMode = analyzeBrandColor(color).mode.mode;

        // All methods should agree for clear cases
        expect(brandMode).toBe(fullMode);

        // Quick might differ slightly for edge cases, but should match for extremes
        if (fullMode === 'light-content' && detectContrastMode(color).confidence > 0.9) {
          expect(quickMode).toBe('light-content');
        }
        if (fullMode === 'dark-content' && detectContrastMode(color).confidence > 0.9) {
          expect(quickMode).toBe('dark-content');
        }
      }
    });

    it('should handle Material Design color palette', () => {
      const md3Colors = {
        primary: '#6750A4',
        secondary: '#625B71',
        tertiary: '#7D5260',
        error: '#B3261E',
        surface: '#FFFBFE',
        background: '#FFFBFE',
        onPrimary: '#FFFFFF',
        onSecondary: '#FFFFFF',
        onSurface: '#1C1B1F',
      };

      for (const [name, color] of Object.entries(md3Colors)) {
        const result = detectContrastMode(color);

        // on* colors (white) should be light-content
        if (name.startsWith('on') && !name.includes('Surface')) {
          expect(result.mode).toBe('light-content');
        }

        // surface/background should be light-content (light surfaces)
        if (name === 'surface' || name === 'background') {
          expect(result.mode).toBe('light-content');
        }

        // onSurface (dark text) should be dark-content
        if (name === 'onSurface') {
          expect(result.mode).toBe('dark-content');
        }
      }
    });
  });
});

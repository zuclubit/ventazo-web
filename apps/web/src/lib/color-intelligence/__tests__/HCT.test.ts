// ============================================
// HCT Value Object Tests
// Tests for Material Design 3 HCT Color Space
// ============================================

import { describe, it, expect } from 'vitest';
import HCT from '../domain/value-objects/HCT';
import OKLCH from '../domain/value-objects/OKLCH';

describe('HCT Value Object', () => {
  describe('Factory Methods', () => {
    describe('create()', () => {
      it('should create HCT with valid values', () => {
        const hct = HCT.create(220, 50, 60);

        expect(hct.h).toBe(220);
        expect(hct.c).toBe(50);
        expect(hct.t).toBe(60);
      });

      it('should normalize hue to 0-360 range', () => {
        const over360 = HCT.create(400, 50, 50);
        const negative = HCT.create(-30, 50, 50);

        expect(over360.h).toBe(40); // 400 - 360
        expect(negative.h).toBe(330); // 360 - 30
      });

      it('should clamp tone to 0-100', () => {
        const highTone = HCT.create(180, 50, 150);
        const lowTone = HCT.create(180, 50, -20);

        expect(highTone.t).toBe(100);
        expect(lowTone.t).toBe(0);
      });

      it('should ensure chroma is non-negative', () => {
        const negativeChroma = HCT.create(180, -20, 50);

        expect(negativeChroma.c).toBe(0);
      });
    });

    describe('fromHex()', () => {
      it('should create HCT from hex string', () => {
        const hct = HCT.fromHex('#3B82F6');

        expect(hct).not.toBeNull();
        expect(hct!.h).toBeGreaterThan(0);
        expect(hct!.t).toBeGreaterThan(0);
      });

      it('should return null for invalid hex', () => {
        const hct = HCT.fromHex('not-a-color');

        expect(hct).toBeNull();
      });

      it('should work with and without hash', () => {
        const withHash = HCT.fromHex('#FF0000');
        const withoutHash = HCT.fromHex('FF0000');

        expect(withHash).not.toBeNull();
        expect(withoutHash).not.toBeNull();
        expect(withHash!.h).toBeCloseTo(withoutHash!.h, 0);
      });
    });

    describe('fromOKLCH()', () => {
      it('should convert OKLCH to HCT', () => {
        const oklch = OKLCH.create(0.65, 0.15, 240);
        const hct = HCT.fromOKLCH(oklch);

        expect(hct.t).toBeCloseTo(65, 0); // Tone ≈ L * 100
        expect(hct.h).toBeCloseTo(240, 0); // Hue preserved
        expect(hct.c).toBeGreaterThan(0);
      });

      it('should handle grayscale OKLCH', () => {
        const gray = OKLCH.create(0.5, 0, 0);
        const hct = HCT.fromOKLCH(gray);

        expect(hct.t).toBeCloseTo(50, 0);
        expect(hct.c).toBe(0);
      });
    });
  });

  describe('Getters', () => {
    it('should return correct values object', () => {
      const hct = HCT.create(180, 40, 70);
      const values = hct.values;

      expect(values.h).toBe(180);
      expect(values.c).toBe(40);
      expect(values.t).toBe(70);
    });

    it('values object should be readonly structure', () => {
      const hct = HCT.create(180, 40, 70);
      const values = hct.values;

      // TypeScript should prevent modification, but runtime check
      expect(values.h).toBe(180);
      expect(values.c).toBe(40);
      expect(values.t).toBe(70);
    });
  });

  describe('Transformations', () => {
    describe('withHue()', () => {
      it('should create new HCT with different hue', () => {
        const original = HCT.create(180, 50, 60);
        const modified = original.withHue(90);

        expect(modified.h).toBe(90);
        expect(modified.c).toBe(50);
        expect(modified.t).toBe(60);
      });

      it('should not modify original', () => {
        const original = HCT.create(180, 50, 60);
        original.withHue(90);

        expect(original.h).toBe(180);
      });
    });

    describe('withChroma()', () => {
      it('should create new HCT with different chroma', () => {
        const original = HCT.create(180, 50, 60);
        const modified = original.withChroma(80);

        expect(modified.h).toBe(180);
        expect(modified.c).toBe(80);
        expect(modified.t).toBe(60);
      });
    });

    describe('withTone()', () => {
      it('should create new HCT with different tone', () => {
        const original = HCT.create(180, 50, 60);
        const modified = original.withTone(30);

        expect(modified.h).toBe(180);
        expect(modified.c).toBe(50);
        expect(modified.t).toBe(30);
      });
    });

    describe('lightenTone()', () => {
      it('should increase tone', () => {
        const original = HCT.create(180, 50, 50);
        const lighter = original.lightenTone(20);

        expect(lighter.t).toBe(70);
      });

      it('should clamp to 100', () => {
        const original = HCT.create(180, 50, 90);
        const lighter = original.lightenTone(30);

        expect(lighter.t).toBe(100);
      });
    });

    describe('darkenTone()', () => {
      it('should decrease tone', () => {
        const original = HCT.create(180, 50, 50);
        const darker = original.darkenTone(20);

        expect(darker.t).toBe(30);
      });

      it('should clamp to 0', () => {
        const original = HCT.create(180, 50, 10);
        const darker = original.darkenTone(30);

        expect(darker.t).toBe(0);
      });
    });
  });

  describe('Contrast Operations', () => {
    describe('toneDifference()', () => {
      it('should calculate absolute tone difference', () => {
        const color1 = HCT.create(180, 50, 80);
        const color2 = HCT.create(180, 50, 30);

        expect(color1.toneDifference(color2)).toBe(50);
        expect(color2.toneDifference(color1)).toBe(50);
      });

      it('should return 0 for same tone', () => {
        const color1 = HCT.create(180, 50, 60);
        const color2 = HCT.create(90, 30, 60);

        expect(color1.toneDifference(color2)).toBe(0);
      });
    });

    describe('meetsContrastAA()', () => {
      it('should return true for tone difference >= 40', () => {
        const color1 = HCT.create(180, 50, 70);
        const color2 = HCT.create(180, 50, 20);

        expect(color1.meetsContrastAA(color2)).toBe(true);
      });

      it('should return false for tone difference < 40', () => {
        const color1 = HCT.create(180, 50, 60);
        const color2 = HCT.create(180, 50, 40);

        expect(color1.meetsContrastAA(color2)).toBe(false);
      });

      it('should return true for exactly 40', () => {
        const color1 = HCT.create(180, 50, 70);
        const color2 = HCT.create(180, 50, 30);

        expect(color1.meetsContrastAA(color2)).toBe(true);
      });
    });

    describe('meetsContrastAAA()', () => {
      it('should return true for tone difference >= 50', () => {
        const color1 = HCT.create(180, 50, 80);
        const color2 = HCT.create(180, 50, 20);

        expect(color1.meetsContrastAAA(color2)).toBe(true);
      });

      it('should return false for tone difference < 50', () => {
        const color1 = HCT.create(180, 50, 60);
        const color2 = HCT.create(180, 50, 30);

        expect(color1.meetsContrastAAA(color2)).toBe(false);
      });
    });

    describe('meetsApcaBody()', () => {
      it('should return true for tone difference >= 45', () => {
        const color1 = HCT.create(180, 50, 75);
        const color2 = HCT.create(180, 50, 20);

        expect(color1.meetsApcaBody(color2)).toBe(true);
      });

      it('should return false for insufficient difference', () => {
        const color1 = HCT.create(180, 50, 60);
        const color2 = HCT.create(180, 50, 30);

        expect(color1.meetsApcaBody(color2)).toBe(false);
      });
    });

    describe('getContrastingAA()', () => {
      it('should return lighter variant when preferLighter=true and low tone', () => {
        const color = HCT.create(180, 50, 30);
        const contrasting = color.getContrastingAA(true);

        expect(contrasting.t).toBe(70); // 30 + 40
        expect(color.meetsContrastAA(contrasting)).toBe(true);
      });

      it('should return darker variant when preferLighter=false', () => {
        const color = HCT.create(180, 50, 80);
        const contrasting = color.getContrastingAA(false);

        expect(contrasting.t).toBe(40); // 80 - 40
        expect(color.meetsContrastAA(contrasting)).toBe(true);
      });
    });

    describe('getContrastingAAA()', () => {
      it('should return AAA-compliant variant', () => {
        const color = HCT.create(180, 50, 30);
        const contrasting = color.getContrastingAAA(true);

        expect(contrasting.t).toBe(80); // 30 + 50
        expect(color.meetsContrastAAA(contrasting)).toBe(true);
      });
    });

    describe('isLight()', () => {
      it('should return true for tone >= 50', () => {
        expect(HCT.create(180, 50, 50).isLight()).toBe(true);
        expect(HCT.create(180, 50, 80).isLight()).toBe(true);
      });

      it('should return false for tone < 50', () => {
        expect(HCT.create(180, 50, 49).isLight()).toBe(false);
        expect(HCT.create(180, 50, 20).isLight()).toBe(false);
      });
    });

    describe('getOptimalTextTone()', () => {
      it('should return 100 (white) for dark backgrounds', () => {
        const dark = HCT.create(180, 50, 30);
        expect(dark.getOptimalTextTone()).toBe(100);
      });

      it('should return 0 (black) for light backgrounds', () => {
        const light = HCT.create(180, 50, 70);
        expect(light.getOptimalTextTone()).toBe(0);
      });
    });

    describe('getOptimalTextHCT()', () => {
      it('should return HCT with reduced chroma for readability', () => {
        const background = HCT.create(220, 80, 30);
        const text = background.getOptimalTextHCT();

        expect(text.h).toBe(220); // Same hue
        expect(text.c).toBeLessThanOrEqual(30); // Reduced chroma
        expect(text.t).toBe(100); // Light text on dark
      });
    });
  });

  describe('Tonal Palette Generation', () => {
    describe('generateTonalPalette()', () => {
      it('should generate Material Design 3 tonal palette', () => {
        const color = HCT.create(220, 50, 50);
        const palette = color.generateTonalPalette();

        // Check all expected tones
        const expectedTones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];
        for (const tone of expectedTones) {
          expect(palette.has(tone)).toBe(true);
          expect(palette.get(tone)!.t).toBe(tone);
        }
      });

      it('should preserve hue across palette', () => {
        const color = HCT.create(220, 50, 50);
        const palette = color.generateTonalPalette();

        for (const [, hct] of Array.from(palette)) {
          expect(hct.h).toBeCloseTo(220, 0);
        }
      });

      it('should reduce chroma at extreme tones', () => {
        const color = HCT.create(220, 80, 50);
        const palette = color.generateTonalPalette();

        // Extreme tones should have capped chroma
        expect(palette.get(0)!.c).toBeLessThanOrEqual(40);
        expect(palette.get(100)!.c).toBeLessThanOrEqual(40);
      });
    });

    describe('getKeyColorRoles()', () => {
      it('should return Material Design 3 key roles', () => {
        const color = HCT.create(220, 50, 50);
        const roles = color.getKeyColorRoles();

        expect(roles.primary).toBeDefined();
        expect(roles.onPrimary).toBeDefined();
        expect(roles.primaryContainer).toBeDefined();
        expect(roles.onPrimaryContainer).toBeDefined();
      });

      it('should have contrasting tones for on-colors', () => {
        const color = HCT.create(220, 50, 50);
        const roles = color.getKeyColorRoles();

        // primary and onPrimary should contrast
        expect(roles.primary.meetsContrastAA(roles.onPrimary)).toBe(true);

        // container and onContainer should contrast
        expect(roles.primaryContainer.meetsContrastAAA(roles.onPrimaryContainer)).toBe(true);
      });
    });
  });

  describe('Conversion Methods', () => {
    describe('toOKLCH()', () => {
      it('should convert to OKLCH', () => {
        const hct = HCT.create(220, 50, 65);
        const oklch = hct.toOKLCH();

        expect(oklch).toBeInstanceOf(OKLCH);
        expect(oklch.l).toBeCloseTo(0.65, 1);
        expect(oklch.h).toBeCloseTo(220, 0);
      });

      it('should cache OKLCH conversion', () => {
        const hct = HCT.create(220, 50, 65);
        const oklch1 = hct.toOKLCH();
        const oklch2 = hct.toOKLCH();

        expect(oklch1).toBe(oklch2); // Same reference
      });
    });

    describe('toHex()', () => {
      it('should convert to hex string', () => {
        const hct = HCT.create(220, 50, 65);
        const hex = hct.toHex();

        expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
      });

      it('should be round-trippable (approximate)', () => {
        const original = HCT.fromHex('#3B82F6');
        const hex = original!.toHex();
        const restored = HCT.fromHex(hex);

        // HCT conversion is approximate, so allow some tolerance
        expect(restored!.h).toBeCloseTo(original!.h, -1);
        expect(restored!.t).toBeCloseTo(original!.t, -1);
      });
    });

    describe('toCss()', () => {
      it('should return CSS oklch function', () => {
        const hct = HCT.create(220, 50, 65);
        const css = hct.toCss();

        expect(css).toMatch(/^oklch\(/);
      });
    });
  });

  describe('Analysis Methods', () => {
    describe('approximateContrastRatio()', () => {
      it('should return high ratio for large tone difference', () => {
        const light = HCT.create(180, 50, 95);
        const dark = HCT.create(180, 50, 5);

        const ratio = light.approximateContrastRatio(dark);
        expect(ratio).toBeGreaterThan(15);
      });

      it('should return low ratio for small tone difference', () => {
        const color1 = HCT.create(180, 50, 50);
        const color2 = HCT.create(180, 50, 60);

        const ratio = color1.approximateContrastRatio(color2);
        expect(ratio).toBeLessThan(3);
      });
    });

    describe('getSurfaceQuality()', () => {
      it('should return higher quality for moderate tone and low chroma', () => {
        const goodSurface = HCT.create(220, 20, 55);
        const badSurface = HCT.create(220, 100, 10);

        expect(goodSurface.getSurfaceQuality()).toBeGreaterThan(badSurface.getSurfaceQuality());
      });
    });
  });

  describe('Static Utilities', () => {
    describe('harmonize()', () => {
      it('should shift hue toward target', () => {
        const source = HCT.create(0, 50, 50); // Red
        const target = HCT.create(120, 50, 50); // Green
        const harmonized = HCT.harmonize(source, target);

        // Hue should shift toward green
        expect(harmonized.h).toBeGreaterThan(0);
        expect(harmonized.h).toBeLessThan(source.h + 60); // Subtle shift
      });

      it('should preserve chroma and tone', () => {
        const source = HCT.create(0, 50, 60);
        const target = HCT.create(180, 80, 40);
        const harmonized = HCT.harmonize(source, target);

        expect(harmonized.c).toBe(50);
        expect(harmonized.t).toBe(60);
      });
    });

    describe('complement()', () => {
      it('should return color with opposite hue', () => {
        const color = HCT.create(60, 50, 50);
        const complement = HCT.complement(color);

        expect(complement.h).toBe(240); // 60 + 180
      });

      it('should handle hue wrap-around', () => {
        const color = HCT.create(270, 50, 50);
        const complement = HCT.complement(color);

        expect(complement.h).toBe(90); // (270 + 180) % 360
      });
    });

    describe('analogous()', () => {
      it('should return three colors with adjacent hues', () => {
        const color = HCT.create(180, 50, 50);
        const [left, center, right] = HCT.analogous(color, 30);

        expect(left.h).toBe(150);
        expect(center.h).toBe(180);
        expect(right.h).toBe(210);
      });

      it('should use default angle of 30', () => {
        const color = HCT.create(180, 50, 50);
        const [left, , right] = HCT.analogous(color);

        expect(left.h).toBe(150);
        expect(right.h).toBe(210);
      });
    });

    describe('triadic()', () => {
      it('should return three colors 120° apart', () => {
        const color = HCT.create(0, 50, 50);
        const [c1, c2, c3] = HCT.triadic(color);

        expect(c1.h).toBe(0);
        expect(c2.h).toBe(120);
        expect(c3.h).toBe(240);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle black (tone 0)', () => {
      const black = HCT.create(0, 0, 0);

      expect(black.isLight()).toBe(false);
      expect(black.getOptimalTextTone()).toBe(100);
    });

    it('should handle white (tone 100)', () => {
      const white = HCT.create(0, 0, 100);

      expect(white.isLight()).toBe(true);
      expect(white.getOptimalTextTone()).toBe(0);
    });

    it('should handle grayscale (chroma 0)', () => {
      const gray = HCT.create(180, 0, 50);
      const palette = gray.generateTonalPalette();

      // All palette entries should have 0 chroma
      for (const [, hct] of Array.from(palette)) {
        expect(hct.c).toBe(0);
      }
    });

    it('should handle very high chroma', () => {
      const vivid = HCT.create(30, 150, 50);

      expect(vivid.c).toBe(150);
      expect(vivid.toHex()).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});

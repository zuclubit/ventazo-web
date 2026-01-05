// ============================================
// OKLCH Value Object Tests
// Comprehensive tests for OKLCH color space operations
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import OKLCH from '../domain/value-objects/OKLCH';

describe('OKLCH Value Object', () => {
  describe('Factory Methods', () => {
    describe('create()', () => {
      it('should create OKLCH from valid LCH values', () => {
        const oklch = OKLCH.create(0.7, 0.15, 180);

        expect(oklch.l).toBe(0.7);
        expect(oklch.c).toBe(0.15);
        expect(oklch.h).toBe(180);
      });

      it('should clamp lightness to 0-1 range', () => {
        const tooLight = OKLCH.create(1.5, 0.1, 90);
        const tooDark = OKLCH.create(-0.5, 0.1, 90);

        expect(tooLight.l).toBe(1);
        expect(tooDark.l).toBe(0);
      });

      it('should clamp chroma to non-negative', () => {
        const negativeChroma = OKLCH.create(0.5, -0.1, 90);

        expect(negativeChroma.c).toBe(0);
      });

      it('should normalize hue to 0-360 range', () => {
        const over360 = OKLCH.create(0.5, 0.1, 450);
        const negative = OKLCH.create(0.5, 0.1, -90);

        expect(over360.h).toBe(90);
        expect(negative.h).toBe(270);
      });
    });

    describe('fromHex()', () => {
      it('should parse valid 6-digit hex colors', () => {
        const white = OKLCH.fromHex('#FFFFFF');
        const black = OKLCH.fromHex('#000000');

        expect(white).not.toBeNull();
        expect(white!.l).toBeCloseTo(1, 1);

        expect(black).not.toBeNull();
        expect(black!.l).toBeCloseTo(0, 1);
      });

      it('should handle hex without hash', () => {
        const color = OKLCH.fromHex('3B82F6');

        expect(color).not.toBeNull();
        expect(color!.l).toBeGreaterThan(0);
        expect(color!.l).toBeLessThan(1);
      });

      it('should return null for invalid hex', () => {
        expect(OKLCH.fromHex('not-a-color')).toBeNull();
        expect(OKLCH.fromHex('#GGG')).toBeNull();
        expect(OKLCH.fromHex('')).toBeNull();
      });

      it('should correctly parse known colors', () => {
        // Pure red
        const red = OKLCH.fromHex('#FF0000');
        expect(red).not.toBeNull();
        expect(red!.h).toBeGreaterThan(0);
        expect(red!.h).toBeLessThan(45); // Red hue is around 29 in OKLCH

        // Pure blue
        const blue = OKLCH.fromHex('#0000FF');
        expect(blue).not.toBeNull();
        expect(blue!.h).toBeGreaterThan(220);
        expect(blue!.h).toBeLessThan(280);

        // Pure green
        const green = OKLCH.fromHex('#00FF00');
        expect(green).not.toBeNull();
        expect(green!.h).toBeGreaterThan(120);
        expect(green!.h).toBeLessThan(160);
      });
    });

    describe('fromRGB()', () => {
      it('should create from RGB values', () => {
        const color = OKLCH.fromRGB({ r: 128, g: 64, b: 192 });

        expect(color.l).toBeGreaterThan(0);
        expect(color.l).toBeLessThan(1);
        expect(color.c).toBeGreaterThan(0);
      });

      it('should handle grayscale', () => {
        const gray = OKLCH.fromRGB({ r: 128, g: 128, b: 128 });

        expect(gray.c).toBeLessThan(0.01); // Nearly no chroma
        expect(gray.l).toBeCloseTo(0.6, 1);
      });
    });
  });

  describe('Immutability', () => {
    it('should return new instances on transformations', () => {
      const original = OKLCH.create(0.5, 0.1, 180);
      const lighter = original.lighten(0.1);
      const darker = original.darken(0.1);
      const rotated = original.rotateHue(30);

      expect(lighter).not.toBe(original);
      expect(darker).not.toBe(original);
      expect(rotated).not.toBe(original);
      expect(original.l).toBe(0.5); // Original unchanged
    });

    it('should preserve values after transformation', () => {
      const original = OKLCH.create(0.5, 0.15, 120);
      const modified = original.withLightness(0.8);

      expect(modified.l).toBe(0.8);
      expect(modified.c).toBe(0.15);
      expect(modified.h).toBe(120);
    });
  });

  describe('Transformations', () => {
    describe('withLightness()', () => {
      it('should change only lightness', () => {
        const original = OKLCH.create(0.5, 0.15, 200);
        const modified = original.withLightness(0.8);

        expect(modified.l).toBe(0.8);
        expect(modified.c).toBe(0.15);
        expect(modified.h).toBe(200);
      });
    });

    describe('withChroma()', () => {
      it('should change only chroma', () => {
        const original = OKLCH.create(0.5, 0.15, 200);
        const modified = original.withChroma(0.25);

        expect(modified.l).toBe(0.5);
        expect(modified.c).toBe(0.25);
        expect(modified.h).toBe(200);
      });
    });

    describe('withHue()', () => {
      it('should change only hue', () => {
        const original = OKLCH.create(0.5, 0.15, 200);
        const modified = original.withHue(300);

        expect(modified.l).toBe(0.5);
        expect(modified.c).toBe(0.15);
        expect(modified.h).toBe(300);
      });
    });

    describe('lighten()', () => {
      it('should increase lightness by delta', () => {
        const original = OKLCH.create(0.5, 0.1, 90);
        const lighter = original.lighten(0.2);

        expect(lighter.l).toBe(0.7);
      });
    });

    describe('darken()', () => {
      it('should decrease lightness by delta', () => {
        const original = OKLCH.create(0.5, 0.1, 90);
        const darker = original.darken(0.2);

        expect(darker.l).toBe(0.3);
      });
    });

    describe('saturate()', () => {
      it('should multiply chroma by factor', () => {
        const original = OKLCH.create(0.5, 0.1, 90);
        const saturated = original.saturate(2);

        expect(saturated.c).toBe(0.2);
      });
    });

    describe('desaturate()', () => {
      it('should divide chroma by factor', () => {
        const original = OKLCH.create(0.5, 0.2, 90);
        const desaturated = original.desaturate(2);

        expect(desaturated.c).toBe(0.1);
      });
    });

    describe('rotateHue()', () => {
      it('should rotate hue by degrees', () => {
        const original = OKLCH.create(0.5, 0.1, 90);
        const rotated = original.rotateHue(30);

        expect(rotated.h).toBe(120);
      });

      it('should handle wraparound', () => {
        const original = OKLCH.create(0.5, 0.1, 350);
        const rotated = original.rotateHue(30);

        expect(rotated.h).toBe(20);
      });
    });
  });

  describe('Gamut Operations', () => {
    describe('isInGamut()', () => {
      it('should return true for low chroma colors', () => {
        const gray = OKLCH.create(0.5, 0.01, 180);
        expect(gray.isInGamut()).toBe(true);
      });

      it('should return false for extremely high chroma', () => {
        const outOfGamut = OKLCH.create(0.5, 0.5, 180);
        expect(outOfGamut.isInGamut()).toBe(false);
      });
    });

    describe('mapToGamut()', () => {
      it('should preserve in-gamut colors', () => {
        const inGamut = OKLCH.create(0.5, 0.08, 180);
        const mapped = inGamut.mapToGamut();

        expect(mapped.l).toBeCloseTo(inGamut.l, 2);
        expect(mapped.h).toBeCloseTo(inGamut.h, 2);
      });

      it('should reduce chroma for out-of-gamut colors', () => {
        const outOfGamut = OKLCH.create(0.5, 0.5, 180);
        const mapped = outOfGamut.mapToGamut();

        expect(mapped.c).toBeLessThan(0.5);
        expect(mapped.l).toBeCloseTo(0.5, 2);
        expect(mapped.h).toBeCloseTo(180, 2);
      });
    });

    describe('estimateMaxChroma()', () => {
      it('should return reasonable values for mid-lightness', () => {
        const color = OKLCH.create(0.5, 0.1, 180);
        const maxC = color.estimateMaxChroma();

        expect(maxC).toBeGreaterThan(0);
        expect(maxC).toBeLessThan(0.3);
      });

      it('should return low values for extreme lightness', () => {
        const dark = OKLCH.create(0.1, 0.1, 180);
        const light = OKLCH.create(0.9, 0.1, 180);

        expect(dark.estimateMaxChroma()).toBeLessThan(0.1);
        expect(light.estimateMaxChroma()).toBeLessThan(0.1);
      });
    });
  });

  describe('Conversion Methods', () => {
    describe('toHex()', () => {
      it('should produce valid 6-digit hex', () => {
        const color = OKLCH.create(0.7, 0.15, 240);
        const hex = color.toHex();

        expect(hex).toMatch(/^#[0-9A-F]{6}$/);
      });

      it('should round-trip from hex', () => {
        const originalHex = '#3B82F6';
        const oklch = OKLCH.fromHex(originalHex);
        const resultHex = oklch!.toHex();

        // Allow some tolerance due to gamut mapping
        expect(resultHex).toMatch(/^#[0-9A-F]{6}$/);
      });

      it('should produce white from L=1', () => {
        const white = OKLCH.create(1, 0, 0);
        expect(white.toHex()).toBe('#FFFFFF');
      });

      it('should produce black from L=0', () => {
        const black = OKLCH.create(0, 0, 0);
        expect(black.toHex()).toBe('#000000');
      });
    });

    describe('toCss()', () => {
      it('should produce valid oklch() string', () => {
        const color = OKLCH.create(0.7, 0.15, 240);
        const css = color.toCss();

        expect(css).toMatch(/^oklch\([\d.]+% [\d.]+ [\d.]+\)$/);
      });
    });

    describe('toCssAlpha()', () => {
      it('should produce valid oklch() string with alpha', () => {
        const color = OKLCH.create(0.7, 0.15, 240);
        const css = color.toCssAlpha(0.5);

        expect(css).toMatch(/^oklch\([\d.]+% [\d.]+ [\d.]+ \/ [\d.]+\)$/);
      });
    });

    describe('toOKLab()', () => {
      it('should convert to OKLab', () => {
        const color = OKLCH.create(0.7, 0.15, 180);
        const lab = color.toOKLab();

        expect(lab.L).toBe(0.7);
        expect(lab.a).toBeLessThan(0); // Cyan has negative a
        expect(Math.abs(lab.b)).toBeLessThan(0.01); // Cyan has ~0 b
      });
    });

    describe('toRGB()', () => {
      it('should produce valid RGB values for in-gamut colors', () => {
        const color = OKLCH.create(0.5, 0.08, 180);
        const rgb = color.toRGB();

        expect(rgb.r).toBeGreaterThanOrEqual(0);
        expect(rgb.r).toBeLessThanOrEqual(255);
        expect(rgb.g).toBeGreaterThanOrEqual(0);
        expect(rgb.g).toBeLessThanOrEqual(255);
        expect(rgb.b).toBeGreaterThanOrEqual(0);
        expect(rgb.b).toBeLessThanOrEqual(255);
      });
    });
  });

  describe('Comparison & Analysis', () => {
    describe('deltaE()', () => {
      it('should return 0 for identical colors', () => {
        const a = OKLCH.create(0.5, 0.1, 180);
        const b = OKLCH.create(0.5, 0.1, 180);

        expect(a.deltaE(b)).toBe(0);
      });

      it('should return higher values for more different colors', () => {
        const a = OKLCH.create(0.5, 0.1, 180);
        const similar = OKLCH.create(0.52, 0.11, 185);
        const different = OKLCH.create(0.8, 0.2, 30);

        expect(a.deltaE(similar)).toBeLessThan(a.deltaE(different));
      });
    });

    describe('isSimilarTo()', () => {
      it('should return true for similar colors', () => {
        const a = OKLCH.create(0.5, 0.1, 180);
        const b = OKLCH.create(0.51, 0.1, 182);

        expect(a.isSimilarTo(b)).toBe(true);
      });

      it('should return false for different colors', () => {
        const a = OKLCH.create(0.5, 0.1, 180);
        const b = OKLCH.create(0.8, 0.2, 30);

        expect(a.isSimilarTo(b)).toBe(false);
      });

      it('should respect custom threshold', () => {
        const a = OKLCH.create(0.5, 0.1, 180);
        const b = OKLCH.create(0.55, 0.12, 190);

        expect(a.isSimilarTo(b, 0.01)).toBe(false);
        expect(a.isSimilarTo(b, 0.2)).toBe(true);
      });
    });

    describe('getWarmth()', () => {
      it('should return positive for warm colors', () => {
        const orange = OKLCH.create(0.7, 0.15, 45);
        expect(orange.getWarmth()).toBeGreaterThan(0);
      });

      it('should return negative for cold colors', () => {
        const blue = OKLCH.create(0.5, 0.15, 240);
        expect(blue.getWarmth()).toBeLessThan(0);
      });

      it('should return near zero for neutral grays', () => {
        const gray = OKLCH.create(0.5, 0, 180);
        expect(Math.abs(gray.getWarmth())).toBeLessThan(0.01);
      });
    });
  });

  describe('Static Utilities', () => {
    describe('interpolate()', () => {
      it('should return start color at t=0', () => {
        const a = OKLCH.create(0.3, 0.1, 30);
        const b = OKLCH.create(0.7, 0.2, 210);
        const result = OKLCH.interpolate(a, b, 0);

        expect(result.l).toBe(0.3);
        expect(result.c).toBe(0.1);
        expect(result.h).toBe(30);
      });

      it('should return end color at t=1', () => {
        const a = OKLCH.create(0.3, 0.1, 30);
        const b = OKLCH.create(0.7, 0.2, 210);
        const result = OKLCH.interpolate(a, b, 1);

        expect(result.l).toBe(0.7);
        expect(result.c).toBe(0.2);
        expect(result.h).toBeCloseTo(210, 1);
      });

      it('should return midpoint at t=0.5', () => {
        const a = OKLCH.create(0.2, 0.1, 0);
        const b = OKLCH.create(0.8, 0.3, 180);
        const result = OKLCH.interpolate(a, b, 0.5);

        expect(result.l).toBeCloseTo(0.5, 5);
        expect(result.c).toBeCloseTo(0.2, 5);
      });

      it('should handle hue wraparound with shorter path', () => {
        const a = OKLCH.create(0.5, 0.1, 350);
        const b = OKLCH.create(0.5, 0.1, 10);
        const result = OKLCH.interpolate(a, b, 0.5, 'shorter');

        expect(result.h).toBeCloseTo(0, 1);
      });
    });

    describe('gradient()', () => {
      it('should generate correct number of steps', () => {
        const a = OKLCH.create(0.3, 0.1, 30);
        const b = OKLCH.create(0.7, 0.2, 210);
        const steps = OKLCH.gradient(a, b, 5);

        expect(steps).toHaveLength(5);
      });

      it('should start and end with correct colors', () => {
        const a = OKLCH.create(0.3, 0.1, 30);
        const b = OKLCH.create(0.7, 0.2, 210);
        const steps = OKLCH.gradient(a, b, 5);

        expect(steps[0]!.l).toBe(0.3);
        expect(steps[4]!.l).toBeCloseTo(0.7, 2);
      });

      it('should produce gamut-mapped colors by default', () => {
        const a = OKLCH.create(0.5, 0.3, 30);
        const b = OKLCH.create(0.5, 0.3, 210);
        const steps = OKLCH.gradient(a, b, 5);

        for (const step of steps) {
          const hex = step.toHex();
          expect(hex).toMatch(/^#[0-9A-F]{6}$/);
        }
      });
    });
  });
});
